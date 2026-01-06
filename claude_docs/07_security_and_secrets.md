---
tags: [security, secrets, scanning, compliance]
---

# 07 Security and Secrets

## WHAT
Secrets rules and scanning requirements.

## WHY
- Credential leakage is high-impact and hard to remediate.
- Agents and docs increase exposure risk without strict guardrails.

## HOW

### Secrets Management Rules

#### Production/CI Secrets
- Use GitHub Secrets for runtime injection
- Never commit actual secret values
- Use environment variables in code

#### Local Development
- Use untracked override files (`.env.local`)
- Or use OS keychain for sensitive values
- Template files (`.env.example`) contain only placeholders

#### .gitignore Requirements
```
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json
```
Note: Do not ignore `.env.example` templates

### Placeholder Format
Always use clear placeholders in templates and documentation:
```
SUPABASE_URL=YOUR_SUPABASE_URL_HERE
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
EXPO_PROJECT_ID=YOUR_PROJECT_ID_HERE
EXPO_PUBLIC_SENTRY_DSN=YOUR_SENTRY_DSN
EXPO_PUBLIC_POSTHOG_KEY=YOUR_POSTHOG_KEY
```

### Monitoring & Observability Secrets

#### Sentry
- **Public DSN**: Can be committed (used by client)
- **Auth Token**: Secret (for sourcemap uploads, CLI)
  - Store in GitHub Secrets as `SENTRY_AUTH_TOKEN`
- **Required for**: Error tracking, performance monitoring

#### PostHog
- **API Key**: Can be committed (used by client)
- **Required for**: Product analytics, event tracking

See full environment variable reference in `.env.example`.

### What Constitutes a Secret
- API keys (Supabase, third-party services)
- Database connection strings
- JWT signing keys
- Push notification credentials
- OAuth client secrets
- Encryption keys
- Sentry DSN and auth tokens
- PostHog API keys

### Forbidden Locations for Secrets
- Source code files
- Documentation (markdown files)
- Code comments
- Example files (use placeholders)
- Screenshots or recordings
- Test files (use mocks)
- Commit messages

### Secret Scanning

#### GitHub Secret Scanning
- Enable in repository settings
- Configure alerts for detected secrets
- Enable push protection where available

#### TruffleHog in CI
We use TruffleHog for secret scanning in CI/CD pipelines:

```yaml
- name: Check for secrets in code
  uses: trufflesecurity/trufflehog@main
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified --fail
```

**TruffleHog advantages:**
- Native GitHub integration
- Verified secrets only (reduces false positives)
- Comprehensive secret detection database
- Real-time verification of leaked credentials

#### Pre-commit Hook (Optional)
To add TruffleHog as a pre-commit hook:

1. Install TruffleHog:
   ```bash
   brew install trufflehog
   ```

2. Add to `.husky/pre-commit`:
   ```bash
   #!/bin/sh
   . "$(dirname "$0")/_/husky.sh"

   # Run TruffleHog secret scanning
   trufflehog filesystem --directory ./ --only-verified --fail
   ```

**Note:** We use TruffleHog instead of Gitleaks for its superior GitHub integration and verified secret detection, which significantly reduces false positives compared to regex-only scanners.

### Incident Handling
If a secret is exposed, follow the playbook in `agent_docs/05_incident_playbook.md`:
1. Rotate immediately
2. Revoke compromised credentials
3. Assess blast radius
4. Update all configurations
5. Consider git history cleanup if necessary
6. Add regression checks
