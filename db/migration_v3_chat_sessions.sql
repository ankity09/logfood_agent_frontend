-- ============================================================
-- LogFoodAgent — Chat Sessions Migration (v3)
-- Adds tables for persisting Research Agent conversations
-- Run this against your Lakebase instance
-- ============================================================

-- Chat sessions (conversations)
-- Each session represents a conversation thread with the Research Agent
CREATE TABLE IF NOT EXISTS chat_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email    VARCHAR(255) NOT NULL,
  title         VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat messages
-- Individual messages within a session (user queries and agent responses)
CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'error')),
  content       TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'completed'
                CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Find sessions by user (for listing user's conversations)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
  ON chat_sessions(user_email);

-- Sort sessions by most recent activity
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated
  ON chat_sessions(updated_at DESC);

-- Find messages by session (for loading conversation)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session
  ON chat_messages(session_id);

-- Find pending/processing messages (for polling)
CREATE INDEX IF NOT EXISTS idx_chat_messages_pending
  ON chat_messages(status)
  WHERE status IN ('pending', 'processing');

-- ============================================================
-- HELPER FUNCTION: Auto-update updated_at on chat_sessions
-- ============================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update session timestamp when a message is added
DROP TRIGGER IF EXISTS trg_chat_message_update_session ON chat_messages;
CREATE TRIGGER trg_chat_message_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_session_timestamp();

-- ============================================================
-- CLEANUP FUNCTION: Keep only last 30 sessions per user
-- Call this periodically or after creating new sessions
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_old_chat_sessions(p_user_email VARCHAR, p_keep_count INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH sessions_to_delete AS (
    SELECT id
    FROM chat_sessions
    WHERE user_email = p_user_email
    ORDER BY updated_at DESC
    OFFSET p_keep_count
  )
  DELETE FROM chat_sessions
  WHERE id IN (SELECT id FROM sessions_to_delete);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VERIFY
-- ============================================================

SELECT 'chat_sessions' AS table_name,
       (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = 'chat_sessions') AS exists;

SELECT 'chat_messages' AS table_name,
       (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = 'chat_messages') AS exists;
