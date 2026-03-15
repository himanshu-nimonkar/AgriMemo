"""
Unit tests for the deduplication engine.
"""
import pytest
from app.utils.text_utils import jaccard_similarity, normalize_transcript, compute_trigrams


def test_normalize_removes_filler_words():
    text = "um check the north field uh right"
    normalized = normalize_transcript(text)
    assert "um" not in normalized
    assert "uh" not in normalized
    assert "north" in normalized
    assert "field" in normalized


def test_normalize_lowercases():
    assert normalize_transcript("Check The Field") == normalize_transcript("check the field")


def test_compute_trigrams_empty():
    assert compute_trigrams("") == set()
    assert compute_trigrams("ab") == set()


def test_compute_trigrams_basic():
    tgrams = compute_trigrams("hello")
    assert "hel" in tgrams
    assert "ell" in tgrams
    assert "llo" in tgrams


def test_jaccard_identical():
    text = "check the north field irrigation valve"
    assert jaccard_similarity(text, text) == 1.0


def test_jaccard_empty_both():
    assert jaccard_similarity("", "") == 1.0


def test_jaccard_one_empty():
    assert jaccard_similarity("some text here", "") == 0.0


def test_jaccard_similar():
    a = "check the north field irrigation valve"
    b = "check north field irrigation valve please"
    sim = jaccard_similarity(a, b)
    assert sim > 0.7


def test_jaccard_different():
    a = "check the north field irrigation valve"
    b = "schedule meeting with team tomorrow morning"
    sim = jaccard_similarity(a, b)
    assert sim < 0.3


def test_jaccard_symmetric():
    a = "wheat aphids block a"
    b = "aphids block wheat a"
    assert abs(jaccard_similarity(a, b) - jaccard_similarity(b, a)) < 1e-9
