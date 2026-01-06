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

#### Gitleaks in CI
We use Gitleaks for secret scanning in CI/CD pipelines:

```yaml
- name: Gitleaks Secret Scanning
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}
```

**Gitleaks advantages:**
- Fast, accurate secret detection
- Configurable allowlists for false positives
- Support for 200+ secret types
- Built-in GitHub SARIF reporting
- Open-source with active community

#### Local Verification
To verify Gitleaks locally before pushing:

1. Install Gitleaks:
   ```bash
   brew install gitleaks
   # Or on Linux:
   # wget https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_<version>_linux_x64.tar.gz
   # tar xvzf gitleaks_<version>_linux_x64.tar.gz
   # sudo mv gitleaks /usr/bin/
   ```

2. Run Gitleaks:
   ```bash
   # Basic scan
   gitleaks detect --source . --verbose

   # With custom config (if needed)
   gitleaks detect --source . --config .gitleaks.toml --verbose

   # Generate SARIF report for GitHub
   gitleaks detect --source . --report-format sarif --report-path gitleaks-report.sarif
   ```

#### Allowlists
To reduce false positives, create `.gitleaks.toml` in the project root:

```toml
title = "Gitleaks Custom Config"

[allowlist]
description = "Global allowlist"
paths = [
    '''gitleaks-report\.sarif''',
    '''\.env\.example''',
    '''locales/.*\.json''',
    '''\.git/.*'''
]

# Allow specific regex patterns (use sparingly)
[[allowlist.regexes]]
description = "Allow example placeholder patterns"
regex = '''YOUR_[A-Z_]+_HERE'''

# Allow specific commits
[[allowlist.commits]]
description = "Commit with known false positive"
hash = "abc123def456"
```

**Note:** We use Gitleaks for its fast, accurate secret detection and excellent GitHub SARIF integration. The `--fail` flag in CI ensures the build fails when secrets are detected.

### Incident Handling
If a secret is exposed, follow the playbook in `agent_docs/05_incident_playbook.md`:
1. Rotate immediately
2. Revoke compromised credentials
3. Assess blast radius
4. Update all configurations
5. Consider git history cleanup if necessary
6. Add regression checks
