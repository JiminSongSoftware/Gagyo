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
```

### What Constitutes a Secret
- API keys (Supabase, third-party services)
- Database connection strings
- JWT signing keys
- Push notification credentials
- OAuth client secrets
- Encryption keys

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
```yaml
- name: Gitleaks
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Pre-commit Hook (Optional)
```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.x.x
    hooks:
      - id: gitleaks
```

### Incident Handling
If a secret is exposed, follow the playbook in `agent_docs/05_incident_playbook.md`:
1. Rotate immediately
2. Revoke compromised credentials
3. Assess blast radius
4. Update all configurations
5. Consider git history cleanup if necessary
6. Add regression checks
