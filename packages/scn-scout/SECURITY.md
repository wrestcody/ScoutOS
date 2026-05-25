# Security Policy

## Supported Versions

Only the latest version of SCN Scout is currently supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| v1.0.x  | :white_check_mark: |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability within SCN Scout, please report it via the following process:

1. **Email:** Send an email to `security@yourdomain.com` (replace with actual reporting email).
2. **Details:** Include a detailed description of the vulnerability, steps to reproduce, and any potential impact.
3. **Response:** You will receive an acknowledgment of your report within 48 hours.

We follow coordinated disclosure and will work with you to ensure vulnerabilities are patched before public announcement.

## Security Architecture

SCN Scout is built with a "Zero Trust" compliance philosophy:
- **Client-Side Verification:** All sensitive data is verified against server-side policies.
- **Vault Integration:** Secrets are referenced by ARNs/Refs, never stored as raw plaintext inside SCN Scout.
- **Audit Trails:** Every change classification is recorded in a tamper-evident Firestore log.
