# State Management Architecture

This document defines the state management patterns using Jotai and Zustand for Gagyo, including atom organization, store patterns, and data synchronization strategies.

---

## Architecture Overview

Gagyo uses a hybrid state management approach:

| Library | Purpose | Data Type |
|---------|---------|-----------|
| **Jotai** | Feature-scoped reactive state | Server data, UI-derived state |
| **Zustand** | Global persistent state | Auth, session, preferences |
| **React Query patterns via Jotai** | Data fetching & caching | API responses |

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Components                        │
├───────────────────────────────┬─────────────────────────────────┤
│         Jotai Atoms           │       Zustand Stores            │
│   (Feature-scoped state)      │   (Global persistent state)     │
├───────────────────────────────┼─────────────────────────────────┤
│  • Chat atoms                 │  • Session store                │
│  • Prayer atoms               │  • Preferences store            │
│  • Pastoral atoms             │  • UI store (modals, toasts)    │
│  • Notification atoms         │                                 │
└───────────────────┬───────────┴─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Client                              │
│         (Real-time subscriptions + REST API)                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── atoms/
│   ├── index.ts              # Re-exports all atoms
│   ├── auth.ts               # Authentication state atoms
│   ├── tenant.ts             # Tenant context atoms
│   ├── chat/
│   │   ├── index.ts
│   │   ├── conversations.ts  # Conversation list atoms
│   │   └── messages.ts       # Message atoms (per conversation)
│   ├── prayer/
│   │   ├── index.ts
│   │   ├── cards.ts          # Prayer card atoms
│   │   └── analytics.ts      # Prayer analytics atoms
│   ├── pastoral/
│   │   ├── index.ts
│   │   └── journals.ts       # Pastoral journal atoms
│   └── notifications/
│       └── index.ts          # Notification atoms
├── stores/
│   ├── index.ts              # Re-exports all stores
│   ├── session.ts            # Auth session store
│   ├── preferences.ts        # User preferences store
│   └── ui.ts                 # UI state store
└── hooks/
    ├── useAuth.ts            # Authentication hook
    ├── useTenant.ts          # Tenant context hook
    ├── useChat.ts            # Chat-related hooks
    ├── usePrayer.ts          # Prayer-related hooks
    ├── usePastoral.ts        # Pastoral journal hooks
    └── useNotifications.ts   # Notification hooks
```

---

## Zustand Stores

### Session Store

Manages authentication state and current tenant context with persistence.

```typescript
// src/stores/session.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import type { Membership, Tenant } from '@/types/database';

interface SessionState {
  // Auth state
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Tenant context
  currentTenantId: string | null;
  currentMembership: Membership | null;
  availableTenants: Tenant[];

  // Actions
  setSession: (session: Session | null) => void;
  setCurrentTenant: (tenantId: string, membership: Membership) => void;
  setAvailableTenants: (tenants: Tenant[]) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: null,
      user: null,
      isLoading: true,
      isAuthenticated: false,
      currentTenantId: null,
      currentMembership: null,
      availableTenants: [],

      // Actions
      setSession: (session) => set({
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isLoading: false,
      }),

      setCurrentTenant: (tenantId, membership) => set({
        currentTenantId: tenantId,
        currentMembership: membership,
      }),

      setAvailableTenants: (tenants) => set({
        availableTenants: tenants,
        // Auto-select first tenant if none selected
        currentTenantId: get().currentTenantId ?? tenants[0]?.id ?? null,
      }),

      clearSession: () => set({
        session: null,
        user: null,
        isAuthenticated: false,
        currentTenantId: null,
        currentMembership: null,
        availableTenants: [],
      }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'gagyo-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist tenant selection, not session (handled by Supabase)
        currentTenantId: state.currentTenantId,
      }),
    }
  )
);
```

---

### Preferences Store

User preferences with persistence.

```typescript
// src/stores/preferences.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Locale = 'en' | 'ko';

interface NotificationPreferences {
  newMessages: boolean;
  mentions: boolean;
  prayerAnswered: boolean;
  pastoralJournal: boolean;
}

interface PreferencesState {
  // User preferences
  locale: Locale;
  notifications: NotificationPreferences;
  theme: 'light' | 'dark' | 'system';

  // Actions
  setLocale: (locale: Locale) => void;
  setNotificationPreference: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  resetPreferences: () => void;
}

const defaultNotifications: NotificationPreferences = {
  newMessages: true,
  mentions: true,
  prayerAnswered: true,
  pastoralJournal: true,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Initial state
      locale: 'en',
      notifications: defaultNotifications,
      theme: 'system',

      // Actions
      setLocale: (locale) => set({ locale }),

      setNotificationPreference: (key, value) => set((state) => ({
        notifications: { ...state.notifications, [key]: value },
      })),

      setTheme: (theme) => set({ theme }),

      resetPreferences: () => set({
        locale: 'en',
        notifications: defaultNotifications,
        theme: 'system',
      }),
    }),
    {
      name: 'gagyo-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

### UI Store

Transient UI state (modals, toasts, loading states).

```typescript
// src/stores/ui.ts
import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface Modal {
  id: string;
  type: string;
  props?: Record<string, unknown>;
}

interface UIState {
  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modals
  activeModals: Modal[];
  openModal: (type: string, props?: Record<string, unknown>) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // Global loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Keyboard
  keyboardVisible: boolean;
  setKeyboardVisible: (visible: boolean) => void;
}

let toastIdCounter = 0;
let modalIdCounter = 0;

export const useUIStore = create<UIState>((set, get) => ({
  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastIdCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => get().removeToast(id), duration);
    }

    return id;
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
  clearToasts: () => set({ toasts: [] }),

  // Modals
  activeModals: [],
  openModal: (type, props) => {
    const id = `modal-${++modalIdCounter}`;
    set((state) => ({
      activeModals: [...state.activeModals, { id, type, props }],
    }));
    return id;
  },
  closeModal: (id) => set((state) => ({
    activeModals: state.activeModals.filter((m) => m.id !== id),
  })),
  closeAllModals: () => set({ activeModals: [] }),

  // Global loading
  globalLoading: false,
  setGlobalLoading: (globalLoading) => set({ globalLoading }),

  // Keyboard
  keyboardVisible: false,
  setKeyboardVisible: (keyboardVisible) => set({ keyboardVisible }),
}));
```

---

## Jotai Atoms

### Base Atoms

```typescript
// src/atoms/auth.ts
import { atom } from 'jotai';
import { useSessionStore } from '@/stores/session';

// Derived from Zustand for Jotai interop
export const isAuthenticatedAtom = atom((get) => {
  // This is a read-only atom that bridges Zustand state
  // Access via hook instead for reactivity
  return useSessionStore.getState().isAuthenticated;
});

// Current user's membership in active tenant
export const currentMembershipAtom = atom((get) => {
  return useSessionStore.getState().currentMembership;
});
```

---

### Tenant Atoms

```typescript
// src/atoms/tenant.ts
import { atom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';
import { supabase } from '@/services/supabase';
import { useSessionStore } from '@/stores/session';
import type { Tenant, Membership } from '@/types/database';

// Current tenant ID (read from Zustand)
export const currentTenantIdAtom = atom<string | null>((get) => {
  return useSessionStore.getState().currentTenantId;
});

// Fetch user's available tenants
export const userTenantsAtom = atomWithQuery((get) => ({
  queryKey: ['tenants', useSessionStore.getState().user?.id],
  queryFn: async (): Promise<Tenant[]> => {
    const userId = useSessionStore.getState().user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('memberships')
      .select('tenant:tenants(*)')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return data?.map((m) => m.tenant as Tenant) ?? [];
  },
  enabled: !!useSessionStore.getState().user?.id,
  staleTime: 10 * 60 * 1000, // 10 minutes
}));

// Members of current tenant
export const tenantMembersAtom = atomWithQuery((get) => ({
  queryKey: ['members', useSessionStore.getState().currentTenantId],
  queryFn: async (): Promise<Membership[]> => {
    const tenantId = useSessionStore.getState().currentTenantId;
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('memberships')
      .select('*, user:users(*)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
  },
  enabled: !!useSessionStore.getState().currentTenantId,
  staleTime: 5 * 60 * 1000, // 5 minutes
}));
```

---

### Chat Atoms

```typescript
// src/atoms/chat/conversations.ts
import { atom } from 'jotai';
import { atomWithQuery, atomWithMutation } from 'jotai-tanstack-query';
import { supabase } from '@/services/supabase';
import { useSessionStore } from '@/stores/session';
import type { Conversation } from '@/types/database';

// Conversations list for current tenant
export const conversationsAtom = atomWithQuery((get) => ({
  queryKey: ['conversations', useSessionStore.getState().currentTenantId],
  queryFn: async (): Promise<Conversation[]> => {
    const tenantId = useSessionStore.getState().currentTenantId;
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
  enabled: !!useSessionStore.getState().currentTenantId,
  staleTime: 60 * 1000, // 1 minute
}));

// Selected conversation ID
export const selectedConversationIdAtom = atom<string | null>(null);

// Selected conversation (derived)
export const selectedConversationAtom = atom((get) => {
  const id = get(selectedConversationIdAtom);
  const { data: conversations } = get(conversationsAtom);
  return conversations?.find((c) => c.id === id) ?? null;
});
```

---

```typescript
// src/atoms/chat/messages.ts
import { atom } from 'jotai';
import { atomFamily, atomWithQuery, atomWithMutation } from 'jotai-tanstack-query';
import { supabase } from '@/services/supabase';
import type { Message } from '@/types/database';

// Messages atom family (one atom per conversation)
export const messagesAtomFamily = atomFamily((conversationId: string) =>
  atomWithQuery((get) => ({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:memberships(*, user:users(*))')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000, // 1 minute
  }))
);

// Optimistic message for immediate UI feedback
export const pendingMessagesAtom = atom<Map<string, Message[]>>(new Map());

// Combined messages (server + pending)
export const allMessagesAtomFamily = atomFamily((conversationId: string) =>
  atom((get) => {
    const { data: serverMessages } = get(messagesAtomFamily(conversationId));
    const pendingMap = get(pendingMessagesAtom);
    const pending = pendingMap.get(conversationId) ?? [];

    return [...(serverMessages ?? []), ...pending].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  })
);

// Send message mutation
export const sendMessageMutationAtom = atomWithMutation((get) => ({
  mutationKey: ['sendMessage'],
  mutationFn: async (params: {
    conversationId: string;
    content: string;
    contentType?: string;
    parentId?: string;
  }) => {
    const { conversationId, content, contentType = 'text', parentId } = params;
    const tenantId = useSessionStore.getState().currentTenantId;
    const membershipId = useSessionStore.getState().currentMembership?.id;

    if (!tenantId || !membershipId) {
      throw new Error('No tenant or membership context');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        sender_id: membershipId,
        content,
        content_type: contentType,
        parent_id: parentId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
}));
```

---

### Prayer Atoms

```typescript
// src/atoms/prayer/cards.ts
import { atom } from 'jotai';
import { atomWithQuery, atomWithMutation } from 'jotai-tanstack-query';
import { supabase } from '@/services/supabase';
import { useSessionStore } from '@/stores/session';
import type { PrayerCard } from '@/types/database';

// Prayer cards visible to current user
export const prayerCardsAtom = atomWithQuery((get) => ({
  queryKey: ['prayerCards', useSessionStore.getState().currentTenantId],
  queryFn: async (): Promise<PrayerCard[]> => {
    const tenantId = useSessionStore.getState().currentTenantId;
    if (!tenantId) return [];

    const { data, error } = await supabase
      .from('prayer_cards')
      .select('*, author:memberships(*, user:users(*))')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
  enabled: !!useSessionStore.getState().currentTenantId,
  staleTime: 2 * 60 * 1000, // 2 minutes
}));

// Filter atoms
export const prayerFilterAtom = atom<'all' | 'unanswered' | 'answered'>('all');

// Filtered prayer cards (derived)
export const filteredPrayerCardsAtom = atom((get) => {
  const filter = get(prayerFilterAtom);
  const { data: cards } = get(prayerCardsAtom);

  if (!cards) return [];

  switch (filter) {
    case 'answered':
      return cards.filter((c) => c.answered);
    case 'unanswered':
      return cards.filter((c) => !c.answered);
    default:
      return cards;
  }
});

// Mark prayer as answered mutation
export const answerPrayerMutationAtom = atomWithMutation((get) => ({
  mutationKey: ['answerPrayer'],
  mutationFn: async (prayerCardId: string) => {
    const { data, error } = await supabase
      .from('prayer_cards')
      .update({ answered: true, answered_at: new Date().toISOString() })
      .eq('id', prayerCardId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
}));
```

---

### Notification Atoms

```typescript
// src/atoms/notifications/index.ts
import { atom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';
import { supabase } from '@/services/supabase';
import { useSessionStore } from '@/stores/session';
import type { Notification } from '@/types/database';

// User's notifications
export const notificationsAtom = atomWithQuery((get) => ({
  queryKey: ['notifications', useSessionStore.getState().user?.id],
  queryFn: async (): Promise<Notification[]> => {
    const userId = useSessionStore.getState().user?.id;
    if (!userId) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data ?? [];
  },
  enabled: !!useSessionStore.getState().user?.id,
  staleTime: 30 * 1000, // 30 seconds
}));

// Unread count (derived)
export const unreadNotificationCountAtom = atom((get) => {
  const { data: notifications } = get(notificationsAtom);
  return notifications?.filter((n) => !n.read).length ?? 0;
});

// Has unread notifications (derived)
export const hasUnreadNotificationsAtom = atom((get) => {
  return get(unreadNotificationCountAtom) > 0;
});
```

---

## Real-Time Synchronization

### Supabase Real-Time Integration

```typescript
// src/services/realtime.ts
import { supabase } from './supabase';
import { useSessionStore } from '@/stores/session';
import { queryClient } from '@/services/queryClient';

export function setupRealtimeSubscriptions() {
  const tenantId = useSessionStore.getState().currentTenantId;
  const userId = useSessionStore.getState().user?.id;

  if (!tenantId || !userId) return;

  // Messages subscription
  const messagesChannel = supabase
    .channel(`tenant:${tenantId}:messages`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const message = payload.new;
        // Invalidate messages query for this conversation
        queryClient.invalidateQueries({
          queryKey: ['messages', message.conversation_id],
        });
        // Update conversations list (for updated_at sorting)
        queryClient.invalidateQueries({
          queryKey: ['conversations', tenantId],
        });
      }
    )
    .subscribe();

  // Notifications subscription
  const notificationsChannel = supabase
    .channel(`user:${userId}:notifications`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        // Invalidate notifications query
        queryClient.invalidateQueries({
          queryKey: ['notifications', userId],
        });
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    messagesChannel.unsubscribe();
    notificationsChannel.unsubscribe();
  };
}
```

---

### Optimistic Updates

```typescript
// src/hooks/useSendMessage.ts
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { pendingMessagesAtom, sendMessageMutationAtom } from '@/atoms/chat/messages';
import { useSessionStore } from '@/stores/session';
import { useUIStore } from '@/stores/ui';

export function useSendMessage(conversationId: string) {
  const setPendingMessages = useSetAtom(pendingMessagesAtom);
  const sendMessage = useAtomValue(sendMessageMutationAtom);
  const addToast = useUIStore((s) => s.addToast);

  return useCallback(async (content: string, parentId?: string) => {
    const membership = useSessionStore.getState().currentMembership;
    const tenantId = useSessionStore.getState().currentTenantId;

    if (!membership || !tenantId) return;

    // Create optimistic message
    const optimisticId = `pending-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      tenant_id: tenantId,
      conversation_id: conversationId,
      sender_id: membership.id,
      content,
      content_type: 'text',
      parent_id: parentId ?? null,
      is_event_chat: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      sender: { ...membership, user: useSessionStore.getState().user },
    };

    // Add to pending messages
    setPendingMessages((prev) => {
      const map = new Map(prev);
      const existing = map.get(conversationId) ?? [];
      map.set(conversationId, [...existing, optimisticMessage]);
      return map;
    });

    try {
      // Send to server
      await sendMessage.mutateAsync({ conversationId, content, parentId });

      // Remove pending message (real-time subscription will add the real one)
      setPendingMessages((prev) => {
        const map = new Map(prev);
        const existing = map.get(conversationId) ?? [];
        map.set(conversationId, existing.filter((m) => m.id !== optimisticId));
        return map;
      });
    } catch (error) {
      // Remove failed message and show error
      setPendingMessages((prev) => {
        const map = new Map(prev);
        const existing = map.get(conversationId) ?? [];
        map.set(conversationId, existing.filter((m) => m.id !== optimisticId));
        return map;
      });

      addToast({
        type: 'error',
        title: 'Failed to send message',
        message: 'Please try again',
      });
    }
  }, [conversationId, setPendingMessages, sendMessage, addToast]);
}
```

---

## Conflict Resolution

### Last-Write-Wins

For most entities, we use a simple last-write-wins strategy:

```typescript
// Real-time updates always override local state
// Server is source of truth
// Optimistic updates are discarded on conflict
```

### Merge for Drafts

For pastoral journal drafts, we preserve local edits:

```typescript
// src/hooks/usePastoralJournalDraft.ts
import { useEffect, useCallback } from 'react';
import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local draft storage
const journalDraftAtomFamily = atomWithStorage<Record<string, string>>(
  'pastoral-journal-drafts',
  {},
  {
    getItem: async (key) => {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : {};
    },
    setItem: async (key, value) => {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: async (key) => {
      await AsyncStorage.removeItem(key);
    },
  }
);

export function usePastoralJournalDraft(journalId: string) {
  const [drafts, setDrafts] = useAtom(journalDraftAtomFamily);

  const saveDraft = useCallback((content: string) => {
    setDrafts((prev) => ({ ...prev, [journalId]: content }));
  }, [journalId, setDrafts]);

  const clearDraft = useCallback(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[journalId];
      return next;
    });
  }, [journalId, setDrafts]);

  return {
    draft: drafts[journalId] ?? null,
    saveDraft,
    clearDraft,
  };
}
```

---

## Performance Considerations

### Query Invalidation Strategy

| Event | Invalidate |
|-------|------------|
| New message | `['messages', conversationId]`, `['conversations', tenantId]` |
| New notification | `['notifications', userId]` |
| Prayer answered | `['prayerCards', tenantId]` |
| Journal status change | `['pastoralJournals', tenantId]` |
| Tenant switch | All queries |

### Stale Time Guidelines

| Data Type | Stale Time | Rationale |
|-----------|------------|-----------|
| User profile | 5 min | Rarely changes |
| Tenant list | 10 min | Very stable |
| Conversations | 1 min | Updated frequently |
| Messages | 1 min | Real-time subscription handles updates |
| Prayer cards | 2 min | Moderate change frequency |
| Notifications | 30 sec | Need to be current |

---

## Testing Patterns

### Store Testing

```typescript
// __tests__/stores/session.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useSessionStore } from '@/stores/session';

describe('SessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      user: null,
      isLoading: true,
      isAuthenticated: false,
      currentTenantId: null,
      currentMembership: null,
      availableTenants: [],
    });
  });

  it('should set session and update derived state', () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.setSession(mockSession);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockSession.user);
    expect(result.current.isLoading).toBe(false);
  });
});
```

### Atom Testing

```typescript
// __tests__/atoms/chat/messages.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { messagesAtomFamily } from '@/atoms/chat/messages';

describe('messagesAtomFamily', () => {
  it('should fetch messages for conversation', async () => {
    const { result } = renderHook(
      () => useAtomValue(messagesAtomFamily('conv-123')),
      { wrapper: JotaiProvider }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toHaveLength(3); // Based on mock
  });
});
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-04 | Claude | Initial state management architecture |
