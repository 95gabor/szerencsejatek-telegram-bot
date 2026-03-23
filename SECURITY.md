# Security

## Supported versions

Security fixes are applied to the **default branch** (`main`) and released with tagged versions as
needed. Use the latest tag or `main` for deployments.

## Reporting a vulnerability

Please **do not** open a public issue for undisclosed security problems (they would be visible to
everyone before a fix exists).

1. Use
   **[GitHub Security advisories](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)**
   for this repository: **Security → Report a vulnerability** (if enabled), or
2. Contact the repository owner via a **private** channel you already use with them.

Include enough detail to reproduce or understand the issue (versions, config surface, impact). We
will treat reports in good faith and coordinate disclosure after a fix.

## Secrets and configuration

- Never commit **Telegram `BOT_TOKEN`**, webhook secrets, or other credentials. Use `.env` locally
  (see `.env.example`); keep `.env` out of git (see `.gitignore`).
- Do not paste real tokens into issues, PR descriptions, or logs in public threads.
