try:
    from groq import Groq
except ImportError:
    Groq = None
    print("[WARN] groq is not installed. LLM service will be unavailable.")

import os
import json
import time


_client = None


import typing

def _get_client() -> typing.Any:
    """Get the Groq client (singleton)."""
    global _client
    if _client is None:
        if Groq is None:
            raise ImportError("groq package is required for LLM service but is not installed.")
        _client = Groq(api_key=os.getenv("GROQ_API_KEY", "")) # type: ignore
    return _client

# Maximum characters of context to send to Groq in a single prompt.
# ~14,000 chars ≈ 3,500 tokens, safely under the free-tier TPM limit.


MODEL = "llama-3.1-8b-instant"

# Maximum characters of context to send to Groq in a single prompt.
# ~14,000 chars ≈ 3,500 tokens, safely under the free-tier TPM limit.
MAX_CONTEXT_CHARS = 14_000


def _truncate_context(chunks: list[dict]) -> str:
    """
    Join chunk texts into a single context string, capped at MAX_CONTEXT_CHARS.
    This prevents hitting Groq's tokens-per-minute rate limit on large documents.
    Chunks are already ranked by relevance (Pinecone score), so we keep the best
    ones and truncate the last chunk if needed to fit the budget.
    """
    parts: list[str] = []
    total: int = 0
    for chunk in chunks:
        text: str = str(chunk.get("text", ""))
        text_len: int = len(text)
        if total + text_len + 7 > MAX_CONTEXT_CHARS: # type: ignore
            # Add as much of this chunk as possible
            remaining: int = MAX_CONTEXT_CHARS - total - 7  # type: ignore
            if remaining > 200:
                parts.append(text[:remaining]) # type: ignore
            break
        parts.append(text)
        total += text_len + 7  # type: ignore
    return "\n\n---\n\n".join(parts)


def _call_llm(
    system_prompt: str, 
    user_prompt: str, 
    temperature: float = 0.3,
    max_tokens: int = 1500,
    top_p: float = 1.0,
    frequency_penalty: float = 0.0,
    presence_penalty: float = 0.0
) -> str:
    """
    Make a call to the Groq API with Llama-3.1-8B.
    Retries up to 3 times with exponential backoff on rate-limit (429) errors.
    """
    client = _get_client()
    last_error = None

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                frequency_penalty=frequency_penalty,
                presence_penalty=presence_penalty,
            )
            return response.choices[0].message.content or ""

        except Exception as e:
            error_str = str(e).lower()
            # Check for rate limit errors (429) — wait and retry
            if "rate_limit" in error_str or "429" in error_str or "too many" in error_str:
                wait_seconds = (2 ** attempt) * 5  # 5s, 10s, 20s
                print(f"[LLM] Groq rate limit hit (attempt {attempt + 1}/3). "
                      f"Retrying in {wait_seconds}s...")
                time.sleep(wait_seconds)
                last_error = e
            else:
                # Non-rate-limit error — raise immediately
                raise e

    # All retries exhausted
    raise Exception(
        f"Groq rate limit exceeded after 3 retries. "
        f"Try again in a minute or upload a smaller document. "
        f"Original error: {last_error}"
    )


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
    if result not in valid_categories:
        result = "analytical"  # fallback for complex unclassified questions
    return result


def generate_summary(chunks: list[dict], temperature: float = 0.3) -> str:
    """Generate a concise summary from the top retrieved chunks."""
    context = _truncate_context(chunks)

    system_prompt = (
        "You are an academic study assistant for English Literature students. "
        "Generate a clear, concise summary of the provided text segments. "
        "STRICT CONSTRAINTS: "
        "1. Use ONLY information from the provided excerpts. Do not use external knowledge. "
        "2. You must provide citations for factual claims (e.g. '...as mentioned on page 4'). "
        "3. If information is incomplete or ambiguous in the context, you MUST tag the statement with [requires verification]. "
        "4. Focus on capturing themes, arguments, character insights, or conceptual explanations. "
        "5. Keep the output very simple, brief, and easy to understand."
    )

    user_prompt = f"Please summarize the following excerpts:\n\n{context}"

    return _call_llm(
        system_prompt, 
        user_prompt, 
        temperature=temperature, 
        max_tokens=512,
        top_p=0.9,
        frequency_penalty=0.2,
        presence_penalty=0.1
    )


def generate_answer(
    query: str, chunks: list[dict], query_type: str, temperature: float = 0.4
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
        "1. Support each point with explicit text evidence from the provided excerpts. "
        "2. Reference specific page numbers for every factual claim or quote (e.g., '...as seen on page 12'). "
        "3. Only use information from the provided context — do NOT hallucinate. "
        "4. If the context doesn't contain enough information to answer fully, say so honestly. "
        "5. Keep the output very simple, brief, and easy to understand."
    )

    user_prompt = f"Context:\n{context}\n\nQuestion: {query}"

    return _call_llm(system_prompt, user_prompt, temperature, max_tokens=1500)


def generate_flashcards(chunks: list[dict]) -> list[dict]:
    """Generate flashcard Q&A pairs from text chunks."""
    context = _truncate_context(chunks)

    system_prompt = (
        "You are an academic study assistant for English Literature students. "
        "Generate 5 to 10 high-quality study flashcards from the provided text. "
        "STRICT CONSTRAINTS: "
        "1. Focus on key concepts, literary terms, themes, and important quotes. "
        "2. Maintain a consistent, University-level academic difficulty for every card. "
        "3. Only use information from the provided context — do NOT hallucinate. "
        "4. Output ONLY a valid JSON array of objects. Do NOT use markdown formatting (no ```json). "
        "   Example format: [{\"question\": \"...\", \"answer\": \"...\"}] "
        "5. Keep the questions and answers very simple, brief, and easy to understand."
    )

    user_prompt = f"Generate flashcards from this text:\n\n{context}"

    response = _call_llm(
        system_prompt, 
        user_prompt, 
        temperature=0.3, 
        max_tokens=1500,
        top_p=0.9,
    )

    # Parse JSON from response
    try:
        # Try to extract JSON array from the response
        response_str: str = str(response)
        json_match: str = response_str
        if "```json" in response_str:
            json_match = response_str.split("```json")[1].split("```")[0]
        elif "```" in response_str:
            json_match = response_str.split("```")[1].split("```")[0]
        elif "[" in response_str:
            start: int = response_str.index("[")
            end: int = response_str.rindex("]") + 1
            json_match = response_str[start:end] # type: ignore

        flashcards = json.loads(json_match)

        # Quality check — filter out low-quality cards
        valid_cards = []
        for card in flashcards:
            if (
                isinstance(card, dict)
                and "question" in card
                and "answer" in card
                and len(card["question"]) > 10
                and len(card["answer"]) > 5
            ):
                valid_cards.append(
                    {"question": card["question"], "answer": card["answer"]}
                )

        return valid_cards if valid_cards else _fallback_flashcards()

    except (json.JSONDecodeError, ValueError):
        return _fallback_flashcards()


def _fallback_flashcards() -> list[dict]:
    """Return a fallback message if flashcard generation fails."""
    return [
        {
            "question": "Could not generate flashcards from this content.",
            "answer": "Please try uploading a different PDF or a section with more content.",
        }
    ]
