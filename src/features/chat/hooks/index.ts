/**
 * Chat feature hooks.
 *
 * Exports all hooks related to chat functionality including
 * conversations, messages, threads, sending, image upload, and real-time subscriptions.
 */

export { useConversations } from './useConversations';
export { useMessages } from './useMessages';
export { useThreadMessages } from './useThreadMessages';
export type { ThreadMessagesState } from './useThreadMessages';
export { useSendMessage, useSendReply } from './useSendMessage';
export type { SendMessageState, SendReplyState } from './useSendMessage';
export { useImageUpload } from './useImageUpload';
export type { ImageUploadState } from './useImageUpload';
export { useMediaUpload } from './useMediaUpload';
export type { MediaUploadState } from './useMediaUpload';
export { useMessageSubscription, useConversationListSubscription } from './useMessageSubscription';
export { appendMessage, updateMessage, removeMessage } from './useMessages';
export { appendThreadMessage, updateThreadMessage, removeThreadMessage } from './useThreadMessages';
