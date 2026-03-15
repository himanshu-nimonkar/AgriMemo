"""
AgriMemo — Security Utilities
Input sanitizers and validators.
"""
import os
import re
import ipaddress
from urllib.parse import urlparse

UUID_V4_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)


def is_valid_uuid_v4(value: str) -> bool:
    """Validate a UUID v4 string. Prevents path traversal and injection."""
    return bool(UUID_V4_PATTERN.match(value.lower()))


def validate_url(url: str, allow_private: bool = False) -> bool:
    """
    Validate a URL to prevent SSRF attacks.
    - Only allow http/https schemes.
    - Block private IP addresses/localhost unless allow_private is True.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        
        hostname = parsed.hostname
        if not hostname:
            return False

        if allow_private:
            return True

        # Resolve IP address and check if it's private
        import socket
        ip_addr = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_addr)
        return not (ip.is_private or ip.is_loopback)
    except Exception:
        return False


def safe_join(base_directory: str, filename: str) -> str:
    """
    Safely join a base directory and a filename, ensuring the resulting path
    is within the base directory. Prevents path traversal attacks.
    """
    # Normalize paths (remove .., follow links if necessary, etc.)
    # Use realpath to resolve any symlinks and .. segments
    safe_base = os.path.realpath(base_directory)
    # Join and resolve the full path
    full_path = os.path.realpath(os.path.join(safe_base, filename))
    
    # Ensure full_path starts with safe_base
    if not full_path.startswith(safe_base + os.sep) and full_path != safe_base:
        raise ValueError(f"Path traversal attempt: {full_path} is outside {safe_base}")
    
    return full_path


def sanitize_search_query(query: str) -> str:
    """Strip and limit search query to 200 chars."""
    return query.strip()[:200]
