-- ============================================================
-- LogFoodAgent — Reports Table Migration (v5)
-- Creates reports table for AI-generated reports
-- Run this against your Lakebase instance after migration_v4
-- ============================================================

-- ============================================================
-- CREATE reports TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report metadata
  title           VARCHAR(500) NOT NULL,
  report_type     VARCHAR(50) NOT NULL CHECK (report_type IN (
                    'weekly', 'monthly', 'quarterly', 'use_case_summary', 'custom'
                  )),
  scope           VARCHAR(20) NOT NULL CHECK (scope IN ('ae', 'account')),

  -- Ownership
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email      VARCHAR(255) NOT NULL,
  account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL,

  -- Content
  prompt          TEXT,                    -- User's custom prompt (for custom reports)
  content         TEXT NOT NULL,           -- Generated report content (markdown)
  structured_data JSONB,                   -- Optional structured data from generation

  -- Generation metadata
  generated_by    VARCHAR(100) DEFAULT 'claude-haiku-4.5',
  model_used      VARCHAR(100),
  generation_time_ms INTEGER,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Find reports by user email (for listing user's reports)
CREATE INDEX IF NOT EXISTS idx_reports_user_email
ON reports(user_email);

-- Find reports by type
CREATE INDEX IF NOT EXISTS idx_reports_type
ON reports(report_type);

-- Find reports by account
CREATE INDEX IF NOT EXISTS idx_reports_account
ON reports(account_id);

-- Sort reports by creation date
CREATE INDEX IF NOT EXISTS idx_reports_created
ON reports(created_at DESC);

-- Compound index for user + type queries
CREATE INDEX IF NOT EXISTS idx_reports_user_type
ON reports(user_email, report_type);

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_report_update_timestamp ON reports;
CREATE TRIGGER trg_report_update_timestamp
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report_timestamp();

-- ============================================================
-- VERIFY
-- ============================================================

SELECT 'reports' AS table_name,
       (SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = 'reports') AS exists;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;
