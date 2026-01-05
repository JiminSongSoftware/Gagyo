-- ============================================================================
-- Add thread_id column to messages table
-- ============================================================================
-- This migration adds a thread_id column to enable thread grouping.
--
-- The thread_id represents the root message ID of a thread (the top-level
-- message that started the conversation). For top-level messages, thread_id
-- is NULL (or could be set to their own ID depending on query patterns).
-- For replies, thread_id points to the root message of their thread.
--
-- This enables:
-- 1. Efficient querying of all messages in a thread (WHERE thread_id = ?)
-- 2. Thread-level operations and permissions
-- 3. Future support for multi-level threading if needed
--
-- See: claude_docs/05_chat_architecture.md for threading model
-- ============================================================================

-- Add thread_id column (nullable, references messages.id)
-- Using NULL for top-level messages allows efficient differentiation
ALTER TABLE messages
  ADD COLUMN thread_id UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Add index for efficient thread queries
CREATE INDEX idx_messages_thread_id ON messages(thread_id);

-- Add composite index for conversation + thread_id queries
CREATE INDEX idx_messages_conversation_thread ON messages(conversation_id, thread_id)
  WHERE thread_id IS NOT NULL;

-- ============================================================================
-- Backfill existing data
-- ============================================================================

-- Set thread_id for top-level messages (parent_id IS NULL)
-- These are thread roots - they don't have a thread_id since they ARE the thread
-- Keeping them NULL makes queries like "WHERE thread_id IS NULL" efficiently find roots

-- For replies (parent_id IS NOT NULL), set thread_id to their root ancestor
-- This handles the single-level threading model where replies point directly to root
WITH RECURSIVE thread_tree AS (
  -- Base case: replies whose parent is a top-level message
  SELECT
    id,
    parent_id,
    parent_id AS root_id
  FROM messages
  WHERE parent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM messages parent
      WHERE parent.id = messages.parent_id
        AND parent.parent_id IS NULL
    )
  UNION ALL
  -- Recursive case: for multi-level if any exist (shouldn't with current model)
  SELECT
    m.id,
    m.parent_id,
    t.root_id
  FROM messages m
  INNER JOIN thread_tree t ON m.parent_id = t.id
  WHERE m.parent_id IS NOT NULL
)
UPDATE messages m
SET thread_id = t.root_id
FROM thread_tree t
WHERE m.id = t.id;

-- Note: Top-level messages (parent_id IS NULL) keep thread_id as NULL
-- This is intentional - they represent thread roots
-- ============================================================================

-- Add comment for documentation
COMMENT ON COLUMN messages.thread_id IS 'Root message ID of the thread. NULL for top-level messages (thread roots).';

-- ============================================================================
-- End of Migration
-- ============================================================================
