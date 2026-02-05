-- ============================================================
-- LogFoodAgent — Schema Enhancements Migration (v4)
-- Enhances meeting_notes, extracted_use_cases, and chat_messages
-- Run this against your Lakebase instance after migration_v3
-- ============================================================

-- ============================================================
-- ENHANCE meeting_notes TABLE
-- ============================================================

-- Add raw_content to store original meeting transcript
ALTER TABLE meeting_notes
ADD COLUMN IF NOT EXISTS raw_content TEXT;

-- Add is_processed flag to track AI processing status
ALTER TABLE meeting_notes
ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false;

-- Add structured_summary for AI-extracted structured data
-- Contains: executive_summary, key_topics, decisions, action_items, risks
ALTER TABLE meeting_notes
ADD COLUMN IF NOT EXISTS structured_summary JSONB;

-- Add title for better display
ALTER TABLE meeting_notes
ADD COLUMN IF NOT EXISTS title VARCHAR(500);

-- ============================================================
-- ENHANCE extracted_use_cases TABLE
-- ============================================================

-- Add extraction_type to distinguish new vs update extractions
ALTER TABLE extracted_use_cases
ADD COLUMN IF NOT EXISTS extraction_type VARCHAR(20) DEFAULT 'new'
CHECK (extraction_type IN ('new', 'update'));

-- Add extracted_updates for update-type extractions
ALTER TABLE extracted_use_cases
ADD COLUMN IF NOT EXISTS extracted_updates TEXT[];

-- Add matched_use_case_title for showing which use case was matched
ALTER TABLE extracted_use_cases
ADD COLUMN IF NOT EXISTS matched_use_case_title VARCHAR(500);

-- Add confidence_score for extraction confidence
ALTER TABLE extracted_use_cases
ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

-- ============================================================
-- ENHANCE chat_messages TABLE
-- ============================================================

-- Add metadata for context attribution and other metadata
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ============================================================
-- ADDITIONAL INDEXES
-- ============================================================

-- Index for finding unprocessed meeting notes
CREATE INDEX IF NOT EXISTS idx_meeting_notes_unprocessed
ON meeting_notes(is_processed)
WHERE is_processed = false;

-- Index for extraction type filtering
CREATE INDEX IF NOT EXISTS idx_extracted_uc_type
ON extracted_use_cases(extraction_type);

-- ============================================================
-- VERIFY
-- ============================================================

-- Check meeting_notes columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'meeting_notes'
  AND column_name IN ('raw_content', 'is_processed', 'structured_summary', 'title');

-- Check extracted_use_cases columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'extracted_use_cases'
  AND column_name IN ('extraction_type', 'extracted_updates', 'matched_use_case_title', 'confidence_score');

-- Check chat_messages columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages'
  AND column_name = 'metadata';
