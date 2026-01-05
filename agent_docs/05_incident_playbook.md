---
tags: [incident, security, secrets, remediation, appstore, playstore]
---

# 05 Incident Playbook

## WHAT
Standardized remediation steps for:
- Secret exposure
- Production incidents
- App Store / Play Store compliance issues (rejections, takedowns, policy violations)

## WHY
- Fast, consistent response reduces damage and review friction
- Prevents ad-hoc fixes that introduce regressions or policy risk
- Creates an auditable trail for security and store-review issues

## HOW

---

## Secret Exposure Response

### Step 1: Rotate Key Immediately
- Generate new credentials
- Do not wait for assessment
- Time is critical

### Step 2: Revoke Compromised Token
- Invalidate the exposed credential
- Follow the provider’s revocation process
- Confirm revocation is effective

### Step 3: Identify Blast Radius
- Where was the secret used?
- Which systems and environments had access?
- What data could be affected?
- Check access logs if available

### Step 4: Remove from Active Configs
- Update all environments using the secret
- Deploy configuration changes
- Verify old secret no longer works

### Step 5: Assess Git History Cleanup
- Determine if the secret exists in git history
- Evaluate risk of history rewrite vs leaving as-is
- Document decision and rationale
- If rewriting: coordinate with team; force push required

### Step 6: Add Regression Checks
- Enable secret scanning if not already enabled
- Add pre-commit hooks
- Update CI to catch future leaks
- Record actions in post-mortem

---

## Production Incident Response

### Severity Levels

**P0 – Critical**
- Service fully down
- Data breach confirmed
- Response: Immediate, all hands

**P1 – High**
- Major feature broken
- Significant user impact
- Response: Within 1 hour

**P2 – Medium**
- Minor feature broken
- Limited user impact
- Response: Within 4 hours

**P3 – Low**
- Cosmetic or edge issues
- Minimal impact
- Response: Next business day

### Response Steps

1. **Acknowledge** – Confirm incident received
2. **Assess** – Determine severity, scope, and affected platforms
3. **Communicate** – Notify stakeholders with current status
4. **Mitigate** – Stop the bleeding (feature flag, rollback, config change)
5. **Resolve** – Fix root cause
6. **Verify** – Validate using MCP tools
7. **Post-mortem** – Document cause, fix, and prevention

---

## App Store / Play Store Compliance Incident

### Triggers
- App review rejection
- Policy violation notice
- Metadata mismatch warning
- Takedown or suspension risk

### Immediate Actions

1. **Capture Evidence**
   - Use **rn-debugger MCP** and/or **ios-simulator MCP** to collect:
     - logs
     - screenshots
     - recordings (if UI behavior is questioned)
   - Preserve exact app version and build number

2. **Identify Policy Area**
   - Determine which area applies (e.g., UGC moderation, privacy, messaging, payments)
   - Use **context7 MCP** and **expo-docs MCP** to confirm the *current* policy or platform behavior

3. **Assess Severity**
   - Blocker (cannot ship / app removed)
   - Conditional (metadata, clarification, small fix)
   - Informational (future risk)

4. **Mitigate Quickly**
   - Disable or gate offending feature if possible
   - Add server-side protection or UI gating as needed
   - Do not introduce new features unrelated to the violation

5. **Fix & Verify**
   - Implement the minimum compliant fix
   - Verify on-device using MCP tooling
   - Ensure the issue is demonstrably resolved

6. **Reviewer Communication**
   - Prepare a concise explanation:
     - What was wrong
     - What was changed
     - Where to test the fix
   - Provide demo credentials or demo mode if required
   - Keep responses factual and minimal

---

## MCP Usage During Incidents (Required)

- **rn-debugger MCP / ios-simulator MCP**
  - Logs, network traces, UI verification, screenshots, recordings
- **context7 MCP / expo-docs MCP**
  - Confirm up-to-date documentation or platform expectations
- **Supabase MCP**
  - Verify backend behavior, auth, RLS, or data exposure

Do not rely on assumptions or reasoning alone when MCP inspection is available.

---

## Post-Mortem Template

```markdown
## Incident Summary
- Date/Time:
- Duration:
- Severity:
- Platforms affected:
- Store impact (if any):

## Trigger
- What caused the incident or review failure

## Timeline
- HH:MM – Issue occurred
- HH:MM – Detected
- HH:MM – Response began
- HH:MM – Mitigated
- HH:MM – Resolved

## Root Cause
[Concise description]

## Resolution
[What was changed and why it works]

## Verification
- MCP tools used:
- Evidence captured:

## Prevention
[Process, tests, or checks added]

## Action Items
- [ ] Item – Owner – Due date
