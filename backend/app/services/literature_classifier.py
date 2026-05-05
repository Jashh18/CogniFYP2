import json
from groq import Groq
from app.core.config import settings


def verify_literature_content(text: str) -> dict:
    """Verify that a PDF's content is specifically about English Literature for undergraduates.

    The function sends samples of the text to LLaMA-3 via Groq and expects a JSON response.
    It uses a strict prompt to filter out non-literature content.
    """
    if not text or len(text.strip()) < 100:
        return {"is_literature": False, "reason": "Document is too short to be a valid literature study material."}

    # Take samples from the beginning, middle, and end to get a representative view
    text_len = len(text)
    sample_size = 800
    
    samples = []
    # Beginning (usually contains title, author, intro)
    samples.append(text[:sample_size])
    
    # Middle (contains actual analysis or content)
    if text_len > sample_size * 3:
        mid = text_len // 2
        samples.append(text[mid - (sample_size // 2) : mid + (sample_size // 2)])
        
    # End (conclusion, references)
    if text_len > sample_size * 2:
        samples.append(text[-sample_size:])

    combined_sample = "\n--- SAMPLE ---\n".join(samples)

    client = Groq(api_key=settings.GROQ_API_KEY)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert academic classifier for an English Literature study platform. "
                        "Your task is to determine if a given document is suitable for English Literature undergraduate students.\n\n"
                        "VALID CATEGORIES:\n"
                        "- Canonical or contemporary novels, plays, poetry, and short stories.\n"
                        "- Literary criticism and academic essays about specific works or authors.\n"
                        "- Literary theory (e.g., Post-colonialism, Marxism, Feminism in literature).\n"
                        "- Historical context related to literary periods (e.g., Romanticism, Modernism).\n\n"
                        "INVALID CATEGORIES (REJECT THESE):\n"
                        "- Computer Science, Engineering, Mathematics, or pure Science papers.\n"
                        "- General news, recipes, or casual blogs.\n"
                        "- Textbooks for other subjects (History, Sociology, etc. unless they focus on literary analysis).\n"
                        "- Business reports or marketing material.\n\n"
                        "You MUST respond ONLY with a JSON object in this format:\n"
                        "{\"is_literature\": boolean, \"reason\": \"a short explanation in English\"}"
                    ),
                },
                {
                    "role": "user",
                    "content": f"Classify this document content:\n\n{combined_sample}",
                },
            ],
            temperature=0.1,
            max_tokens=150,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content.strip())
        
        # Ensure consistency in keys
        if "is_literature" not in result:
            result["is_literature"] = False
            
        return result

    except Exception as e:
        # Default to False for strictness as requested by the user
        return {
            "is_literature": False, 
            "reason": f"Content verification failed due to a technical error. Please try again. ({str(e)})"
        }
