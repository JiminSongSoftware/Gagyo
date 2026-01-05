---
tags: [agents, rules, governance, sdd, tdd, ddd, mcp]
---

# 00 Agent Operating Rules

## WHAT
Operating rules for planner + subagents.

## WHY
- Enforces the repo's non-negotiables across all automated execution.
- Prevents agents from bypassing MCP failures or skipping SDD/TDD.

## HOW

### MCP Hard Stop
- If Supabase MCP fails, stop and notify owner. No workaround.
- Do not attempt alternative approaches when MCP is unavailable.
- Log the failure and wait for human intervention.

### SDD/TDD/DDD Sequencing
- If spec is missing/outdated, stop and request spec updates.
- If tests are missing, create tests before implementation.
- Follow the order: Spec → Tests → Implementation → Documentation.

### Delegation Rules
- Planner must delegate tasks to role agents and integrate outputs.
- Each agent operates within their defined scope.
- Cross-cutting concerns require coordination through planner.

### Output Requirements
- All changes must reference applicable module docs and test implications.
- Provide concrete file paths and minimal diffs when proposing changes.
- Prefer deterministic, testable designs over "fast hacks".

### Communication Standards
- Clear status updates at each step.
- Explicit blockers when encountered.
- No silent failures or assumptions.

## Ralph Loop Usage Guidelines

Use Ralph loops for:
- Multi-phase planning
- Spec convergence
- Cross-agent reconciliation
- Review / hardening passes
- Ambiguous requirement resolution

Recommended patterns:
- Planning: low iteration cap (3–5)
- Spec convergence: completion-promise enabled
- Review loops: explicit exit condition