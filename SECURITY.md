# Security Policy

## Supported Versions

AgriMemo is currently in active development. We support the latest major version with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

We take the security of AgriMemo seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

### Where to Report
Please **do not** open a public GitHub issue for security vulnerabilities. Instead, send a detailed report to **hnimonkar@gmail.com** (placeholder for production) or contact the maintainer directly via GitHub private messaging if available.

### What to Include
A complete report should include:
- A description of the vulnerability.
- Steps to reproduce (POC).
- Potential impact.
- Any suggested fixes.

### Our Process
1. **Acknowledgement**: You will receive an initial response within **48 hours**.
2. **Evaluation**: We will investigate and confirm the report.
3. **Fix**: If valid, we will work on a patch and coordinate a disclosure date.
4. **Recognition**: With your permission, we will credit you in our release notes for helped secure the platform.

---

## Security Features in AgriMemo
- **Hardened Middleware**: Automatic protection against XSS, clickjacking, and MIME-sniffing.
- **Path Sanitization**: All file system operations are guarded against path injection.
- **Environment Isolation**: Secure management of API keys and credentials.
