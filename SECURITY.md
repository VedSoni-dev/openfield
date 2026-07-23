# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, use GitHub's private [Security Advisories](https://github.com/VedSoni-dev/openfield/security/advisories/new) to report privately. We aim to respond within 72 hours.

## Scope

openfield is **bring-your-own-key**. It never proxies, stores, or transmits your
provider API keys anywhere except directly to the provider you configured
(`FAL_KEY` → fal.ai, `REPLICATE_API_TOKEN` → Replicate, etc.). Keys are read
from environment variables at call time and never persisted.

If you find a code path that leaks a key to any third party, logs it, or writes
it to disk, that is a security bug — please report it privately.

## Handling keys safely

- Keep keys in `.env` (git-ignored) or your platform's secret store.
- Never commit `.env`.
- Rotate any key that appears in a commit, screenshot, or log.
