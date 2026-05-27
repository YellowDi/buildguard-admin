# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email the maintainer directly with details of the vulnerability
3. Include steps to reproduce, potential impact, and any suggested fixes

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days.

## Scope

This policy covers the BuildGuard Admin frontend application. The backend API is maintained separately and has its own security policy.

## Security Considerations

- **Authentication** — JWT tokens stored in localStorage; sessions are validated on each route navigation
- **API communication** — all API requests go through `/bqi` proxy; HTTPS enforced in production via `VITE_REQUIRE_SECURE_API`
- **Environment variables** — secrets (API keys, tokens) must be stored in `.env.local` which is gitignored
- **File uploads** — handled via Tencent COS; no direct server-side file processing in this frontend

## Best Practices for Contributors

- Never commit `.env.local`, credentials, or API keys
- Use the centralized API layer (`src/lib/api.ts`) for all requests — it handles auth headers and token management
- Validate user inputs at system boundaries
- Follow the permission system (`PermissionGate`, `useCurrentUserPermissions`) for access control
