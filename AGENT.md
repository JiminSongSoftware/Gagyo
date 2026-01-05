---
tags: [entrypoint, rules, mcp, sdd, tdd, ddd, security, agents]
---

# CLAUDE.md

Purpose: Define non-negotiables for Claude and provide pointers to detailed documentation.
This file is an entrypoint only; all details live in linked documents.

## Non-Negotiables (Hard Stops)

### 1) MCP-first execution
Always utilize MCP servers.

If the Supabase MCP (or any required MCP) is not responding:
- Do NOT attempt a workaround
- STOP immediately
- Notify me so the MCP can be fixed
- Resume work only after a functioning MCP is available

Proceeding without required MCPs is not allowed.

---

### 2) Engineering discipline: SDD + TDD + DDD
Strictly enforce:
- SDD (Spec-Driven Development)
- TDD (Test-Driven Development)
- DDD (Domain-Driven Development)

**Order of operations (non-negotiable):**
1. **SDD** – Update or create the spec first  
   (WHAT / WHY / HOW, flows, tenant scope, test implications, Figma references)
2. **TDD** – Write end-to-end and/or unit tests before functional code
3. **DDD** – Implement following domain boundaries, invariants, and tenant isolation rules

Deviation from this order is not permitted.

---

### 3) Ontology enforcement (non-negotiable)
All domain concepts must be defined in the Domain Ontology  
(`claude_docs/01_domain_glossary.md`) **before** they may be referenced in:
- Specs
- Schemas
- APIs
- Tests
- Code

Undeclared or ambiguous domain concepts are not allowed.

---

### 4) Secrets & security (non-negotiable)
- Never include real API keys or tokens in:
  - Documentation
  - Code comments
  - Examples
  - Screenshots
  - Test fixtures
- Use placeholders only
  (e.g., `SUPABASE_ANON_KEY=YOUR_KEY_HERE`)
- GitHub Secrets are required
- `.env` files must never be committed

---

### 5) Internationalization (non-negotiable)
- All user-facing strings must use the i18n system (`en` + `ko`)
- No hardcoded UI strings in components
- See: `claude_docs/00_product_spec.md` (i18n requirements) and `claude_docs/02_code_conventions.md` (i18n standards)

---

## Tooling & Runtime Standards

### Iterative execution control (non-negotiable)

For multi-step reasoning, phased planning, document convergence, or cross-agent alignment,
Claude must utilize the Ralph loop commands instead of ad-hoc iteration.

Allowed commands:
- `/ralph-loop "<prompt>" --max-iterations N`
  Start an iterative loop with a fixed iteration cap.

- `/ralph-loop "<prompt>" --max-iterations N --completion-promise "text"`
  Continue iterating until the exact completion promise is emitted.

- `/cancel-ralph`
  Immediately terminate the active loop if constraints are violated or progress stalls.

Rules:
- Do not simulate loops manually.
- Do not exceed the specified iteration cap.
- Use completion-promise mode for convergence tasks (e.g., spec finalization, ontology stabilization).

### Bun is required
- Use **`bun`** instead of `npm` or `yarn`
- Use **`bunx`** instead of `npx`
- Do not introduce alternative JavaScript runtimes or package managers

This applies to all scripts, tooling, and CLI execution.

---

## Agent Utilization (Required)

Claude must actively utilize the project’s subagents when performing work.

The following agents are authoritative within their domains:
- `Backend_Expert`
- `Frontend_Expert`
- `Design_System_Manager`
- `Designer`
- `Product_Manager`
- `Quality_Assurance_Manager`

**Rules:**
- Do not reason about domain-specific concerns in isolation when an appropriate agent exists
- Delegate, consult, or align with the relevant agent(s) before making decisions
- Cross-agent collaboration is expected for non-trivial changes
- Output should reflect consensus or explicitly note tradeoffs discussed across agents

Ignoring available agents or bypassing their domain expertise is not permitted.

Agent definitions live under `/agents`.

---

## MCP Tooling (Must Be Leveraged)

MCP tooling must be used according to the capabilities and tool definitions
documented in agent_docs/01_mcp_tools_and_connectivity.md.

### MCP usage requirements (non-negotiable)
- For debugging/QA and device validation, use `rn-debugger` and/or `ios-simulator` MCP tools (no manual guessing).
- Before fixing errors or making improvements, consult up-to-date documentation via `context7` and `expo-docs` MCPs.
- For backend/data/auth tasks, use `supabase` MCP (required).

The MCP stack must be explicitly utilized wherever applicable:
[chrome-devtools, claude-in-chrome, codex-cli, context7, expo-docs, figma, github,
ios-simulator, linear-server, mcp_docker, playwright (local), playwright2 (remote),
rn-debugger, supabase, vibe_kanban, web-reader, web-search-prime, zai-mcp-server]


Claude is required to conduct thorough due diligence to understand the
capabilities and constraints of each available MCP
**before** implementing solutions.

### Design source of truth (non-negotiable)
- Visual and component validation must use the Figma MCP as the primary source.
- If Figma MCP access is unavailable or blocked, the final fallback is the
  `Figma_Screenshots/` folder.
- Do not approximate UI from memory or description when a visual source exists.

### Connectivity verification
MCP connectivity must be verified, including restarts when necessary.

See:
- `agent_docs/01_mcp_tools_and_connectivity.md`

---

## Where to Read Details (Pointers Only)

### Claude docs
- Product spec + Figma: `claude_docs/00_product_spec.md`
- SDD rules: `claude_docs/00a_sdd_rules.md`
- Domain ontology & glossary: `claude_docs/01_domain_glossary.md`
- Code conventions: `claude_docs/02_code_conventions.md`
- Service architecture: `claude_docs/03_service_architecture.md`
- Multi-tenant model: `claude_docs/04_multi_tenant_model.md`
- Chat architecture: `claude_docs/05_chat_architecture.md`
- Push notifications: `claude_docs/06_push_notifications.md`
- Security & secrets: `claude_docs/07_security_and_secrets.md`
- Running the project: `claude_docs/08_running_the_project.md`
- Running tests: `claude_docs/09_running_tests.md`

### Agent docs
- Agent operating rules: `agent_docs/00_agent_operating_rules.md`
- MCP tools & connectivity: `agent_docs/01_mcp_tools_and_connectivity.md`
- Dev workflow: `agent_docs/02_dev_workflow.md`
- Commit & PR rules: `agent_docs/03_commit_and_pr_rules.md`
- Release & CI: `agent_docs/04_release_and_ci.md`
- Incident playbook: `agent_docs/05_incident_playbook.md`

