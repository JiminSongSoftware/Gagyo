# Pastoral Journal Feature Specification

## Metadata

- **Feature ID**: `pastoral-journal`
- **Status**: Draft
- **Last Updated**: 2025-01-05
- **Figma Reference**: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=156-1028
- **Parent Spec**: `claude_docs/00_product_spec.md`

---

## WHAT

### Feature Intent

The Pastoral Journal feature enables small group leaders to document weekly ministry activities and receive hierarchical feedback from zone leaders and pastors. This creates a structured communication channel for spiritual oversight and pastoral care.

### Scope

#### In Scope
- Pastoral journal creation by small group leaders/co-leaders
- Hierarchical review workflow: draft → submitted → zone_reviewed → pastor_confirmed
- Role-based visibility and actions per RLS policies
- Comment system for zone leaders and pastors
- Prayer request auto-conversion to prayer cards (optional, deferred to v2)
- Push notifications at each status transition
- Deep linking to journal details from notifications
- Multi-tenant isolation (journals never cross tenant boundaries)

#### Out of Scope
- Editing journals after submission (leaders can only edit drafts)
- Deleting journals (soft delete may be added later)
- Exporting journals to PDF
- Analytics/reporting on journal content
- SMS/email notifications (push notifications only)

### User Stories

1. **Small Group Leader**: "I want to document my group's weekly activities so my zone leader and pastor can stay informed about our ministry progress."

2. **Zone Leader**: "I want to review journals from groups in my zone and provide feedback before forwarding to the pastor."

3. **Pastor**: "I want to review journals from all groups, add my comments, and confirm them to provide spiritual oversight."

4. **Co-leader**: "I want to collaborate on pastoral journals with my lead leader, seeing and editing drafts we create together."

---

## WHY

### Constraints

#### Tenant Isolation
- All queries MUST be scoped to `tenant_id`
- Journals from different tenants must never be visible to each other
- RLS policies enforce tenant-level isolation at the database level

#### Role-Based Access Control
- Only users with `leader` or `co_leader` role can create journals
- Only users with `zone_leader` role can review and forward journals
- Only users with `pastor` or `admin` role can confirm journals
- Regular members cannot access any journals

#### Security Posture
- Leaders can only view/edit their own group's journals
- Zone leaders can only view journals from groups in their zone
- Pastors can view all journals in their tenant
- Status transitions are validated both client-side and server-side (RLS)

#### Multi-Tenant Considerations
- Each tenant has independent pastoral workflows
- No cross-tenant journal visibility or notifications
- Edge function respects tenant context when sending notifications

### Rationale

The hierarchical review workflow reflects the church's organizational structure:

1. **Small Group Level**: Leaders document frontline ministry
2. **Zone Level**: Zone leaders provide coaching and catch issues early
3. **Pastoral Level**: Pastors provide spiritual oversight and celebrate wins

This three-tier structure ensures:
- Accountability at each level
- Early intervention for concerns
- Celebrating highlights across the organization

---

## HOW

### Data Model Touchpoints

#### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `pastoral_journals` | Journal records | `id`, `tenant_id`, `small_group_id`, `author_id`, `status`, `week_start_date`, `content` |
| `pastoral_journal_comments` | Comments on journals | `id`, `tenant_id`, `pastoral_journal_id`, `author_id`, `content` |
| `small_groups` | Group metadata | `id`, `tenant_id`, `zone_id`, `name` |
| `zones` | Zone metadata | `id`, `tenant_id`, `name` |
| `memberships` | User roles | `id`, `tenant_id`, `user_id`, `small_group_id`, `zone_id`, `role` |

#### Status Enum

```typescript
type PastoralJournalStatus =
  | 'draft'           // Leader is editing
  | 'submitted'       // Leader submitted for review
  | 'zone_reviewed'   // Zone leader forwarded to pastor
  | 'pastor_confirmed'; // Pastor confirmed complete
```

#### Content Schema

```typescript
interface PastoralJournalContent {
  attendance?: {
    present: number;
    absent: number;
    newVisitors: number;
  };
  prayerRequests?: string[];
  highlights?: string[];
  concerns?: string[];
  nextSteps?: string[];
}
```

### API Boundaries

#### Queries (with RLS)

**Fetch journals for user:**
```typescript
// Leader: own group only
SELECT * FROM pastoral_journals
WHERE tenant_id = $1 AND small_group_id = $2
ORDER BY week_start_date DESC;

// Zone leader: groups in zone
SELECT * FROM pastoral_journals
WHERE tenant_id = $1 AND small_group_id IN (
  SELECT id FROM small_groups WHERE zone_id = $2
)
ORDER BY week_start_date DESC;

// Pastor/Admin: all in tenant
SELECT * FROM pastoral_journals
WHERE tenant_id = $1
ORDER BY week_start_date DESC;
```

**Fetch comments for journal:**
```typescript
SELECT c.*, m.name as author_name, m.role as author_role
FROM pastoral_journal_comments c
JOIN memberships m ON c.author_id = m.id
WHERE c.pastoral_journal_id = $1
ORDER BY c.created_at ASC;
```

#### Mutations

**Create journal:**
```typescript
INSERT INTO pastoral_journals (
  tenant_id, small_group_id, author_id,
  week_start_date, content, status
) VALUES ($1, $2, $3, $4, $5, 'draft');
```

**Update status (triggers edge function):**
```typescript
UPDATE pastoral_journals
SET status = $1, updated_at = NOW()
WHERE id = $2 AND status = $3;
```

**Add comment:**
```typescript
INSERT INTO pastoral_journal_comments (
  tenant_id, pastoral_journal_id, author_id, content
) VALUES ($1, $2, $3, $4);
```

### UI Flows

#### List View (`app/(tabs)/pastoral.tsx`)

**Role-based sections:**
- **Leader**: "My Journals" (drafts and submitted from own group)
- **Zone Leader**: "Submitted Journals" + "My Journals" (if also a leader)
- **Pastor/Admin**: "All Journals" grouped by status

**Journal card display:**
- Week start date (formatted as "Week of MMM D")
- Small group name
- Status badge with color coding
- Author name
- Comment count badge
- Chevron for navigation

**Empty states:**
- Leader: "No journals yet. Create your first journal to share your group's ministry."
- Zone Leader: "No submitted journals waiting for review."
- Pastor: "No journals requiring confirmation."

#### Detail View (`app/pastoral/[id].tsx`)

**Header section:**
- Week range (calculated from week_start_date)
- Small group name
- Author name and role badge
- Status badge
- Timestamps (created, updated)

**Content sections:**
- Attendance (present/absent/new visitors)
- Prayer requests summary
- Highlights
- Concerns
- Next steps

**Comments section:**
- Timeline of comments
- Author name, role, and timestamp
- Comment form (zone leaders and pastors only)

**Action buttons (role + status dependent):**
- Leader + Draft: "Submit for Review"
- Zone Leader + Submitted: "Add Comment & Forward to Pastor"
- Pastor + Zone Reviewed: "Add Comment & Confirm"

#### Creation Flow (`app/pastoral/create.tsx`)

**Form fields:**
- Week selector (defaults to current week)
- Attendance counters
- Prayer requests (multi-line)
- Highlights (multi-line)
- Concerns (multi-line)
- Next steps (multi-line)

**Actions:**
- "Save as Draft"
- "Cancel"

### Status Transition Logic

#### Valid Transitions

```typescript
const VALID_TRANSITIONS: Record<PastoralJournalStatus, PastoralJournalStatus[]> = {
  draft: ['submitted'],
  submitted: ['zone_reviewed'],
  zone_reviewed: ['pastor_confirmed'],
  pastor_confirmed: [], // Terminal state
};
```

#### Client-Side Validation
- Check user's role matches required role for transition
- Verify current status allows transition to new status
- Show confirmation dialog before irreversible transitions

#### Server-Side Enforcement (RLS)
- RLS policies prevent unauthorized status updates
- Edge function validates transition before sending notifications

### Edge Function Integration

**Function:** `handle-pastoral-journal-change`

**Trigger:** Called after successful status update

**Payload:**
```typescript
interface PastoralJournalChangePayload {
  journalId: string;
  tenantId: string;
  oldStatus: PastoralJournalStatus;
  newStatus: PastoralJournalStatus;
  authorId: string;
  smallGroupId: string;
}
```

**Notification mappings:**
| Old Status | New Status | Recipients | Notification Type |
|------------|------------|------------|-------------------|
| draft | submitted | Zone leaders of group's zone | `pastoral_journal_submitted` |
| submitted | zone_reviewed | All pastors in tenant | `pastoral_journal_forwarded` |
| zone_reviewed | pastor_confirmed | Original journal author | `pastoral_journal_confirmed` |

**I18n keys:**
- `pastoral.notifications.journal_submitted_title`
- `pastoral.notifications.journal_submitted_body`
- `pastoral.notifications.journal_forwarded_title`
- `pastoral.notifications.journal_forwarded_body`
- `pastoral.notifications.journal_confirmed_title`
- `pastoral.notifications.journal_confirmed_body`

---

## Test Implications

### E2E Tests (Detox)

**Scenario 1: Leader creates and submits journal**
- Login as small group leader
- Navigate to Pastoral tab
- Tap "Create Journal"
- Fill form and save as draft
- Verify draft appears in list
- Submit for review
- Verify status changes to "Submitted"

**Scenario 2: Zone leader reviews and forwards**
- Login as zone leader
- Navigate to Pastoral tab
- Open submitted journal
- Add comment
- Forward to pastor
- Verify status changes to "Zone Reviewed"

**Scenario 3: Pastor confirms journal**
- Login as pastor
- Navigate to Pastoral tab
- Open zone-reviewed journal
- Add comment
- Confirm journal
- Verify status changes to "Pastor Confirmed"

**Scenario 4: Role-based access control**
- Login as regular member
- Navigate to Pastoral tab
- Verify empty state (no access)

### Integration Tests (RLS)

**Positive tests:**
- Leader can view own group's journals
- Zone leader can view zone's journals
- Pastor can view all tenant journals

**Negative tests:**
- Leader cannot view other groups' journals
- Zone leader cannot view other zones' journals
- Member cannot view any journals
- Cross-tenant access blocked

### Unit Tests

**Hooks:**
- `usePastoralJournals`: Role-based filtering
- `useCreatePastoralJournal`: Duplicate prevention
- `useUpdatePastoralJournalStatus`: Transition validation
- `usePastoralJournalComments`: Real-time updates
- `useAddPastoralJournalComment`: Permission check

**Components:**
- `PastoralJournalList`: Renders correct sections per role
- `PastoralJournalDetail`: Shows correct actions per role/status
- `CreatePastoralJournalForm`: Validation
- `PastoralJournalCommentForm`: Submission flow

---

## Domain References

### Related Domain Concepts

- **Small Group**: `claude_docs/01_domain_glossary.md#small-group`
- **Zone**: `claude_docs/01_domain_glossary.md#zone`
- **Membership**: `claude_docs/01_domain_glossary.md#membership`
- **Role**: `claude_docs/01_domain_glossary.md#role`
- **Tenant**: `claude_docs/01_domain_glossary.md#tenant`

### Related Features

- **Push Notifications**: `claude_docs/06_push_notifications.md`
- **Multi-Tenant Model**: `claude_docs/04_multi_tenant_model.md`
- **Prayer Cards**: Similar hierarchical workflow for reference

---

## Acceptance Criteria

### AC1: Journal Creation
```gherkin
Given a small group leader is logged in
When they navigate to the Pastoral tab
And tap "Create Journal"
And fill in the journal content
And tap "Save as Draft"
Then the journal is saved with status 'draft'
And the journal appears in "My Journals" list
And only the leader and co-leader can view it
```

### AC2: Journal Submission
```gherkin
Given a small group leader has a draft journal
When they open the journal detail
And tap "Submit for Review"
And confirm the submission
Then the journal status changes to 'submitted'
And the zone leader receives a push notification
And the edge function is called with old_status='draft', new_status='submitted'
```

### AC3: Zone Leader Review
```gherkin
Given a zone leader is logged in
And there is a submitted journal from their zone
When they open the journal detail
And add a comment
And tap "Forward to Pastor"
Then the journal status changes to 'zone_reviewed'
And all pastors receive a push notification
And the comment is saved with author_id = zone leader's membership_id
```

### AC4: Pastor Confirmation
```gherkin
Given a pastor is logged in
And there is a zone-reviewed journal
When they open the journal detail
And add a comment
And tap "Confirm Journal"
Then the journal status changes to 'pastor_confirmed'
And the original author receives a push notification
And the comment is saved with author_id = pastor's membership_id
```

### AC5: Access Control
```gherkin
Given a user is not a leader, zone leader, or pastor
When they attempt to view pastoral journals
Then they see an empty state
And no API calls to pastoral_journals succeed
```

### AC6: Tenant Isolation
```gherkin
Given a user from tenant A
When they query pastoral_journals
Then results only include journals where tenant_id = A's tenant_id
And no journals from tenant B are returned
```

---

## Open Questions

1. **Prayer Request Auto-Conversion**: Should prayer requests be automatically converted to prayer cards? Decision: Deferred to v2.

2. **AI Comment Suggestions**: Should zone leaders have AI-suggested comments? Decision: Deferred to v2.

3. **Journal Editing After Submission**: Should leaders be able to edit submitted journals if recalled? Decision: Not in v1.

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-01-05 | Claude | Initial SDD creation |
