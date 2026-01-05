---
tags: [sdd, process, spec, standards, testing]
---

# 00a SDD Rules

## WHAT
SDD (Spec-Driven Development) means the spec is authored or updated before tests and implementation. In this repo, the spec is the system of modular markdown files under /claude_docs with canonical Figma references in 00_product_spec.md.

## WHY
- Prevents design/code drift.
- Enables predictable agent execution and review.
- Forces tenant/security/testing considerations to be explicit up front.

## HOW
A change is blocked unless the spec includes:
- Feature intent + scope (WHAT)
- Constraints and rationale (WHY), including tenant isolation and security posture
- Concrete implementation guidance (HOW): flows, data model touchpoints, API boundaries
- Test implications: unit/integration/E2E expectations
- Link to the relevant Figma reference(s) in 00_product_spec.md (or appended there if new)

Minimum spec update checklist:
- Update the relevant module doc(s) in /claude_docs
- Ensure Obsidian tags are present
- Add/adjust "test implications" section in the same doc
