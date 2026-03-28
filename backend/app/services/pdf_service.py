import re
# Attempt to import optional PDF processing libraries
try:
    import pdfplumber
except ImportError:
    pdfplumber = None
    print("[WARN] pdfplumber is not installed. PDF extraction will be unavailable.")

try:
    import tiktoken
except ImportError:
    tiktoken = None
    print("[WARN] tiktoken is not installed. Tokenization will be unavailable.")

# Runtime guard functions
def _ensure_pdfplumber():
    if pdfplumber is None:
        raise ImportError("pdfplumber is required for PDF extraction but is not installed.")

def _ensure_tiktoken():
    if tiktoken is None:
        raise ImportError("tiktoken is required for tokenization but is not installed.")


def extract_text_with_pages(pdf_path: str) -> list[dict]:
    """Extract text from a PDF file, returning text per page with page numbers.

    Returns a list of dicts: [{"page": 1, "text": "..."}, ...]
    """
    # Ensure pdfplumber is available before attempting extraction
    _ensure_pdfplumber()
    pages = []
    with pdfplumber.open(pdf_path) as pdf: # type: ignore
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text and text.strip():
                pages.append({"page": i + 1, "text": text})
    return pages


def extract_text(pdf_path: str) -> str:
    """Extract all text from a PDF file (flat string, for backward compat)."""
    pages = extract_text_with_pages(pdf_path)
    return "\n\n".join(p["text"] for p in pages)


def clean_text(raw_text: str) -> str:
    """Normalize whitespace, remove headers/footers, and clean artifacts."""
    lines = raw_text.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        # Skip likely page numbers
        if re.match(r"^\d+$", stripped):
            continue
        # Skip very short lines that are likely headers/footers
        if len(stripped) < 3 and not stripped.isalpha():
            continue
        cleaned_lines.append(stripped)

    text = " ".join(cleaned_lines)
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Fix common OCR artifacts — rejoin hyphenated words
    text = re.sub(r"([a-z])-\s+([a-z])", r"\1\2", text)
    return text


def chunk_text(text: str, max_tokens: int = 512, overlap: int = 128) -> list[str]:
    """Split text into overlapping chunks based on token count.

    Default: 512-token windows with 128-token stride (25% overlap).
    This balances retrieval precision with context coverage.
    """
    _ensure_tiktoken()
    tokenizer = tiktoken.get_encoding("cl100k_base") # type: ignore
    tokens = tokenizer.encode(text)

    chunks = []
    start = 0
    while start < len(tokens):
        end: int = min(start + max_tokens, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text_str = tokenizer.decode(chunk_tokens)
        chunks.append(chunk_text_str)

        if end >= len(tokens):
            break
        start += max_tokens - overlap

    return chunks


def chunk_text_with_pages(
    pages: list[dict], max_tokens: int = 512, overlap: int = 128
) -> list[dict]:
    """Split page-aware text into overlapping chunks with page number tracking.

    Returns a list of dicts:
      [{"text": "...", "page_number": 1, "token_count": 450}, ...]

    Each chunk is tagged with the page number where it starts.
    """
    _ensure_tiktoken()
    tokenizer = tiktoken.get_encoding("cl100k_base") # type: ignore

    # Build a flat list of (token, page_number) tuples
    token_page_map: list[int] = []
    all_tokens: list[int] = []

    for page_info in pages:
        cleaned = clean_text(page_info["text"])
        page_tokens = tokenizer.encode(cleaned)
        all_tokens.extend(page_tokens)
        token_page_map.extend([page_info["page"]] * len(page_tokens))

    chunks = []
    start = 0
    while start < len(all_tokens):
        end = min(start + int(max_tokens), len(all_tokens))
        chunk_tokens = all_tokens[start:end] # type: ignore
        chunk_text_str = tokenizer.decode(chunk_tokens)

        # Page number is the page where this chunk starts
        page_number = int(token_page_map[start]) if start < len(token_page_map) else 1

        chunks.append({
            "text": chunk_text_str,
            "page_number": page_number,
            "token_count": len(chunk_tokens),
        })

        if end >= len(all_tokens):
            break
        start += int(max_tokens) - int(overlap) # type: ignore

    return chunks
