I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

# Event Chat Feature: Implementation Plan

## Observations

The Event Chat feature infrastructure is **already implemented at the database level**: the `event_chat_exclusions` table exists, RLS policies enforce visibility correctly, and the `is_event_chat` boolean field is present on messages. The `MessageBubble` component already displays an eye emoji indicator for Event Chat messages (sender only). However, **critical gaps remain**: no SDD spec exists, the `useSendMessage` hook doesn't support exclusions, there's no UI for selecting excluded users, validation logic is missing, and comprehensive tests haven't been written. The domain ontology correctly defines `EventChatExclusion` as an entity with proper invariants.

## Approach

Following the **SDD → TDD → DDD** workflow mandated by `CLAUDE.md`, we'll first create a detailed SDD specification expanding the existing Event Chat section in `file:claude_docs/05_chat_architecture.md`. Next, we'll write integration tests for RLS enforcement and E2E tests for Event Chat scenarios (TDD). Then, we'll extend the `useSendMessage` hook to accept `excludedMembershipIds`, create a `EventChatSelector` UI component (modal/sheet pattern), implement client-side validation (cannot exclude self, max 5 users, must be conversation members), and wire everything together. This approach ensures tenant isolation, follows existing patterns (Tamagui components, i18n, Jotai/Zustand state), and leverages the `supabase` MCP for all backend operations.

---

## Implementation Steps

### 1. SDD Specification: Expand Event Chat Documentation

**Objective**: Create comprehensive Event Chat specification in `file:claude_docs/05_chat_architecture.md`

**Subagents**: Product_Manager, Backend_Expert, Frontend_Expert

**Tasks**:

1. **Expand Event Chat Section** in `file:claude_docs/05_chat_architecture.md`:
   - Add detailed **Feature Requirements** subsection:
     - Use case: Planning surprise events without subject knowing
     - Sender can select 1-5 users to exclude from seeing the message
     - Excluded users never see the message in any view (list, detail, search, notifications)
     - Only sender sees visual indicator (eye emoji already implemented)
     - Exclusions are immutable once message is sent
   
   - Add **Validation Rules** subsection:
     - Cannot exclude yourself (sender)
     - Maximum 5 excluded users per message
     - Excluded users must be active participants in the conversation
     - Validation enforced at both client and database levels
   
   - Add **UI Flow** subsection:
     - User taps "Event Chat" button in message input area
     - Modal/sheet opens showing list of conversation participants
     - User selects 1-5 members to exclude (multi-select with checkboxes)
     - Selected count displayed (e.g., "2 of 5 selected")
     - "Send Event Chat" button replaces normal "Send" button
     - After sending, input returns to normal mode
   
   - Add **API Contract** subsection:
     ```typescript
     // Message insert with Event Chat
     {
       tenant_id: uuid,
       conversation_id: uuid,
       sender_id: uuid,
       content: string,
       content_type: 'text',
       is_event_chat: true  // Set to true for Event Chat
     }
     
     // Separate insert for exclusions (after message created)
     event_chat_exclusions: [
       { message_id: uuid, excluded_membership_id: uuid },
       ...
     ]
     ```
   
   - Add **Test Scenarios** subsection:
     - **Integration Tests**:
       - RLS policy blocks excluded user from seeing message
       - RLS policy allows non-excluded users to see message
       - Sender can always see their own Event Chat message
       - Cross-tenant isolation (User A tenant cannot see User B tenant Event Chat)
     - **E2E Tests**:
       - User A sends Event Chat excluding User B
       - User B logs in and cannot see the message
       - User C (not excluded) logs in and sees the message
       - Sender sees eye emoji indicator on their message
       - Excluded user count validation (max 5)
       - Cannot exclude self validation

2. **Update Domain Glossary** (if needed):
   - Verify `EventChatExclusion` entity definition is complete (already exists, lines 284-304 in `file:claude_docs/01_domain_glossary.md`)
   - No changes needed; definition is comprehensive

3. **Link to Figma**:
   - Reference existing Figma link in `file:claude_docs/00_product_spec.md` (line 123): https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=202-1163

**Exit Criteria**:
- Event Chat section in `file:claude_docs/05_chat_architecture.md` includes all subsections above
- Validation rules are explicit and testable
- UI flow is detailed enough for Frontend_Expert to implement
- API contract matches existing schema structure
- Test scenarios cover positive and negative cases

---

### 2. TDD: Write Integration Tests for RLS Enforcement

**Objective**: Create integration tests verifying Event Chat RLS policies work correctly

**Subagents**: Backend_Expert, Quality_Assurance_Manager

**MCPs Used**: `supabase` MCP for database operations and RLS testing

**Tasks**:

1. **Create Test File**: `file:__tests__/integration/event-chat-rls.test.ts`

2. **Test Setup**:
   - Create two test users (User A, User B) in same tenant
   - Create one test user (User C) in different tenant
   - Create a small group conversation with User A and User B as participants
   - User A sends an Event Chat message excluding User B

3. **Write RLS Tests**:
   ```typescript
   describe('Event Chat RLS Policies', () => {
     it('should allow sender to see their own Event Chat message', async () => {
       // User A queries messages
       // Assert: Event Chat message is visible
     });
   
     it('should block excluded user from seeing Event Chat message', async () => {
       // User B queries messages
       // Assert: Event Chat message is NOT visible
     });
   
     it('should allow non-excluded user to see Event Chat message', async () => {
       // Create User D in same conversation (not excluded)
       // User D queries messages
       // Assert: Event Chat message is visible
     });
   
     it('should enforce tenant isolation for Event Chat', async () => {
       // User C (different tenant) queries messages
       // Assert: No messages visible (tenant isolation)
     });
   
     it('should allow viewing event_chat_exclusions for sender only', async () => {
       // User A queries event_chat_exclusions for their message
       // Assert: Exclusions visible
       // User B queries event_chat_exclusions
       // Assert: No exclusions visible (not sender)
     });
   });
   ```

4. **Test Cleanup**:
   - Delete test messages, exclusions, conversations, memberships, users
   - Use service role client for cleanup (bypasses RLS)

**Exit Criteria**:
- All RLS tests pass
- Tests verify both positive (allowed) and negative (blocked) cases
- Tests use authenticated clients (not service role) to properly test RLS
- Cleanup ensures no test data pollution

---

### 3. TDD: Write E2E Tests for Event Chat User Flow

**Objective**: Create Detox E2E tests for Event Chat UI and user interactions

**Subagents**: Frontend_Expert, Quality_Assurance_Manager

**MCPs Used**: `rn-debugger` MCP for runtime inspection, `ios-simulator` MCP for UI verification

**Tasks**:

1. **Create Test File**: `file:e2e/event-chat.test.ts`

2. **Test Helpers** (add to `file:e2e/helpers/chat-helpers.ts`):
   ```typescript
   export async function openEventChatSelector() {
     await element(by.id('event-chat-button')).tap();
     await expect(element(by.id('event-chat-selector-modal'))).toBeVisible();
   }
   
   export async function selectExcludedUser(displayName: string) {
     await element(by.id(`exclude-user-${displayName}`)).tap();
   }
   
   export async function sendEventChatMessage(content: string) {
     await element(by.id('event-chat-send-button')).tap();
     await waitForMessage(content);
   }
   ```

3. **Write E2E Tests**:
   ```typescript
   describe('Event Chat', () => {
     beforeEach(async () => {
       await completeAuthFlow(TEST_EMAIL, TEST_PASSWORD, TEST_TENANT);
       await navigateToChat();
       await openConversation('Small Group');
     });
   
     it('should open Event Chat selector when tapping Event Chat button', async () => {
       await openEventChatSelector();
       await expect(element(by.id('event-chat-selector-modal'))).toBeVisible();
     });
   
     it('should display list of conversation participants for exclusion', async () => {
       await openEventChatSelector();
       await expect(element(by.id('participant-list'))).toBeVisible();
       await expect(element(by.text('John Doe'))).toBeVisible();
       await expect(element(by.text('Jane Smith'))).toBeVisible();
     });
   
     it('should allow selecting up to 5 users for exclusion', async () => {
       await openEventChatSelector();
       await selectExcludedUser('John Doe');
       await selectExcludedUser('Jane Smith');
       await expect(element(by.text('2 of 5 selected'))).toBeVisible();
     });
   
     it('should prevent selecting more than 5 users', async () => {
       // Requires conversation with 6+ participants
       await openEventChatSelector();
       // Select 5 users
       for (let i = 0; i < 5; i++) {
         await selectExcludedUser(`User ${i}`);
       }
       // Attempt to select 6th user
       await selectExcludedUser('User 5');
       // Assert: Error message or disabled checkbox
       await expect(element(by.text('Maximum 5 users'))).toBeVisible();
     });
   
     it('should send Event Chat message and show eye indicator', async () => {
       await openEventChatSelector();
       await selectExcludedUser('John Doe');
       await element(by.id('message-text-input')).typeText('Surprise party!');
       await sendEventChatMessage('Surprise party!');
       
       // Verify message sent
       await expect(element(by.text('Surprise party!'))).toBeVisible();
       // Verify eye indicator visible (sender only)
       await expect(element(by.id('event-chat-indicator'))).toBeVisible();
     });
   
     it('should not show Event Chat message to excluded user', async () => {
       // User A sends Event Chat excluding User B
       await openEventChatSelector();
       await selectExcludedUser('User B');
       await sendEventChatMessage('Secret message');
       
       // Logout and login as User B
       await device.reloadReactNative();
       await completeAuthFlow(USER_B_EMAIL, USER_B_PASSWORD, TEST_TENANT);
       await navigateToChat();
       await openConversation('Small Group');
       
       // Assert: Message not visible
       await expect(element(by.text('Secret message'))).not.toBeVisible();
     });
   
     it('should show Event Chat message to non-excluded user', async () => {
       // User A sends Event Chat excluding User B (but not User C)
       await openEventChatSelector();
       await selectExcludedUser('User B');
       await sendEventChatMessage('Secret message');
       
       // Logout and login as User C
       await device.reloadReactNative();
       await completeAuthFlow(USER_C_EMAIL, USER_C_PASSWORD, TEST_TENANT);
       await navigateToChat();
       await openConversation('Small Group');
       
       // Assert: Message visible (no eye indicator for non-sender)
       await expect(element(by.text('Secret message'))).toBeVisible();
       await expect(element(by.id('event-chat-indicator'))).not.toBeVisible();
     });
   });
   ```

**Exit Criteria**:
- All E2E tests pass on iOS simulator
- Tests cover happy path and edge cases (max exclusions, validation)
- Tests verify excluded user cannot see message
- Tests verify non-excluded user can see message
- Tests use proper waits and assertions (no flakiness)

---

### 4. DDD: Extend useSendMessage Hook for Event Chat

**Objective**: Add Event Chat support to `file:src/features/chat/hooks/useSendMessage.ts`

**Subagents**: Frontend_Expert, Backend_Expert

**MCPs Used**: `supabase` MCP for message and exclusion inserts

**Tasks**:

1. **Update Hook Signature**:
   ```typescript
   export interface SendMessageOptions {
     content: string;
     contentType?: MessageContentType;
     excludedMembershipIds?: string[];  // NEW: For Event Chat
   }
   
   export interface SendMessageState {
     sendMessage: (options: SendMessageOptions) => Promise<MessageWithSender | null>;
     sending: boolean;
     error: Error | null;
   }
   ```

2. **Add Validation Logic**:
   ```typescript
   // Inside sendMessage function
   if (excludedMembershipIds && excludedMembershipIds.length > 0) {
     // Validate max 5 exclusions
     if (excludedMembershipIds.length > 5) {
       setError(new Error('Cannot exclude more than 5 users'));
       return null;
     }
     
     // Validate sender not in exclusion list
     if (excludedMembershipIds.includes(senderMembershipId)) {
       setError(new Error('Cannot exclude yourself'));
       return null;
     }
     
     // TODO: Validate excluded users are conversation participants
     // (requires fetching conversation participants)
   }
   ```

3. **Update Message Insert**:
   ```typescript
   const { data, error: insertError } = await supabase
     .from('messages')
     .insert({
       tenant_id: tenantId,
       conversation_id: conversationId,
       sender_id: senderMembershipId,
       content: content.trim(),
       content_type: contentType,
       is_event_chat: excludedMembershipIds && excludedMembershipIds.length > 0,  // NEW
     })
     .select(/* ... */)
     .single();
   ```

4. **Insert Event Chat Exclusions**:
   ```typescript
   // After message insert succeeds
   if (data && excludedMembershipIds && excludedMembershipIds.length > 0) {
     const exclusions = excludedMembershipIds.map(membershipId => ({
       message_id: data.id,
       excluded_membership_id: membershipId,
     }));
     
     const { error: exclusionsError } = await supabase
       .from('event_chat_exclusions')
       .insert(exclusions);
     
     if (exclusionsError) {
       // Log error but don't fail the message send
       console.error('Failed to insert event chat exclusions:', exclusionsError);
     }
   }
   ```

5. **Update Hook Tests**:
   - Add unit tests in `file:src/features/chat/hooks/__tests__/useSendMessage.test.ts`
   - Test validation logic (max 5, cannot exclude self)
   - Test Event Chat message insert with `is_event_chat: true`
   - Test exclusions insert after message creation

**Exit Criteria**:
- Hook accepts `excludedMembershipIds` parameter
- Validation logic prevents invalid exclusions
- Message insert sets `is_event_chat: true` when exclusions provided
- Exclusions inserted in separate transaction after message
- Unit tests pass for all validation scenarios

---

### 5. DDD: Create EventChatSelector UI Component

**Objective**: Build modal/sheet component for selecting excluded users

**Subagents**: Frontend_Expert, Design_System_Manager

**MCPs Used**: `figma` MCP for design reference

**Tasks**:

1. **Create Component File**: `file:src/features/chat/components/EventChatSelector.tsx`

2. **Component Structure**:
   ```typescript
   export interface EventChatSelectorProps {
     conversationId: string;
     tenantId: string;
     currentMembershipId: string;
     onConfirm: (excludedMembershipIds: string[]) => void;
     onCancel: () => void;
     visible: boolean;
   }
   
   export function EventChatSelector({
     conversationId,
     tenantId,
     currentMembershipId,
     onConfirm,
     onCancel,
     visible,
   }: EventChatSelectorProps) {
     // Implementation
   }
   ```

3. **Fetch Conversation Participants**:
   - Query `conversation_participants` table for the conversation
   - Join with `memberships` and `users` to get display names and photos
   - Filter out current user (cannot exclude self)
   - Use `supabase` MCP for query

4. **UI Implementation** (using Tamagui):
   - Use `Sheet` component from Tamagui for modal
   - Display participant list with checkboxes
   - Show selected count (e.g., "2 of 5 selected")
   - Disable checkboxes after 5 selections
   - "Confirm" button calls `onConfirm` with selected IDs
   - "Cancel" button calls `onCancel`
   - All strings use i18n (e.g., `t('chat.event_chat_selector_title')`)

5. **State Management**:
   - Use local state (useState) for selected membership IDs
   - Use Jotai atom if state needs to persist across renders

6. **Add i18n Keys**:
   - Add to `file:locales/en/chat.json`:
     ```json
     {
       "event_chat_selector_title": "Select users to exclude",
       "event_chat_selector_description": "These users won't see this message",
       "event_chat_selected_count": "{{count}} of 5 selected",
       "event_chat_max_reached": "Maximum 5 users can be excluded",
       "event_chat_confirm": "Send Event Chat",
       "event_chat_cancel": "Cancel"
     }
     ```
   - Add Korean translations to `file:locales/ko/chat.json`

7. **Create Storybook Story**: `file:src/features/chat/components/EventChatSelector.stories.tsx`
   - Story with 3 participants
   - Story with 10 participants (test max 5 selection)
   - Story with loading state
   - Story with error state

8. **Write Unit Tests**: `file:src/features/chat/components/__tests__/EventChatSelector.test.tsx`
   - Renders participant list
   - Allows selecting up to 5 users
   - Disables checkboxes after 5 selections
   - Calls `onConfirm` with selected IDs
   - Calls `onCancel` when cancel button pressed
   - Filters out current user from list

**Exit Criteria**:
- Component renders participant list with checkboxes
- Max 5 selection enforced
- Current user filtered out
- i18n used for all strings (en + ko)
- Storybook story created
- Unit tests pass

---

### 6. DDD: Integrate EventChatSelector into MessageInput

**Objective**: Wire Event Chat selector into message input flow

**Subagents**: Frontend_Expert

**Tasks**:

1. **Update MessageInput Component** (`file:src/features/chat/components/MessageInput.tsx`):
   - Add "Event Chat" button next to send button
   - Add state for Event Chat mode: `const [isEventChatMode, setIsEventChatMode] = useState(false)`
   - Add state for excluded users: `const [excludedMembershipIds, setExcludedMembershipIds] = useState<string[]>([])`
   - Add state for selector visibility: `const [selectorVisible, setSelectorVisible] = useState(false)`

2. **Add Event Chat Button**:
   ```typescript
   <Pressable
     testID="event-chat-button"
     onPress={() => setSelectorVisible(true)}
   >
     <Stack padding="$2">
       <TamaguiText fontSize="$md">👁️</TamaguiText>
     </Stack>
   </Pressable>
   ```

3. **Render EventChatSelector**:
   ```typescript
   <EventChatSelector
     conversationId={conversationId}
     tenantId={tenantId}
     currentMembershipId={currentMembershipId}
     visible={selectorVisible}
     onConfirm={(ids) => {
       setExcludedMembershipIds(ids);
       setIsEventChatMode(true);
       setSelectorVisible(false);
     }}
     onCancel={() => {
       setSelectorVisible(false);
     }}
   />
   ```

4. **Update Send Logic**:
   ```typescript
   const handleSend = async () => {
     await onSend({
       content: trimmed,
       contentType: 'text',
       excludedMembershipIds: isEventChatMode ? excludedMembershipIds : undefined,
     });
     
     // Reset Event Chat mode after send
     setIsEventChatMode(false);
     setExcludedMembershipIds([]);
   };
   ```

5. **Visual Indicator for Event Chat Mode**:
   - Show badge with excluded count when in Event Chat mode
   - Change send button color/text to indicate Event Chat
   - Add "Cancel Event Chat" button to exit mode

6. **Update MessageInput Props**:
   ```typescript
   export interface MessageInputProps {
     onSend: (options: SendMessageOptions) => Promise<void>;  // Updated
     sending: boolean;
     error: Error | null;
     conversationId: string;  // NEW
     tenantId: string;  // NEW
     currentMembershipId: string;  // NEW
     // ... other props
   }
   ```

7. **Add i18n Keys**:
   - `chat.event_chat_button`: "Event Chat"
   - `chat.event_chat_mode_active`: "Event Chat mode ({{count}} excluded)"
   - `chat.cancel_event_chat`: "Cancel Event Chat"

**Exit Criteria**:
- Event Chat button visible in message input
- Tapping button opens EventChatSelector
- Selecting users enables Event Chat mode
- Send button reflects Event Chat mode
- Sending message includes excluded membership IDs
- Mode resets after successful send

---

### 7. DDD: Update Chat Detail Screen to Use New Hook Signature

**Objective**: Update chat detail screen to pass Event Chat options to hook

**Subagents**: Frontend_Expert

**Tasks**:

1. **Update Chat Detail Screen** (`file:app/chat/[id].tsx`):
   - Pass `conversationId`, `tenantId`, `currentMembershipId` to `MessageInput`
   - Update `onSend` handler to accept `SendMessageOptions` instead of just string

2. **Example Update**:
   ```typescript
   const { sendMessage, sending, error } = useSendMessage(
     conversationId,
     tenantId,
     membershipId
   );
   
   const handleSend = async (options: SendMessageOptions) => {
     await sendMessage(options);
   };
   
   return (
     <MessageInput
       onSend={handleSend}
       sending={sending}
       error={error}
       conversationId={conversationId}
       tenantId={tenantId}
       currentMembershipId={membershipId}
     />
   );
   ```

**Exit Criteria**:
- Chat detail screen passes required props to MessageInput
- Event Chat flow works end-to-end in the app
- No TypeScript errors

---

### 8. Validation: Run Integration and E2E Tests

**Objective**: Verify all tests pass and Event Chat works correctly

**Subagents**: Quality_Assurance_Manager

**MCPs Used**: `supabase` MCP for RLS verification, `rn-debugger` MCP for debugging, `ios-simulator` MCP for E2E tests

**Tasks**:

1. **Run Integration Tests**:
   ```bash
   bun test __tests__/integration/event-chat-rls.test.ts
   ```
   - Verify all RLS tests pass
   - Check that excluded users cannot see messages
   - Check that non-excluded users can see messages

2. **Run E2E Tests**:
   ```bash
   bunx detox test e2e/event-chat.test.ts --configuration ios.sim.debug
   ```
   - Verify UI flow works correctly
   - Check validation (max 5, cannot exclude self)
   - Check excluded user cannot see message
   - Check non-excluded user can see message

3. **Manual Testing Checklist**:
   - [ ] Open chat conversation
   - [ ] Tap Event Chat button
   - [ ] Select 1-3 users to exclude
   - [ ] Send Event Chat message
   - [ ] Verify eye indicator shows on message
   - [ ] Login as excluded user
   - [ ] Verify message not visible
   - [ ] Login as non-excluded user
   - [ ] Verify message visible (no eye indicator)
   - [ ] Test max 5 exclusions validation
   - [ ] Test cannot exclude self validation
   - [ ] Test in both English and Korean locales

4. **Use rn-debugger MCP**:
   - Inspect network requests to verify `is_event_chat: true` sent
   - Inspect network requests to verify exclusions inserted
   - Check console logs for any errors

5. **Use ios-simulator MCP**:
   - Capture screenshots of Event Chat selector UI
   - Capture screenshots of eye indicator on message
   - Verify UI matches Figma design

**Exit Criteria**:
- All integration tests pass
- All E2E tests pass
- Manual testing checklist completed
- No console errors or warnings
- UI matches Figma design

---

### 9. Documentation: Update SKILL.md with Event Chat Context

**Objective**: Document Event Chat implementation for future reference

**Subagents**: Product_Manager

**Tasks**:

1. **Add Event Chat Section to `file:skills/SKILL.md`**:
   - Document Event Chat feature implementation
   - Note key decisions (max 5 exclusions, immutable exclusions, separate table)
   - Document validation rules
   - Document RLS enforcement approach
   - Note any gotchas or edge cases discovered during implementation

2. **Example Entry**:
   ```markdown
   ## Event Chat Feature
   
   **Implemented**: 2024-01-XX
   
   **Purpose**: Allow users to send messages in group chats while excluding specific members from seeing them (e.g., planning surprise events).
   
   **Key Decisions**:
   - Max 5 excluded users per message (prevents abuse)
   - Exclusions stored in separate `event_chat_exclusions` table (normalized design)
   - RLS policy enforces visibility at database level (security)
   - Exclusions are immutable once message sent (simplicity)
   - Sender cannot exclude themselves (validation)
   
   **Implementation Notes**:
   - `useSendMessage` hook extended to accept `excludedMembershipIds`
   - `EventChatSelector` component uses Tamagui Sheet for modal
   - Eye emoji indicator only visible to sender (privacy)
   - Validation enforced at both client and database levels
   
   **Testing**:
   - Integration tests verify RLS enforcement
   - E2E tests verify full user flow
   - Manual testing required for multi-user scenarios
   
   **Future Improvements**:
   - Consider allowing editing exclusions before message sent
   - Consider analytics on Event Chat usage
   - Consider notification suppression for excluded users
   ```

**Exit Criteria**:
- SKILL.md updated with Event Chat section
- Key decisions documented
- Implementation notes captured
- Testing approach documented

---

## Summary

This implementation plan delivers the Event Chat feature following the **SDD → TDD → DDD** workflow. The plan ensures:

1. **Specification First**: Detailed SDD spec created before any code
2. **Tests First**: Integration and E2E tests written before implementation
3. **Domain-Driven**: Implementation follows domain boundaries and tenant isolation
4. **MCP-First**: Uses `supabase` MCP for all backend operations, `rn-debugger` and `ios-simulator` MCPs for testing
5. **i18n Compliant**: All UI strings use i18n system (en + ko)
6. **Security**: RLS policies enforce visibility at database level
7. **Validation**: Client-side and database-level validation prevents invalid exclusions
8. **Testing**: Comprehensive integration and E2E tests ensure correctness

The feature builds on existing infrastructure (schema, RLS, MessageBubble indicator) and follows established patterns (Tamagui components, hooks, Jotai/Zustand state).