"""
AgriMemo — Text Utilities
Transcript normalization and n-gram computation for deduplication.
"""
import re

FILLER_WORDS = {
    "um", "uh", "like", "you", "know", "so", "well", "right",
    "okay", "ok", "just", "yeah", "actually", "basically",
}


def normalize_transcript(text: str) -> str:
    """
    Normalize a transcript for comparison:
    - Lowercase
    - Remove punctuation except apostrophes
    - Collapse whitespace
    - Strip filler words
    """
    text = text.lower()
    text = re.sub(r"[^\w\s']", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    tokens = [w for w in text.split() if w not in FILLER_WORDS]
    return " ".join(tokens)


def compute_trigrams(text: str) -> set:
    """Compute character-level trigrams of a string."""
    return {text[i: i + 3] for i in range(len(text) - 2)} if len(text) >= 3 else set()


def jaccard_similarity(a: str, b: str) -> float:
    """
    Compute Jaccard similarity between two strings using character trigrams.
    Strings are normalized before comparison.
    """
    norm_a = normalize_transcript(a)
    norm_b = normalize_transcript(b)
    tri_a = compute_trigrams(norm_a)
    tri_b = compute_trigrams(norm_b)
    if not tri_a and not tri_b:
        return 1.0
    if not tri_a or not tri_b:
        return 0.0
    intersection = len(tri_a & tri_b)
    union = len(tri_a | tri_b)
    return intersection / union
