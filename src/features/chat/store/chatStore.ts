/**
 * Chat Screen State Store
 *
 * Manages state for chat screen UI interactions:
 * - Selected message for action menu
 * - Quote attachment for composer
 */

import { create } from 'zustand';
import type { MessageWithSender } from '@/types/database';

interface QuoteAttachment {
  messageId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
}

interface ChatScreenState {
  // Message action menu
  selectedMessage: MessageWithSender | null;
  setSelectedMessage: (message: MessageWithSender | null) => void;

  // Quote attachment
  quoteAttachment: QuoteAttachment | null;
  setQuoteAttachment: (quote: QuoteAttachment | null) => void;
  clearQuoteAttachment: () => void;
}

/**
 * Chat screen state store using Zustand.
 */
export const useChatStore = create<ChatScreenState>((set) => ({
  // Message action menu
  selectedMessage: null,
  setSelectedMessage: (message) => set({ selectedMessage: message }),

  // Quote attachment
  quoteAttachment: null,
  setQuoteAttachment: (quote) => set({ quoteAttachment: quote }),
  clearQuoteAttachment: () => set({ quoteAttachment: null }),
}));
