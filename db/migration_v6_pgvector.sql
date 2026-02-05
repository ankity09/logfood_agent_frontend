-- ============================================================
-- LogFoodAgent — pgvector Context Embeddings Migration (v6)
-- Creates context_embeddings table for RAG semantic search
-- Requires pgvector extension enabled in Lakebase
-- Run this against your Lakebase instance after migration_v5
-- ============================================================

-- ============================================================
-- ENABLE pgvector EXTENSION
-- ============================================================

-- Note: This may require admin privileges in Lakebase
-- If this fails, contact your Databricks admin to enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- CREATE context_embeddings TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS context_embeddings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source reference
  source_type     VARCHAR(50) NOT NULL CHECK (source_type IN (
                    'meeting_note', 'use_case', 'activity', 'report'
                  )),
  source_id       UUID NOT NULL,

  -- Content metadata
  content_summary TEXT NOT NULL,          -- Human-readable summary of embedded content
  content_chunk   TEXT,                   -- The actual text chunk that was embedded
  chunk_index     INTEGER DEFAULT 0,      -- Index if source was chunked

  -- Embedding vector (GTE-large produces 1024 dimensions)
  embedding       vector(1024) NOT NULL,

  -- Metadata for filtering
  account_id      UUID REFERENCES accounts(id) ON DELETE CASCADE,
  user_email      VARCHAR(255),
  metadata        JSONB,                  -- Additional metadata for filtering

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- HNSW index for fast approximate nearest neighbor search
-- m = 16 (connections per layer), ef_construction = 64 (build-time exploration)
CREATE INDEX IF NOT EXISTS idx_context_embeddings_hnsw
ON context_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Find embeddings by source
CREATE INDEX IF NOT EXISTS idx_context_embeddings_source
ON context_embeddings(source_type, source_id);

-- Find embeddings by account
CREATE INDEX IF NOT EXISTS idx_context_embeddings_account
ON context_embeddings(account_id);

-- Find embeddings by user
CREATE INDEX IF NOT EXISTS idx_context_embeddings_user
ON context_embeddings(user_email);

-- Compound index for filtered similarity search
CREATE INDEX IF NOT EXISTS idx_context_embeddings_source_type
ON context_embeddings(source_type);

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_embedding_update_timestamp ON context_embeddings;
CREATE TRIGGER trg_embedding_update_timestamp
  BEFORE UPDATE ON context_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_timestamp();

-- ============================================================
-- HELPER FUNCTION: Semantic search with cosine similarity
-- ============================================================

CREATE OR REPLACE FUNCTION search_similar_contexts(
  query_embedding vector(1024),
  p_limit INTEGER DEFAULT 5,
  p_source_type VARCHAR DEFAULT NULL,
  p_account_id UUID DEFAULT NULL,
  p_min_similarity FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  source_type VARCHAR(50),
  source_id UUID,
  content_summary TEXT,
  account_id UUID,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.source_type,
    ce.source_id,
    ce.content_summary,
    ce.account_id,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM context_embeddings ce
  WHERE
    (p_source_type IS NULL OR ce.source_type = p_source_type)
    AND (p_account_id IS NULL OR ce.account_id = p_account_id)
    AND 1 - (ce.embedding <=> query_embedding) >= p_min_similarity
  ORDER BY ce.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- HELPER FUNCTION: Delete embeddings when source is deleted
-- ============================================================

-- For meeting_notes
CREATE OR REPLACE FUNCTION delete_meeting_note_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM context_embeddings
  WHERE source_type = 'meeting_note' AND source_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_meeting_note_embeddings ON meeting_notes;
CREATE TRIGGER trg_delete_meeting_note_embeddings
  BEFORE DELETE ON meeting_notes
  FOR EACH ROW
  EXECUTE FUNCTION delete_meeting_note_embeddings();

-- For use_cases
CREATE OR REPLACE FUNCTION delete_use_case_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM context_embeddings
  WHERE source_type = 'use_case' AND source_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_use_case_embeddings ON use_cases;
CREATE TRIGGER trg_delete_use_case_embeddings
  BEFORE DELETE ON use_cases
  FOR EACH ROW
  EXECUTE FUNCTION delete_use_case_embeddings();

-- For reports
CREATE OR REPLACE FUNCTION delete_report_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM context_embeddings
  WHERE source_type = 'report' AND source_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_report_embeddings ON reports;
CREATE TRIGGER trg_delete_report_embeddings
  BEFORE DELETE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION delete_report_embeddings();

-- ============================================================
-- VERIFY
-- ============================================================

SELECT 'context_embeddings' AS table_name,
       (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = 'context_embeddings') AS exists;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'context_embeddings'
ORDER BY ordinal_position;

-- Verify vector extension is enabled
SELECT extname, extversion
FROM pg_extension
WHERE extname = 'vector';
