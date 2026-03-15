import pytest
from app.utils.security import validate_url, safe_join
import os

def test_validate_url_public():
    # Public URLs should be allowed regardless of allow_private
    assert validate_url("https://www.google.com") is True
    assert validate_url("https://github.com/abc") is True

def test_validate_url_private_blocked():
    # Private URLs should be blocked by default
    assert validate_url("http://127.0.0.1") is False
    assert validate_url("http://localhost") is False
    assert validate_url("http://192.168.1.1") is False
    assert validate_url("http://10.0.0.1") is False

def test_validate_url_private_allowed_in_dev():
    # Private URLs should be allowed if allow_private=True
    assert validate_url("http://127.0.0.1", allow_private=True) is True
    assert validate_url("http://localhost", allow_private=True) is True
    assert validate_url("http://192.168.1.1", allow_private=True) is True

def test_validate_url_invalid_schemes():
    assert validate_url("ftp://example.com") is False
    assert validate_url("file:///etc/passwd") is False
    assert validate_url("javascript:alert(1)") is False

def test_safe_join_valid():
    base = "/tmp/test_base"
    if not os.path.exists(base):
        os.makedirs(base, exist_ok=True)
    
    # Simple join
    assert safe_join(base, "file.txt") == os.path.realpath(os.path.join(base, "file.txt"))
    # Join with subfolder
    sub = os.path.join(base, "sub")
    os.makedirs(sub, exist_ok=True)
    assert safe_join(base, "sub/file.txt") == os.path.realpath(os.path.join(base, "sub/file.txt"))

def test_safe_join_traversal():
    base = "/tmp/test_base"
    if not os.path.exists(base):
        os.makedirs(base, exist_ok=True)
    
    with pytest.raises(ValueError, match="Path traversal attempt"):
        safe_join(base, "../etc/passwd")
    
    with pytest.raises(ValueError, match="Path traversal attempt"):
        safe_join(base, "sub/../../etc/passwd")

    # Absolute paths should também be blocked if they resolve outside base
    with pytest.raises(ValueError, match="Path traversal attempt"):
        safe_join(base, "/etc/passwd")
