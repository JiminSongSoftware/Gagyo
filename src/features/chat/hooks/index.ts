/**
 * Chat feature hooks.
 *
 * Exports all hooks related to chat functionality including
 * conversations, messages, sending, and real-time subscriptions.
 */

export { useConversations } from './useConversations';
export { useMessages } from './useMessages';
export { useSendMessage, useSendReply } from './useSendMessage';
export type { SendMessageState, SendReplyState } from './useSendMessage';
export {
  useMessageSubscription,
  useConversationListSubscription,
} from './useMessageSubscription';
export { appendMessage, updateMessage, removeMessage } from './useMessages';
