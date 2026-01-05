---
tags: [workflow, dev, sdd, tdd, ddd, mcp, figma]
---

# 02 Dev Workflow

## Store Compliance Enforcement

During design, implementation, and review:
- Ensure reporting, blocking, and moderation flows exist and are testable
- Ensure privacy disclosures and consent flows are implemented
- Ensure account deletion is available in-app
- Do not implement SMS, prank, or anonymous messaging
- Validate that all features are reviewable and enabled in test/demo mode

## WHAT
Canonical development workflow aligned with SDD + TDD + DDD.

## WHY
- Makes delivery predictable
- Ensures tests, tenant boundaries, and security constraints are addressed early
- Enforces consistent use of MCP tooling and design sources of truth

## HOW

### MCP Usage Rules (Applies to All Steps)

- **Design validation**
  - Use **Figma MCP** as the primary source for layouts, spacing, colors, and component structure
  - If Figma MCP access is unavailable, use `Figma_Screenshots/` as a last-resort fallback
  - Do not infer or guess UI when a visual reference exists

- **Documentation lookup**
  - Use **context7 MCP** and **expo-docs MCP** to confirm up-to-date behavior
    before fixing bugs or making improvements
  - Do not rely on outdated or assumed API behavior

- **Backend**
  - Use **Supabase MCP** for all backend-related tasks
    (schema, auth, RLS, data access, debugging)

- **Debugging & validation**
  - Use **rn-debugger MCP** and **ios-simulator MCP** during TDD, QA,
    and review for logs, network activity, UI inspection, screenshots,
    and recordings
  - Do not rely on reasoning alone when MCP inspection is available

---

### Workflow Steps

#### 1. Update Specs (SDD)
- Update relevant module docs in `/claude_docs`
- Use WHAT / WHY / HOW structure
- Include test implications and invalidation notes
- Reference **Figma links** (via Figma MCP when possible)
- Confirm assumptions using **context7 / expo-docs MCPs** where applicable

#### 2. Write / Adjust Tests (TDD)
- Create unit tests for new functionality
- Add integration tests for data access patterns
- Update E2E tests for user-facing changes
- Ensure tenant isolation and visibility rules are tested
- Use **rn-debugger / ios-simulator MCPs** to:
  - capture logs
  - inspect network behavior
  - verify UI states against Figma

#### 3. Implement Code (DDD)
- Follow DDD boundaries defined in specs
- Respect feature-first directory structure
- Use **Tamagui-first** for UI components
- Extend Tamagui components instead of working around them
- Maintain tenant context throughout
- Use **Supabase MCP** for backend implementation and validation

#### 4. Update Documentation
- Update specs if behavior changed
- Add/update code comments for complex or non-obvious logic
- Update Storybook entries for new or modified components
- Add or update `SKILL.md` files near major changes to capture:
  - decisions
  - tradeoffs
  - constraints

#### 5. Commit / PR Compliance
- Follow commit format in `agent_docs/03_commit_and_pr_rules.md`
- Ensure PR description includes WHAT / WHY / HOW
- Link to relevant specs, tests, and Figma references
- Note MCP usage where it was critical to validation

---

### Pre-Implementation Checklist

- [ ] Spec exists and is up-to-date
- [ ] Ontology impact reviewed (if applicable)
- [ ] Test implications documented
- [ ] Tenant isolation requirements are clear
- [ ] Security considerations addressed
- [ ] Figma reference validated (MCP or screenshot fallback)
- [ ] Relevant docs confirmed via context7 / expo-docs

### Post-Implementation Checklist

- [ ] All tests pass
- [ ] No new linting errors
- [ ] Type checks pass
- [ ] UI validated against Figma (or screenshots if MCP unavailable)
- [ ] Documentation updated
- [ ] Storybook updated (if applicable)
- [ ] `SKILL.md` updated (if applicable)
- [ ] PR follows format rules

---

## i18n Workflow

When implementing user-facing features, follow these internationalization steps:

### During SDD (Step 1)

- [ ] Identify all user-facing strings in the spec
- [ ] Define translation key names for each string
- [ ] Document required interpolation variables
- [ ] Specify if rich text (links, formatting) is needed

### During TDD (Step 2)

- [ ] Add translation keys to both `locales/en/*.json` and `locales/ko/*.json`
- [ ] Write tests for locale switching behavior
- [ ] Write tests for fallback behavior (English as fallback)
- [ ] Test interpolation with various values
- [ ] For Trans components, test rendered output in both locales

### During Implementation (Step 3)

- [ ] Use `i18nKey` prop for UI components (Text, Button, Input, etc.)
- [ ] Use `Trans` component for rich text with links or formatting
- [ ] Use `formatDate`, `formatNumber`, `formatRelativeTime` utilities for data
- [ ] Set proper testIDs for E2E testing of translated text

### Pre-Commit Validation

The pre-commit hook automatically runs:
- ESLint with i18n rules (catches hardcoded strings)
- i18n validation script (checks key parity between locales)
- Prettier formatting

Run manually with:
```bash
bun run i18n:validate
```

### Adding New Translation Keys

1. Determine the namespace (common, chat, auth, etc.)
2. Add English translation to `locales/en/{namespace}.json`
3. Add Korean translation to `locales/ko/{namespace}.json`
4. Run `bun run i18n:validate` to check parity

Example:
```json
// locales/en/common.json
{
  "new_feature": {
    "title": "New Feature",
    "description": "Description of the new feature",
    "action": "Get Started"
  }
}

// locales/ko/common.json
{
  "new_feature": {
    "title": "새 기능",
    "description": "새 기능에 대한 설명",
    "action": "시작하기"
  }
}
```

### Common i18n Pitfalls

- **Hardcoded strings**: Never use literal strings in JSX (ESLint will warn)
- **Missing keys**: Always add to both en and ko; pre-commit will catch mismatches
- **Wrong namespace**: Ensure the namespace is imported when using `useTranslation()`
- **Pluralization**: English uses `_plural` suffix; Korean typically doesn't
- **Date/number formatting**: Use utility functions, don't format manually

### i18n Testing Checklist

- [ ] Component renders in English (default locale)
- [ ] Component renders in Korean
- [ ] Locale switch updates all UI elements
- [ ] Fallback to English works for missing Korean keys
- [ ] Interpolation variables display correctly
- [ ] Date/number formatting follows locale conventions
- [ ] Accessibility labels are translated

