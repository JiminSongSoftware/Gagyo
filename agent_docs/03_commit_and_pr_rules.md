---
tags: [git, commits, prs, standards, vibe-kanban]
---

# 03 Commit and PR Rules

## WHAT
Commit/PR formatting and content requirements.

## WHY
- Makes history readable and reviewable.
- Standardizes multi-agent collaboration.

## HOW

### Commit Message Format

```
<type>(<scope>): <summary>

WHAT:
- Brief description of what changed

WHY:
- Reason for the change
- Problem being solved

HOW:
- Implementation approach
- Key decisions made
```

### Commit Rules

1. **Summary line**
   - Imperative mood ("Add feature" not "Added feature")
   - Maximum 72 characters
   - No period at end

2. **Scope must be one of:**
   - `app` - General app changes
   - `chat` - Chat/messaging features
   - `auth` - Authentication
   - `tenant` - Multi-tenant logic
   - `push` - Push notifications
   - `api` - API/backend changes
   - `tests` - Test additions/changes
   - `docs` - Documentation
   - `ci` - CI/CD changes
   - `infra` - Infrastructure

3. **Types:**
   - `feat` - New feature
   - `fix` - Bug fix
   - `refactor` - Code refactoring
   - `test` - Test additions/changes
   - `docs` - Documentation only
   - `chore` - Maintenance tasks
   - `ci` - CI/CD changes

4. **WHAT/WHY/HOW required** for non-trivial changes

### PR Title Format

```
<Concise descriptive title> (Vibe Kanban)
```

### PR Rules

1. **Title**
   - Concise and descriptive
   - Do NOT include `(Vibe Kanban)` postfix anywhere.

2. **Body**
   - Do NOT mention vibe-kanban in body or commit details
   - Include WHAT/WHY/HOW sections
   - Link to related specs/issues
   - Include test plan

3. **Content**
   - Keep PRs focused and reviewable
   - One logical change per PR
   - Include before/after screenshots for UI changes

### Examples

#### Good Commit
```
feat(chat): add Event Chat message visibility filtering

WHAT:
- Add visibility filter for Event Chat messages
- Implement RLS policy for excluded users

WHY:
- Users need to plan events without certain members seeing messages
- Required for birthday surprise planning use case

HOW:
- Added event_chat_excluded_users column to messages
- Created RLS policy checking user exclusion
- Added client-side filtering as backup
```

#### Bad Commit
```
fixed stuff
```
