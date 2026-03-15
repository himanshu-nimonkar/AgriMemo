"""
AgriMemo — Security Utilities
Input sanitizers and validators.
"""
import os

UUID_V4_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)


def is_valid_uuid_v4(value: str) -> bool:
    """Validate a UUID v4 string. Prevents path traversal and injection."""
    return bool(UUID_V4_PATTERN.match(value.lower()))


def safe_join(base_directory: str, filename: str) -> str:
    """
    Safely join a base directory and a filename, ensuring the resulting path
    is within the base directory. Prevents path traversal attacks.
    """
    # Normalize paths (remove .., follow links if necessary, etc.)
    safe_base = os.path.normpath(base_directory)
    # Join and normalize the full path
    full_path = os.path.normpath(os.path.join(safe_base, filename))
    
    # Ensure full_path starts with safe_base and isn't just safe_base itself
    if os.path.commonpath([safe_base, full_path]) != safe_base:
        raise ValueError(f"Path traversal attempt: {full_path} is outside {safe_base}")
    
    return full_path


def sanitize_search_query(query: str) -> str:
    """Strip and limit search query to 200 chars."""
    return query.strip()[:200]
