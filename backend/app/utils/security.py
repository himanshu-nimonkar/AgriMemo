"""
AgriMemo — Security Utilities
Input sanitizers and validators.
"""
import re

UUID_V4_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)


def is_valid_uuid_v4(value: str) -> bool:
    """Validate a UUID v4 string. Prevents path traversal and injection."""
    return bool(UUID_V4_PATTERN.match(value.lower()))


def sanitize_search_query(query: str) -> str:
    """Strip and limit search query to 200 chars."""
    return query.strip()[:200]
