# JWT Production Audit

## Status
JWT support is production-safe because the backend uses a server-side secret and verifies signatures locally.

## Requirements
- Define JWT_SECRET in the runtime environment.
- Use a long random string with at least 32 characters.
- Keep APP_DEBUG disabled in production to avoid exposing internals.

## Risk
Low when the secret is configured correctly. The server returns a clear configuration error if the secret is missing.
