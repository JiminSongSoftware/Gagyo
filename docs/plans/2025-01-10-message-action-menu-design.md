# Message Action Menu & Thread Reply Design

**Date:** 2025-01-10
**Status:** Design Complete
**Related:** Issue #TBD

## Overview

Add tap-to-action functionality to chat messages, allowing users to:
1. Reply in thread (dedicated thread view)
2. Quote in reply (inline quote in composer)
3. Copy text (plain message to clipboard)

Inspired by Google Chat's tap interaction model.

---

## 1. Tap Gesture & Visual Highlight

**Trigger:** Short tap on any message bubble

**Visual State:**

| Element | Behavior |
|---------|----------|
| Selected message | No blur, subtle highlight/border indicator |
| Other messages | Dimmed with `backdrop-filter: blur(2px)`, opacity ~40-50% |
| Action menu | Slides up simultaneously (spring animation) |

**Dismiss:**
- Tap outside menu (in blurred area)
- Tap the same message again
- Both remove blur and hide menu

---

## 2. Action Menu (Bottom Sheet)

**Layout:** Bottom sheet sliding from bottom

**Menu Options:**

| Option | Icon (Phosphor) | Action |
|--------|-----------------|--------|
| Reply in thread | `ChatCircle` | Navigate to `/chat/thread/[id]` |
| Quote in reply | `ArrowUUpLeft` | Insert quote in composer |
| Copy text | `Copy` | Copy plain text to clipboard |

**Visual Design:**
- White/dark background with rounded top corners (16-20px)
- Each item: Icon (24px) + Label (16-17px)
- Safe area padding at bottom
- Dismissible via drag handle or tap outside

---

## 3. Reply in Thread Flow

**Navigation:** `router.push(/chat/thread/[messageId])`

**Screen Layout (top to bottom):**

1. **Header**
   - Left: Back arrow
   - Center: "Thread" + parent channel name (secondary)
   - Right: Optional settings

2. **Parent Message** (sticky top)
   - Full message with avatar, name, timestamp
   - Distinct background/border
   - Always visible (non-collapsible)

3. **Thread Replies List**
   - Chronological (oldest first)
   - Standard MessageBubble component
   - Empty state: "No replies yet. Be the first!"

4. **Message Input** (bottom, always visible)
   - Posts to thread only (parent_id = selected message)
   - Placeholder: "Reply in thread..."

**Behavior:**
- Real-time subscription for new replies
- Parent message reply_count updates live
- Back button returns to parent channel

---

## 4. Quote in Reply Flow

**Trigger:** "Quote in reply" from action menu

**Behavior:**
- No navigation (stay on current channel)
- Action menu dismisses automatically
- Quote preview appears ABOVE input field

**Quote Preview Layout:**

```
┌─────────────────────────────────────┐
│ [Avatar] John Doe         [✕]      │  ← Quote preview block
│ This is the original message...    │     (muted bg, rounded)
├─────────────────────────────────────┤
│ Type your message...                │  ← Input field
└─────────────────────────────────────┘
```

**Components:**
- Background: Muted color (`#f5f5f5` / `#2a2a2a`)
- Left: Avatar (32px) + display name
- Center: Truncated message (1-2 lines + ellipsis)
- Right: Close button (✕, 24px hit area)

**Composer:**
- Keyboard opens, cursor focuses in input
- User types below quote preview

**Dismiss Quote:**
- Tap ✕ to remove quote preview
- Composer returns to normal

**Sending:**
- Message posted to main channel (NOT a thread)
- Sent message includes quoted reference visually
- Only one quote at a time (new quote replaces existing)

---

## 5. Copy Text Behavior

**Trigger:** "Copy text" from action menu

**Behavior:**
1. Copy plain message text to clipboard (no sender, no timestamp)
2. Action menu dismisses
3. Toast: "Copied to clipboard" (2 seconds)

**Edge Cases:**
- Empty message → "Nothing to copy" toast
- Long messages → Copy full text (no truncation)
- Attachments → Copy text only

---

## 6. Component Architecture

```
MessageList.tsx
├── MessageBubble.tsx (MODIFY: add onPress)
│   └── onPress → show message action menu
├── MessageActionSheet.tsx (NEW)
│   ├── Blur overlay
│   ├── Bottom sheet with 3 options
│   └── Icon + Label per option
├── ThreadView.tsx (NEW - /chat/thread/[id])
│   ├── ThreadHeader
│   ├── ParentMessage (sticky)
│   ├── ThreadRepliesList
│   └── MessageInput
└── MessageInput.tsx (MODIFY)
    └── QuotePreview attachment support
```

**State Management:**
- Selected message: Local component state
- Quote attachment: Lift to MessageList/ChatScreen
- Thread navigation: React Router

---

## 7. i18n Keys (en/ko)

```json
{
  "chat": {
    "message": {
      "replyInThread": "Reply in thread",
      "quoteInReply": "Quote in reply",
      "copyText": "Copy text",
      "copied": "Copied to clipboard",
      "nothingToCopy": "Nothing to copy"
    },
    "thread": {
      "title": "Thread",
      "inputPlaceholder": "Reply in thread...",
      "noReplies": "No replies yet. Be the first!"
    }
  }
}
```

---

## 8. Edge Cases & Considerations

| Scenario | Behavior |
|----------|----------|
| Message with existing thread | Show reply count: "Reply in thread (3)" |
| Own messages | All options available |
| System messages | Hide action menu entirely |
| Deleted messages | Action menu unavailable |
| Quote + Navigate away | Clear quote preview (or persist - TBD) |
| Keyboard visible | Action sheet positioned above keyboard |
| Accessibility | Screen reader announcements, focus management |

---

## 9. Implementation Checklist

- [ ] Add `onPress` handler to MessageBubble
- [ ] Create MessageActionSheet component with blur overlay
- [ ] Create ThreadView screen at `/chat/thread/[id]`
- [ ] Add quote preview to MessageInput
- [ ] Implement clipboard copy with toast feedback
- [ ] Add i18n keys for en/ko
- [ ] Update database schema if needed (parent_id exists)
- [ ] Add real-time subscription for thread replies
- [ ] Test with screen reader
- [ ] Test keyboard interaction

---

## 10. Open Questions

1. **Quote persistence:** Should quote preview persist when navigating away from channel?
2. **Thread reply notifications:** Should thread replies generate push notifications?
3. **Thread discovery:** How do users discover existing threads? (reply count badge exists)

---

## References

- Google Chat message actions (inspiration)
- Figma screenshots: `Figma_Screenshots/Chat_flow*.png`
- Thread architecture: `claude_docs/16_thread_architecture.md`
