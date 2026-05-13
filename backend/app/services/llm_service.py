import os
import json
import time
import typing
import concurrent.futures
from app.core.config import settings

# Attempt to import Groq (optional fallback)
try:
    from groq import Groq
except ImportError:
    Groq = None

# Attempt to import Gemini
try:
    import google.generativeai as genai
except ImportError:
    genai = None

_groq_client = None
_gemini_model = None
_gemini_disabled_until = 0.0 # Global circuit breaker for rate limits

def _get_groq_client() -> typing.Any:
    """Get the Groq client (singleton)."""
    global _groq_client
    if _groq_client is None:
        if Groq is None:
            return None
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return None
        _groq_client = Groq(api_key=api_key)
    return _groq_client

def _get_gemini_model() -> typing.Any:
    """Get the Gemini model (singleton)."""
    global _gemini_model
    if _gemini_model is None:
        if genai is None:
            return None
        api_key = settings.GOOGLE_API_KEY
        if not api_key:
            return None
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
    return _gemini_model

# Constants for context management
MAX_CONTEXT_CHARS = 30_000 # Gemini handles much more than Groq (up to 1M tokens), so we can be generous

def _truncate_context(chunks: list[dict]) -> str:
    """Join chunk texts into a single context string."""
    parts: list[str] = []
    total: int = 0
    for chunk in chunks:
        text: str = str(chunk.get("text", ""))
        text_len: int = len(text)
        if total + text_len + 7 > MAX_CONTEXT_CHARS:
            remaining: int = MAX_CONTEXT_CHARS - total - 7
            if remaining > 200:
                parts.append(text[:remaining])
            break
        parts.append(text)
        total += text_len + 7
    return "\n\n---\n\n".join(parts)

def _call_llm(
    system_prompt: str, 
    user_prompt: str, 
    temperature: float = 0.3,
    max_tokens: int = 1500,
    json_mode: bool = False,
    **kwargs
) -> str:
    """
    Call Gemini (primary) or Groq (fallback) with timeouts and improved reliability.
    """
    start_time = time.time()
    
    # 1. Try Gemini first (if not disabled by circuit breaker)
    global _gemini_disabled_until
    gemini = _get_gemini_model()
    
    if gemini and time.time() > _gemini_disabled_until:
        try:
            # Combine system and user prompt for Gemini
            full_prompt = f"{system_prompt}\n\nUSER REQUEST: {user_prompt}"
            
            # Disable safety filters for academic content to prevent false blocks
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
            
            # Set a 10s timeout for Gemini
            response = gemini.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    response_mime_type="application/json" if json_mode else "text/plain"
                ),
                safety_settings=safety_settings,
                request_options={"timeout": 10.0}
            )
            
            if response.candidates:
                try:
                    content = response.text or ""
                    if content.strip():
                        duration = time.time() - start_time
                        print(f"[LLM] Gemini success ({duration:.2f}s)")
                        return content
                except Exception as text_err:
                    print(f"[LLM] Gemini text access failed (likely blocked): {text_err}")
            
            print(f"[LLM] Gemini returned no valid content. Falling back to Groq.")
        except Exception as e:
            err_msg = str(e).lower()
            if "429" in err_msg or "quota" in err_msg or "limit" in err_msg:
                print(f"[LLM] Gemini Quota hit. Disabling for 60s.")
                _gemini_disabled_until = time.time() + 60.0
            print(f"[LLM] Gemini failed, trying Groq fallback: {e}")
    
    # 2. Try Groq fallback
    groq = _get_groq_client()
    if groq:
        try:
            extra_args = {}
            if json_mode:
                extra_args["response_format"] = {"type": "json_object"}
            
            # Set a 20s timeout for Groq
            response = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=20.0,
                **extra_args
            )
            content = response.choices[0].message.content or ""
            duration = time.time() - start_time
            print(f"[LLM] Groq success ({duration:.2f}s)")
            return content
        except Exception as e:
            print(f"[LLM] Groq fallback failed: {e}")

    raise Exception("Both Gemini and Groq services are unavailable or failed.")

def classify_question(query: str) -> str:
    """Classify a question into one of 5 educational categories."""
    system_prompt = (
        "You are a question classifier for English Literature. "
        "Classify the following question into exactly one category: "
        "'definition', 'conceptual', 'comparative', 'cause-effect', or 'analytical'. "
        "Respond with ONLY the category name, nothing else."
    )
    result = _call_llm(system_prompt, query, temperature=0.1, max_tokens=10).strip().lower()
    
    valid_categories = {"definition", "conceptual", "comparative", "cause-effect", "analytical"}
    # Clean up any potential markdown or extra whitespace from LLM
    result = "".join(c for c in result if c.isalnum() or c == "-")
    if result not in valid_categories:
        result = "analytical"
    return result

def generate_summary(chunks: list[dict], temperature: float = 0.0) -> str:
    """Generate a concise summary from the top retrieved chunks."""
    context = _truncate_context(chunks)

    system_prompt = (
        "You are an academic study assistant for English Literature students. "
        "Generate a clear, comprehensive summary of the provided text segments. "
        "STRICT CONSTRAINTS: "
        "1. Use ONLY information from the provided excerpts. Do not use external knowledge. "
        "2. You must provide citations for factual claims (e.g. '...as mentioned on page 4'). "
        "3. If information is incomplete or ambiguous in the context, you MUST tag the statement with [requires verification]. "
        "4. Focus on capturing themes, arguments, character insights, or conceptual explanations. "
        "5. Ensure the summary is complete and does not cut off. "
        "6. Format the summary into exactly three distinct paragraphs: "
        "   - Paragraph 1: **Document Overview** (A high-level introduction to the text). "
        "   - Paragraph 2: **Key Themes & Concepts** (An analysis of the main literary ideas). "
        "   - Paragraph 3: **Critical Insights** (Specific evidence or character/plot details). "
        "7. DO NOT use bullet points, lists, or the '*' symbol. Use full sentences and coherent paragraphs only."
    )

    user_prompt = f"Please summarize the following excerpts:\n\n{context}"

    return _call_llm(system_prompt, user_prompt, temperature=temperature, max_tokens=1024)

def generate_answer(
    query: str, chunks: list[dict], query_type: str, temperature: float = 0.0
) -> str:
    """Generate an answer grounded in the retrieved chunks."""
    context = _truncate_context(chunks)

    type_instructions = {
        "definition": "Provide a clear, precise definition with examples from the text.",
        "conceptual": "Provide a step-by-step breakdown of the concept, referencing specific evidence.",
        "comparative": "Compare and contrast the elements, drawing specific parallels and differences.",
        "cause-effect": "Provide a step-by-step breakdown identifying the catalysts (causes) and the resulting outcomes (effects).",
        "analytical": "Analyze the underlying themes or arguments step-by-step, connecting related concepts."
    }

    instruction = type_instructions.get(query_type, type_instructions["analytical"])

    system_prompt = (
        "You are an academic study assistant for English Literature students. "
        f"This is a {query_type} question. {instruction} "
        "STRICT CONSTRAINTS: "
        "1. Only use information from the provided context. Do NOT use any general knowledge or external information. "
        "2. If the question is not directly answered in the text, you MUST state: 'I'm sorry, there is no information about this in the document so I cannot help you with it.' "
        "3. If the user's query looks like a spelling error or a slight variation of something that IS in the document, you should say: 'There is no information about [user's search], but there is this [correct term] that looks similar to what you searched for. However, the exact item you searched for doesn't exist in the document.' "
        "4. SUPPORT each point with explicit text evidence from the provided excerpts. "
        "5. Be honest—never hallucinate or assume things based on similar concepts. "
        "6. Do not 'consider things' that are not explicitly stated. "
        "7. Provide your response in well-organized paragraphs. "
        "8. DO NOT use bullet points, lists, or the '*' symbol for any part of your response. "
        "9. Use bold text (e.g., **Term**) to highlight key concepts or evidence instead of listing them."
    )

    user_prompt = f"Context:\n{context}\n\nQuestion: {query}"

    return _call_llm(system_prompt, user_prompt, temperature, max_tokens=1500)

def generate_flashcards(chunks: list[dict]) -> list[dict]:
    """Generate flashcard Q&A pairs in parallel batches for maximum speed."""
    if not chunks:
        return _fallback_flashcards()

    # Optimized Batching: Use 3 parallel batches (4 chunks each if 12 samples provided)
    # This maximizes speed by reducing sequential wait time.
    n = len(chunks)
    batch_size = (n + 2) // 3
    batches = [chunks[i:i + batch_size] for i in range(0, n, batch_size)]
    
    all_flashcards = []

    def _process_batch(i, batch):
        context = _truncate_context(batch)
        system_prompt = (
            "You are an academic study assistant. "
            "Generate 5 to 7 study flashcards from the provided text segments. "
            "STRICT JSON REQUIREMENT: Respond ONLY with a valid JSON array of objects. "
            "Each object must have 'question' and 'answer' keys. "
            "Example format: [{\"question\": \"What is...\", \"answer\": \"It is...\"}]"
        )
        user_prompt = f"Text Segments:\n\n{context}"
        
        try:
            # Enable json_mode for better reliability
            response = _call_llm(system_prompt, user_prompt, temperature=0.3, max_tokens=1000, json_mode=True)
            if not response: return []

            # Clean and parse JSON
            response_str = str(response).strip()
            # If JSON mode is working, it should be a clean array, but we still handle fragments
            start = response_str.find("[")
            end = response_str.rfind("]")
            if start != -1 and end != -1:
                json_str = response_str[start:end+1]
                batch_cards = json.loads(json_str)
                if isinstance(batch_cards, list):
                    return [{"question": c["question"], "answer": c["answer"]} 
                            for c in batch_cards if isinstance(c, dict) and "question" in c and "answer" in c]
        except Exception as e:
            print(f"[LLM] Batch {i+1} error: {e}")
        return []

    # Execute in parallel with 3 workers
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(_process_batch, i, batch) for i, batch in enumerate(batches)]
        for future in concurrent.futures.as_completed(futures):
            all_flashcards.extend(future.result())

    if not all_flashcards:
        return _fallback_flashcards()
    
    return all_flashcards[:20]

def _fallback_flashcards() -> list[dict]:
    """Return a fallback message if flashcard generation fails."""
    return [
        {
            "question": "Could not generate flashcards from this content.",
            "answer": "Please try uploading a different PDF or a section with more content.",
        }
    ]

def evaluate_response(query: str, answer: str, chunks: list[dict]) -> dict:
    """Evaluate the faithfulness and relevancy of an answer using LLM-as-a-judge."""
    context = _truncate_context(chunks)
    
    system_prompt = (
        "You are an expert evaluator for a RAG system. "
        "Evaluate the following AI response based on the provided context and query. "
        "1. FAITHFULNESS: How much of the answer is supported by the context? (0.0 to 1.0) "
        "2. RELEVANCY: How well does the answer address the user query? (0.0 to 1.0) "
        "Respond ONLY with a JSON object: {\"faithfulness\": float, \"relevancy\": float}"
    )
    
    user_prompt = f"QUERY: {query}\n\nCONTEXT:\n{context}\n\nANSWER:\n{answer}"
    
    try:
        # Use a higher temperature for evaluation to allow for nuance, but keep it low for consistency
        response = _call_llm(system_prompt, user_prompt, temperature=0.1, max_tokens=100, json_mode=True)
        scores = json.loads(response)
        
        # Ensure values are within [0, 1]
        return {
            "faithfulness": max(0.0, min(1.0, float(scores.get("faithfulness", 0.0)))),
            "relevancy": max(0.0, min(1.0, float(scores.get("relevancy", 0.0))))
        }
    except Exception as e:
        print(f"[EVAL] Evaluation failed: {e}")
        return {"faithfulness": 0.0, "relevancy": 0.0}
