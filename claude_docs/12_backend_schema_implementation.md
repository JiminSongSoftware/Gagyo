---
tags: [backend, sdd, schema, supabase, rls, multi-tenant]
---

# Backend Schema Implementation SDD

## WHAT

Complete Supabase schema implementation covering all entities from the domain glossary (`claude_docs/01_domain_glossary.md`) with comprehensive Row Level Security (RLS) policies enforcing strict tenant isolation.

**Scope:**
- All 18 domain tables (tenants, users, memberships, zones, small_groups, ministries, ministry_memberships, conversations, conversation_participants, messages, event_chat_exclusions, prayer_cards, prayer_card_recipients, pastoral_journals, pastoral_journal_comments, notifications, device_tokens, attachments)
- Helper functions for RLS policy support
- Comprehensive RLS policies for all tables
- JWT claims configuration for tenant context
- Seed data for development/testing

**Out of Scope:**
- Edge Functions (future phases)
- Storage bucket policies (future phases)
- Real-time subscriptions (future phases)

---

## WHY

**Business Problem:**
Application features cannot be implemented without a data foundation. The schema must exist first to support all product functionality (chat, prayer, pastoral journals, notifications).

**Technical Rationale:**
- **Tenant isolation at database level**: RLS policies ensure data security regardless of application bugs
- **Single source of truth**: Database schema reflects domain ontology exactly
- **Testability**: RLS can be tested independently of application code
- **Performance**: Indexes and constraints optimized for multi-tenant queries

**Security Posture:**
- Cross-tenant data access is impossible at the database level
- Role-based access enforced for pastoral journals (sensitive data)
- Event Chat exclusions handled securely in RLS

---

## HOW

### Migration Strategy

**File Structure:**
```
supabase/
├── migrations/
│   ├── 00000000000000_initial_schema.sql      (tables, indexes, triggers, helper functions)
│   ├── 00000000000001_rls_policies.sql       (RLS enable + policies)
│   └── 00000000000002_seed_data.sql          (development data)
└── config.toml
```

**Execution Order (dependency-respecting):**

1. **Helper Functions** - `update_updated_at_column()`, `get_user_membership()`, `get_user_role()`, `has_role()`
2. **Core Tables** - `tenants`, `users`
3. **Organizational Tables** - `memberships`, `zones`, `small_groups`, `ministries`, `ministry_memberships`
4. **Communication Tables** - `conversations`, `conversation_participants`, `messages`, `event_chat_exclusions`
5. **Prayer Tables** - `prayer_cards`, `prayer_card_recipients`
6. **Pastoral Tables** - `pastoral_journals`, `pastoral_journal_comments`
7. **Notification Tables** - `notifications`, `device_tokens`
8. **Attachment Tables** - `attachments`
9. **RLS Policies** - All policies applied after schema exists

### Table Creation Order (Dependency Graph)

```
tenants ───────┬──► memberships ──► ministry_memberships
               │                 │
users ─────────┘                 │
                                 │
zones ────────► small_groups ────┘
               │
               └──► pastoral_journals ──► pastoral_journal_comments

ministries ────► conversations ──► conversation_participants
               │                 │
               │                 └──► messages ──► event_chat_exclusions
               │                                │
               └────────────────────────────────┴──► attachments

memberships ───► prayer_cards ──► prayer_card_recipients ─┐
                                                        │
tenants ─────────┴──► notifications ◄────────────────────┘
                      │
users ────────────────┴──► device_tokens
```

### Helper Functions

**`update_updated_at_column()`**
- Trigger function to auto-update `updated_at` timestamps
- Applied to all tables with `updated_at` column

**`get_user_membership(p_tenant_id UUID)`**
- Returns the current user's membership ID for a tenant
- Used in RLS policies to reference the calling user's membership
- SECURITY DEFINER to read memberships table

**`get_user_role(p_tenant_id UUID)`**
- Returns the current user's role for a tenant
- Used in role-based RLS policies
- SECURITY DEFINER to read memberships table

**`has_role(p_tenant_id UUID, p_min_role TEXT)`**
- Checks if user has at least the specified role level
- Implements role hierarchy: member < small_group_leader < zone_leader < pastor < admin
- Used in admin-only policies and role hierarchy checks

### RLS Policy Patterns

**Tenant-scoped tables (most tables):**
- SELECT: Users can view if they have active membership in tenant
- INSERT: Users can insert if they have active membership and ownership/constraints met
- UPDATE: Users can update own records; admins can update any in tenant
- DELETE: Users can delete own records; admins can delete any in tenant

**Role-based tables (pastoral_journals):**
- SELECT: Different visibility based on role (member: own drafts, leader: own group, zone_leader: zone groups, pastor/admin: all)
- UPDATE: Status transitions restricted by role (author: draft→submitted, zone_leader: submitted→zone_reviewed, pastor: zone_reviewed→pastor_confirmed)

**Visibility-scoped tables (prayer_cards):**
- SELECT: Author can always see; church_wide = all members; individual = recipients only; small_group = group members only

**Event Chat exclusions (messages):**
- SELECT: Messages with `is_event_chat=true` are filtered out for excluded memberships
- Implemented via `NOT EXISTS` subquery to `event_chat_exclusions`

**Global tables (users, device_tokens):**
- SELECT/INSERT/UPDATE/DELETE: Users can only access their own records

### JWT Claims Configuration

**Option A: Auth Hook (Preferred)**
Create auth hook function to inject `tenant_id` and `role` into JWT on token generation:

```sql
CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_membership record;
BEGIN
  claims := event->'claims';

  -- Get user's active membership (if any)
  SELECT tenant_id, role INTO user_membership
  FROM memberships
  WHERE user_id = (event->>'user_id')::uuid
    AND status = 'active'
  LIMIT 1;

  IF user_membership IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_membership.tenant_id::text));
    claims := jsonb_set(claims, '{role}', to_jsonb(user_membership.role));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Configure hook in Supabase Dashboard: Auth → JWT Hooks → `custom_access_token_hook`

**Option B: Client-Side Context (Fallback)**
- Store active `tenant_id` in local storage after tenant selection
- Pass `tenant_id` as query parameter or header in API requests
- Validate tenant access on each request using `get_user_membership()` function

**Claims Format:**
```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "tenant_id": "uuid",
  "user_role": "member|small_group_leader|zone_leader|pastor|admin"
}
```

### Seed Data Requirements

**Development seed data includes:**
- Test tenant (`Test Church`, slug: `test-church`)
- Test users (requires Supabase Auth coordination):
  - Admin user
  - Pastor user
  - Zone leader user
  - Small group leader user
  - Member user
- Test zones and small groups
- Test ministries
- Test conversations (one of each type)
- Test prayer cards (one of each scope)
- Test pastoral journal

**Note:** Auth users must be created via Supabase Auth CLI or dashboard before membership records can reference them.

---

## Test Implications

### Integration Tests (`__tests__/integration/rls-policies.test.ts`)

**Purpose:** Verify RLS policies enforce tenant isolation and role-based access correctly.

**Test Coverage:**

| Suite | Positive Cases | Negative Cases |
|-------|----------------|----------------|
| Tenants | View own tenants, admins can update | Cannot view other tenants, non-admins cannot update |
| Memberships | View in tenant, admins can manage | Cannot view other tenant memberships |
| Messages | View accessible conversations, send to accessible | Cannot view other tenant messages, Event Chat exclusions work |
| Prayer Cards | View by scope (author/church-wide/individual/group) | Individual: non-recipients blocked, Group: non-members blocked |
| Pastoral Journals | Role-based view (leaders see group, zone leaders see zone) | Zone leaders cannot see other zones, members cannot see any |
| Device Tokens | Manage own tokens | Cannot view others' tokens |

**Test Setup:**
- Use Supabase MCP to create test database state
- Create test tenants, users, memberships with various roles
- Execute queries with different user contexts (`SET LOCAL auth.uid()`)
- Verify results match expectations (empty results for denied access)

**Execution:**
```bash
bun test __tests__/integration/rls-policies.test.ts
```

---

## Figma References

This schema implementation enables the following features defined in `claude_docs/00_product_spec.md`:

- **Chat System** - `conversations`, `messages`, `conversation_participants`, `event_chat_exclusions` tables
- **Prayer System** - `prayer_cards`, `prayer_card_recipients` tables with scoped visibility
- **Pastoral Care** - `pastoral_journals`, `pastoral_journal_comments` tables with role-based access
- **Notifications** - `notifications`, `device_tokens` tables for push notifications
- **Multi-tenancy** - `tenants`, `memberships`, `zones`, `small_groups`, `ministries` tables

For UI/UX context, see the Figma designs linked in the product spec.

---

## Migration File References

This specification is implemented by the following migration files:

| Migration | Purpose |
|-----------|---------|
| `00000000000000_initial_schema.sql` | All tables, indexes, triggers, helper functions |
| `00000000000001_rls_policies.sql` | RLS enable on all tables + all policies |
| `00000000000002_seed_data.sql` | Development/test data |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-04 | Claude | Initial SDD for backend schema implementation |
