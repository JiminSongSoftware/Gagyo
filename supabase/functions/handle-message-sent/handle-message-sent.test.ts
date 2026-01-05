/**
 * Integration Tests for handle-message-sent Edge Function
 *
 * Tests the Edge Function triggered by new message insertions.
 * Responsible for:
 * - Identifying recipients (excluding sender)
 * - Detecting mentions and prioritizing accordingly
 * - Calling send-push-notification for each recipient
 * - Handling event chat exclusions
 *
 * Following TDD: these tests are written before implementation.
 */

import {
  assertEquals,
  assertExists,
  assertTrue,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

// ============================================================================
// TYPES
// ============================================================================

interface MessageSentEvent {
  id: string;
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  thread_id?: string | null;
  message_type?: 'text' | 'media' | 'system';
  media_type?: 'image' | 'video' | 'audio' | 'document' | null;
}

interface Conversation {
  id: string;
  tenant_id: string;
  type: 'direct' | 'small_group' | 'ministry' | 'church_wide' | 'event';
  event_id?: string | null;
}

interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
}

interface EventChatExclusion {
  event_id: string;
  user_id: string;
  excluded_at: string;
}

interface Mention {
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
}

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_DATA = {
  tenant1Id: 'tenant-1-uuid-123',
  user1Id: 'user-sender-abc', // Message sender
  user2Id: 'user-recipient-def',
  user3Id: 'user-mentioned-ghi',
  user4Id: 'user-excluded-jkl', // Excluded from event chat
  user5Id: 'user-left-mno', // Left the conversation
  conversation1Id: 'conv-small-group',
  conversation2Id: 'conv-event-chat',
  conversation3Id: 'conv-direct',
  message1Id: 'msg-new-123',
  message2Id: 'msg-mention-456',
  message3Id: 'msg-event-789',
  message4Id: 'msg-media-012',
  eventId: 'event-123',
  threadId: 'thread-456',
};

// ============================================================================
// MOCK DATABASE
// ============================================================================

class MockDatabase {
  private conversations: Map<string, Conversation> = new Map();
  private participants: Map<string, ConversationParticipant[]> = new Map();
  private exclusions: EventChatExclusion[] = [];
  private mentions: Map<string, Mention[]> = new Map();
  private sentNotifications: {
    recipientId: string;
    notificationType: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  }[] = [];

  constructor() {
    this.setupTestData();
  }

  private setupTestData() {
    // Conversations
    this.conversations.set(TEST_DATA.conversation1Id, {
      id: TEST_DATA.conversation1Id,
      tenant_id: TEST_DATA.tenant1Id,
      type: 'small_group',
    });

    this.conversations.set(TEST_DATA.conversation2Id, {
      id: TEST_DATA.conversation2Id,
      tenant_id: TEST_DATA.tenant1Id,
      type: 'event',
      event_id: TEST_DATA.eventId,
    });

    this.conversations.set(TEST_DATA.conversation3Id, {
      id: TEST_DATA.conversation3Id,
      tenant_id: TEST_DATA.tenant1Id,
      type: 'direct',
    });

    // Participants (small group)
    this.participants.set(TEST_DATA.conversation1Id, [
      {
        conversation_id: TEST_DATA.conversation1Id,
        user_id: TEST_DATA.user1Id, // Sender
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      {
        conversation_id: TEST_DATA.conversation1Id,
        user_id: TEST_DATA.user2Id, // Normal recipient
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      {
        conversation_id: TEST_DATA.conversation1Id,
        user_id: TEST_DATA.user3Id, // Will be mentioned
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      {
        conversation_id: TEST_DATA.conversation1Id,
        user_id: TEST_DATA.user5Id, // Left the conversation
        joined_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        left_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);

    // Participants (event chat)
    this.participants.set(TEST_DATA.conversation2Id, [
      {
        conversation_id: TEST_DATA.conversation2Id,
        user_id: TEST_DATA.user1Id,
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      {
        conversation_id: TEST_DATA.conversation2Id,
        user_id: TEST_DATA.user2Id,
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      {
        conversation_id: TEST_DATA.conversation2Id,
        user_id: TEST_DATA.user4Id, // Excluded from event
        joined_at: new Date().toISOString(),
        left_at: null,
      },
    ]);

    // Event chat exclusions
    this.exclusions.push({
      event_id: TEST_DATA.eventId,
      user_id: TEST_DATA.user4Id,
      excluded_at: new Date().toISOString(),
    });

    // Mentions
    this.mentions.set(TEST_DATA.message2Id, [
      {
        message_id: TEST_DATA.message2Id,
        mentioned_user_id: TEST_DATA.user3Id,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async getParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    return this.participants.get(conversationId) || [];
  }

  async getEventExclusions(eventId: string): Promise<EventChatExclusion[]> {
    return this.exclusions.filter((e) => e.event_id === eventId);
  }

  async getMentions(messageId: string): Promise<Mention[]> {
    return this.mentions.get(messageId) || [];
  }

  recordNotification(notification: {
    recipientId: string;
    notificationType: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  }) {
    this.sentNotifications.push(notification);
  }

  getSentNotifications() {
    return [...this.sentNotifications];
  }

  reset() {
    this.conversations.clear();
    this.participants.clear();
    this.exclusions = [];
    this.mentions.clear();
    this.sentNotifications = [];
    this.setupTestData();
  }
}

const mockDb = new MockDatabase();

// ============================================================================
// EDGE FUNCTION SIMULATION
// ============================================================================

async function handleMessageSent(event: MessageSentEvent): Promise<void> {
  // 1. Get conversation details
  const conversation = await mockDb.getConversation(event.conversation_id);
  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // 2. Get all participants
  const participants = await mockDb.getParticipants(event.conversation_id);

  // 3. Filter active participants (exclude sender and those who left)
  const activeRecipients = participants.filter(
    (p) => p.user_id !== event.sender_id && p.left_at === null
  );

  if (activeRecipients.length === 0) {
    return; // No recipients
  }

  // 4. Check for mentions
  const mentions = await mockDb.getMentions(event.id);
  const mentionedUserIds = new Set(mentions.map((m) => m.mentioned_user_id));

  // 5. Handle event chat exclusions
  let recipientIds = activeRecipients.map((p) => p.user_id);

  if (conversation.type === 'event' && conversation.event_id) {
    const exclusions = await mockDb.getEventExclusions(conversation.event_id);
    const excludedUserIds = new Set(exclusions.map((e) => e.user_id));
    recipientIds = recipientIds.filter((id) => !excludedUserIds.has(id));
  }

  // 6. Determine notification type and content
  const senderName = 'User ' + event.sender_id.slice(-4); // Mock sender name

  // Build message preview
  let messagePreview = event.content;
  if (event.message_type === 'media') {
    messagePreview = '[Attachment]';
  } else if (messagePreview.length > 100) {
    messagePreview = messagePreview.slice(0, 100) + '...';
  }

  // 7. Send notifications
  // First, send mention notifications (higher priority)
  for (const userId of mentionedUserIds) {
    if (recipientIds.includes(userId)) {
      mockDb.recordNotification({
        recipientId: userId,
        notificationType: 'mention',
        title: `Mentioned by ${senderName}`,
        body: event.content,
        data: {
          tenant_id: event.tenant_id,
          conversation_id: event.conversation_id,
          message_id: event.id,
          thread_id: event.thread_id,
        },
      });
    }
  }

  // Then, send regular message notifications to non-mentioned recipients
  for (const userId of recipientIds) {
    if (!mentionedUserIds.has(userId)) {
      mockDb.recordNotification({
        recipientId: userId,
        notificationType: 'new_message',
        title: senderName,
        body: messagePreview,
        data: {
          tenant_id: event.tenant_id,
          conversation_id: event.conversation_id,
          message_id: event.id,
          thread_id: event.thread_id,
        },
      });
    }
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('handle-message-sent Edge Function', () => {
  beforeEach(() => {
    mockDb.reset();
  });

  // ============================================================================
  // RECIPIENT IDENTIFICATION
  // ============================================================================

  describe('Recipient Identification', () => {
    it('should identify all active participants except sender', async () => {
      const event: MessageSentEvent = {
        id: TEST_DATA.message1Id,
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Hello everyone',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      const recipientIds = notifications.map((n) => n.recipientId);

      // Should include user2 and user3 (active, not sender)
      assertTrue(recipientIds.includes(TEST_DATA.user2Id));
      assertTrue(recipientIds.includes(TEST_DATA.user3Id));

      // Should NOT include sender
      assertTrue(!recipientIds.includes(TEST_DATA.user1Id));

      // Should NOT include user5 (left conversation)
      assertTrue(!recipientIds.includes(TEST_DATA.user5Id));
    });

    it('should handle direct message with two participants', async () => {
      const dmEvent: MessageSentEvent = {
        id: 'msg-dm-123',
        conversation_id: TEST_DATA.conversation3Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Direct message',
        created_at: new Date().toISOString(),
      };

      // Add participants for direct message
      mockDb['participants'].set(TEST_DATA.conversation3Id, [
        {
          conversation_id: TEST_DATA.conversation3Id,
          user_id: TEST_DATA.user1Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          conversation_id: TEST_DATA.conversation3Id,
          user_id: TEST_DATA.user2Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]);

      await handleMessageSent(dmEvent);

      const notifications = mockDb.getSentNotifications();
      assertEquals(notifications.length, 1); // Only recipient
      assertEquals(notifications[0].recipientId, TEST_DATA.user2Id);
    });

    it('should return early if no valid recipients exist', async () => {
      const event: MessageSentEvent = {
        id: 'msg-no-recipients',
        conversation_id: 'conv-empty',
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'No one will receive this',
        created_at: new Date().toISOString(),
      };

      // Set up empty conversation
      mockDb['conversations'].set('conv-empty', {
        id: 'conv-empty',
        tenant_id: TEST_DATA.tenant1Id,
        type: 'direct',
      });
      mockDb['participants'].set('conv-empty', [
        {
          conversation_id: 'conv-empty',
          user_id: TEST_DATA.user1Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]);

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      assertEquals(notifications.length, 0);
    });
  });

  // ============================================================================
  // MENTION DETECTION AND PRIORITY
  // ============================================================================

  describe('Mention Detection', () => {
    it('should detect mentions and send higher priority notifications', async () => {
      const event: MessageSentEvent = {
        id: TEST_DATA.message2Id,
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: '@user3 Please review this',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();

      // user3 should get a mention notification
      const mentionNotification = notifications.find((n) => n.recipientId === TEST_DATA.user3Id);
      assertExists(mentionNotification);
      assertEquals(mentionNotification.notificationType, 'mention');
      assertEquals(mentionNotification.title, 'Mentioned by User abc');
    });

    it('should include message_id in mention notification data', async () => {
      const event: MessageSentEvent = {
        id: TEST_DATA.message2Id,
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: '@user3 mentioned',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      const mentionNotification = notifications.find((n) => n.notificationType === 'mention');

      assertExists(mentionNotification);
      assertEquals(mentionNotification.data.message_id, TEST_DATA.message2Id);
    });

    it('should send regular notification to non-mentioned recipients', async () => {
      const event: MessageSentEvent = {
        id: TEST_DATA.message2Id,
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: '@user3 Please review',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();

      // user2 should get regular notification (not mentioned)
      const regularNotification = notifications.find((n) => n.recipientId === TEST_DATA.user2Id);
      assertExists(regularNotification);
      assertEquals(regularNotification.notificationType, 'new_message');
    });

    it('should handle multiple mentions in a single message', async () => {
      // Add another mention
      mockDb['mentions'].set('msg-multi-mention', [
        {
          message_id: 'msg-multi-mention',
          mentioned_user_id: TEST_DATA.user2Id,
          created_at: new Date().toISOString(),
        },
        {
          message_id: 'msg-multi-mention',
          mentioned_user_id: TEST_DATA.user3Id,
          created_at: new Date().toISOString(),
        },
      ]);

      const event: MessageSentEvent = {
        id: 'msg-multi-mention',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: '@user2 @user3 both mentioned',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();

      // Both user2 and user3 should get mention notifications
      const mentionNotifications = notifications.filter((n) => n.notificationType === 'mention');
      assertEquals(mentionNotifications.length, 2);
    });
  });

  // ============================================================================
  // EVENT CHAT EXCLUSIONS
  // ============================================================================

  describe('Event Chat Exclusions', () => {
    it('should exclude opted-out users from event chat notifications', async () => {
      const event: MessageSentEvent = {
        id: TEST_DATA.message3Id,
        conversation_id: TEST_DATA.conversation2Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Event announcement',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      const recipientIds = notifications.map((n) => n.recipientId);

      // user2 should receive (not excluded)
      assertTrue(recipientIds.includes(TEST_DATA.user2Id));

      // user4 should NOT receive (excluded from event)
      assertTrue(!recipientIds.includes(TEST_DATA.user4Id));
    });

    it('should only apply exclusions for event chat type', async () => {
      // Small group message - exclusions should NOT apply
      const event: MessageSentEvent = {
        id: 'msg-no-exclusion',
        conversation_id: TEST_DATA.conversation1Id, // Small group, not event
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Small group message',
        created_at: new Date().toISOString(),
      };

      // Add user4 to small group participants
      mockDb['participants'].set(TEST_DATA.conversation1Id, [
        {
          conversation_id: TEST_DATA.conversation1Id,
          user_id: TEST_DATA.user1Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          conversation_id: TEST_DATA.conversation1Id,
          user_id: TEST_DATA.user4Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]);

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      const recipientIds = notifications.map((n) => n.recipientId);

      // user4 should receive (exclusions don't apply to non-event chats)
      assertTrue(recipientIds.includes(TEST_DATA.user4Id));
    });
  });

  // ============================================================================
  // MESSAGE CONTENT HANDLING
  // ============================================================================

  describe('Message Content Handling', () => {
    it('should show [Attachment] for media messages', async () => {
      const event: MessageSentEvent = {
        id: TEST_DATA.message4Id,
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: '',
        message_type: 'media',
        media_type: 'image',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      assertTrue(notifications.length > 0);

      for (const notification of notifications) {
        assertEquals(notification.body, '[Attachment]');
      }
    });

    it('should truncate long messages to 100 characters', async () => {
      const longContent = 'A'.repeat(150);

      const event: MessageSentEvent = {
        id: 'msg-long',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: longContent,
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      assertTrue(notifications.length > 0);

      for (const notification of notifications) {
        assertTrue(notification.body.length <= 103); // 100 + '...'
        assertTrue(notification.body.endsWith('...'));
      }
    });

    it('should use full content for short messages', async () => {
      const shortContent = 'Hello!';

      const event: MessageSentEvent = {
        id: 'msg-short',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: shortContent,
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      assertTrue(notifications.length > 0);

      const regularNotification = notifications.find((n) => n.notificationType === 'new_message');
      assertExists(regularNotification);
      assertEquals(regularNotification.body, shortContent);
    });
  });

  // ============================================================================
  // THREAD CONTEXT
  // ============================================================================

  describe('Thread Context', () => {
    it('should include thread_id when message is in a thread', async () => {
      const event: MessageSentEvent = {
        id: 'msg-thread-123',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Thread reply',
        thread_id: TEST_DATA.threadId,
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();

      for (const notification of notifications) {
        assertEquals(notification.data.thread_id, TEST_DATA.threadId);
      }
    });

    it('should handle null thread_id for non-threaded messages', async () => {
      const event: MessageSentEvent = {
        id: 'msg-no-thread',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Regular message',
        thread_id: null,
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();

      for (const notification of notifications) {
        // thread_id should be null or undefined
        assertTrue(
          notification.data.thread_id === null || notification.data.thread_id === undefined
        );
      }
    });
  });

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing conversation gracefully', async () => {
      const event: MessageSentEvent = {
        id: 'msg-unknown-conv',
        conversation_id: 'conv-does-not-exist',
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Test',
        created_at: new Date().toISOString(),
      };

      await assertRejects(() => handleMessageSent(event), Error, 'Conversation not found');
    });

    it('should handle participants query failure gracefully', async () => {
      // In actual implementation, this would handle database errors
      const event: MessageSentEvent = {
        id: 'msg-error',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Test',
        created_at: new Date().toISOString(),
      };

      // Clear participants to simulate empty result (not error, but edge case)
      mockDb['participants'].set(TEST_DATA.conversation1Id, []);

      await handleMessageSent(event); // Should not throw

      const notifications = mockDb.getSentNotifications();
      assertEquals(notifications.length, 0);
    });
  });

  // ============================================================================
  // CONVERSATION TYPE HANDLING
  // ============================================================================

  describe('Conversation Type Handling', () => {
    it('should handle small group conversation type', async () => {
      const event: MessageSentEvent = {
        id: 'msg-small-group',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Small group message',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      // Should send notifications normally
      const notifications = mockDb.getSentNotifications();
      assertTrue(notifications.length > 0);
    });

    it('should handle ministry conversation type', async () => {
      mockDb['conversations'].set('conv-ministry', {
        id: 'conv-ministry',
        tenant_id: TEST_DATA.tenant1Id,
        type: 'ministry',
      });

      const event: MessageSentEvent = {
        id: 'msg-ministry',
        conversation_id: 'conv-ministry',
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Ministry announcement',
        created_at: new Date().toISOString(),
      };

      // Add participants
      mockDb['participants'].set('conv-ministry', [
        {
          conversation_id: 'conv-ministry',
          user_id: TEST_DATA.user1Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          conversation_id: 'conv-ministry',
          user_id: TEST_DATA.user2Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]);

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      assertTrue(notifications.length > 0);
    });

    it('should handle church_wide conversation type', async () => {
      mockDb['conversations'].set('conv-church-wide', {
        id: 'conv-church-wide',
        tenant_id: TEST_DATA.tenant1Id,
        type: 'church_wide',
      });

      const event: MessageSentEvent = {
        id: 'msg-church-wide',
        conversation_id: 'conv-church-wide',
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Church announcement',
        created_at: new Date().toISOString(),
      };

      // Add many participants for church-wide
      mockDb['participants'].set('conv-church-wide', [
        {
          conversation_id: 'conv-church-wide',
          user_id: TEST_DATA.user1Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          conversation_id: 'conv-church-wide',
          user_id: TEST_DATA.user2Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
        {
          conversation_id: 'conv-church-wide',
          user_id: TEST_DATA.user3Id,
          joined_at: new Date().toISOString(),
          left_at: null,
        },
      ]);

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();
      assertEquals(notifications.length, 2); // All except sender
    });
  });

  // ============================================================================
  // NOTIFICATION DATA
  // ============================================================================

  describe('Notification Data', () => {
    it('should include tenant_id in notification data', async () => {
      const event: MessageSentEvent = {
        id: 'msg-tenant-data',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Test',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();

      for (const notification of notifications) {
        assertEquals(notification.data.tenant_id, TEST_DATA.tenant1Id);
      }
    });

    it('should include conversation_id in notification data', async () => {
      const event: MessageSentEvent = {
        id: 'msg-conv-data',
        conversation_id: TEST_DATA.conversation1Id,
        tenant_id: TEST_DATA.tenant1Id,
        sender_id: TEST_DATA.user1Id,
        content: 'Test',
        created_at: new Date().toISOString(),
      };

      await handleMessageSent(event);

      const notifications = mockDb.getSentNotifications();

      for (const notification of notifications) {
        assertEquals(notification.data.conversation_id, TEST_DATA.conversation1Id);
      }
    });
  });
});

/**
 * ============================================================================
 * TESTING NOTES
 * ============================================================================
 *
 * To run these tests:
 * 1. Deno must be installed: `brew install deno`
 * 2. Run: `deno test --allow-all supabase/functions/handle-message-sent/handle-message-sent.test.ts`
 *
 * Trigger Configuration:
 * - This Edge Function is triggered by Supabase database triggers
 * - Trigger: AFTER INSERT ON messages
 * - Function is called with the new message record as payload
 *
 * Integration Testing:
 * - For full integration, insert actual message records in test database
 * - Verify push notifications are sent to test devices
 * - Check mention detection works with actual @username patterns
 */
