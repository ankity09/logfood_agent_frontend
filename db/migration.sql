-- ============================================================
-- LogFoodAgent — Lakebase Schema Migration
-- Database: databricks_postgres (Lakebase Autoscaling)
-- Run this against your Lakebase instance via psql or SQL editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Accounts (customer companies)
CREATE TABLE accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL UNIQUE,
  industry   VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (internal team members / owners)
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) UNIQUE,
  role       VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Use cases (core pipeline entity)
CREATE TABLE use_cases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  owner_id            UUID NOT NULL REFERENCES users(id),
  stage               VARCHAR(20) NOT NULL CHECK (stage IN (
                        'validating', 'scoping', 'evaluating',
                        'confirming', 'onboarding', 'live'
                      )),
  value_cents         INTEGER DEFAULT 0,
  databricks_services TEXT[] DEFAULT '{}',
  next_steps          TEXT[] DEFAULT '{}',
  stakeholders        TEXT[] DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meeting notes (uploaded documents)
CREATE TABLE meeting_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    VARCHAR(255) NOT NULL,
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  summary     TEXT,
  attendees   TEXT[] DEFAULT '{}',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Extracted use cases (AI-extracted from meeting notes)
CREATE TABLE extracted_use_cases (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_note_id    UUID NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  title              VARCHAR(255) NOT NULL,
  description        TEXT,
  suggested_stage    VARCHAR(20),
  next_steps         TEXT[] DEFAULT '{}',
  linked_use_case_id UUID REFERENCES use_cases(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity feed
CREATE TABLE activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(20) NOT NULL CHECK (type IN ('meeting', 'usecase', 'note')),
  description     TEXT NOT NULL,
  account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL,
  use_case_id     UUID REFERENCES use_cases(id) ON DELETE SET NULL,
  meeting_note_id UUID REFERENCES meeting_notes(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_use_cases_account   ON use_cases(account_id);
CREATE INDEX idx_use_cases_owner     ON use_cases(owner_id);
CREATE INDEX idx_use_cases_stage     ON use_cases(stage);
CREATE INDEX idx_use_cases_created   ON use_cases(created_at);
CREATE INDEX idx_meeting_notes_acct  ON meeting_notes(account_id);
CREATE INDEX idx_activities_created  ON activities(created_at DESC);
CREATE INDEX idx_extracted_uc_note   ON extracted_use_cases(meeting_note_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Accounts
INSERT INTO accounts (id, name, industry) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Acme Corporation',     'Technology'),
  ('a0000000-0000-0000-0000-000000000002', 'TechStart Inc',        'Fintech'),
  ('a0000000-0000-0000-0000-000000000003', 'DataFlow Systems',     'Manufacturing'),
  ('a0000000-0000-0000-0000-000000000004', 'CloudNine Analytics',  'E-commerce'),
  ('a0000000-0000-0000-0000-000000000005', 'MetricPulse AI',       'AI/Analytics');

-- Users (internal owners)
INSERT INTO users (id, name, email, role) VALUES
  ('u0000000-0000-0000-0000-000000000001', 'Sarah Chen',   'sarah.chen@company.com',   'Solutions Architect'),
  ('u0000000-0000-0000-0000-000000000002', 'Mike Johnson', 'mike.johnson@company.com', 'Solutions Architect'),
  ('u0000000-0000-0000-0000-000000000003', 'Lisa Park',    'lisa.park@company.com',    'Solutions Architect'),
  ('u0000000-0000-0000-0000-000000000004', 'James Lee',    'james.lee@company.com',    'Solutions Architect'),
  ('u0000000-0000-0000-0000-000000000005', 'Anna Kim',     'anna.kim@company.com',     'Solutions Architect');

-- Use Cases
INSERT INTO use_cases (id, title, description, account_id, owner_id, stage, value_cents, databricks_services, next_steps, stakeholders, created_at) VALUES
  (
    'uc000000-0000-0000-0000-000000000001',
    'Real-time Data Lakehouse',
    'Implementing a real-time data lakehouse architecture for unified analytics across all business units.',
    'a0000000-0000-0000-0000-000000000001', -- Acme Corporation
    'u0000000-0000-0000-0000-000000000001', -- Sarah Chen
    'evaluating',
    25000000, -- $250K
    ARRAY['DBSQL', 'Unity Catalog'],
    ARRAY['Schedule technical deep-dive', 'Prepare POC environment', 'Share architecture document'],
    ARRAY['VP Engineering', 'Data Team Lead', 'CTO'],
    '2025-01-13T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000002',
    'ML Pipeline Automation',
    'Automating ML model training and deployment pipelines with MLflow and Databricks Jobs.',
    'a0000000-0000-0000-0000-000000000001', -- Acme Corporation
    'u0000000-0000-0000-0000-000000000001', -- Sarah Chen
    'confirming',
    18000000, -- $180K
    ARRAY['AI/ML', 'Unity Catalog'],
    ARRAY['Send updated pricing proposal', 'Align on timeline with engineering'],
    ARRAY['ML Engineering Lead', 'VP Data Science'],
    '2024-12-27T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000003',
    'Customer 360 Analytics',
    'Building a unified customer view across all touchpoints using Delta Lake and DBSQL dashboards.',
    'a0000000-0000-0000-0000-000000000002', -- TechStart Inc
    'u0000000-0000-0000-0000-000000000002', -- Mike Johnson
    'validating',
    12000000, -- $120K
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['Map data sources', 'Schedule data audit', 'Identify stakeholders'],
    ARRAY['CTO', 'Data Team Lead'],
    '2025-01-24T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000004',
    'Fraud Detection System',
    'Real-time fraud detection using machine learning models on Databricks with feature store.',
    'a0000000-0000-0000-0000-000000000002', -- TechStart Inc
    'u0000000-0000-0000-0000-000000000002', -- Mike Johnson
    'scoping',
    30000000, -- $300K
    ARRAY['AI/ML', 'DBSQL'],
    ARRAY['Define model requirements', 'Assess data readiness', 'Plan feature engineering'],
    ARRAY['Head of Risk', 'ML Engineering Lead'],
    '2025-01-20T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000005',
    'Data Governance Platform',
    'Enterprise-wide data governance and compliance platform using Unity Catalog.',
    'a0000000-0000-0000-0000-000000000003', -- DataFlow Systems
    'u0000000-0000-0000-0000-000000000003', -- Lisa Park
    'confirming',
    20000000, -- $200K
    ARRAY['Unity Catalog'],
    ARRAY['Finalize contract terms', 'Schedule kickoff meeting'],
    ARRAY['Chief Data Officer', 'Compliance Lead'],
    '2025-01-06T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000006',
    'Predictive Maintenance',
    'IoT-driven predictive maintenance for manufacturing using streaming and ML.',
    'a0000000-0000-0000-0000-000000000003', -- DataFlow Systems
    'u0000000-0000-0000-0000-000000000003', -- Lisa Park
    'evaluating',
    35000000, -- $350K
    ARRAY['AI/ML', 'DBSQL', 'Unity Catalog'],
    ARRAY['Set up streaming POC', 'Connect IoT data sources', 'Train baseline model'],
    ARRAY['VP Manufacturing', 'IoT Platform Lead'],
    '2025-01-13T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000007',
    'Recommendation Engine',
    'Personalized recommendation engine for e-commerce powered by Databricks ML.',
    'a0000000-0000-0000-0000-000000000004', -- CloudNine Analytics
    'u0000000-0000-0000-0000-000000000004', -- James Lee
    'live',
    15000000, -- $150K
    ARRAY['AI/ML', 'AI/BI'],
    ARRAY['Monitor model performance', 'Plan quarterly review'],
    ARRAY['VP Product', 'Data Science Lead'],
    '2024-11-27T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000008',
    'Supply Chain Optimization',
    'AI-driven supply chain forecasting and optimization with DBSQL dashboards.',
    'a0000000-0000-0000-0000-000000000004', -- CloudNine Analytics
    'u0000000-0000-0000-0000-000000000004', -- James Lee
    'validating',
    28000000, -- $280K
    ARRAY['AI/BI', 'DBSQL', 'AI/ML'],
    ARRAY['Discovery call', 'Assess current data infrastructure', 'Identify quick wins'],
    ARRAY['VP Operations', 'Supply Chain Director'],
    '2025-01-20T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000009',
    'NLP Document Processing',
    'Automated document processing using NLP models with foundation model APIs.',
    'a0000000-0000-0000-0000-000000000005', -- MetricPulse AI
    'u0000000-0000-0000-0000-000000000005', -- Anna Kim
    'scoping',
    17500000, -- $175K
    ARRAY['AI/ML'],
    ARRAY['Document corpus analysis', 'Model selection', 'Define accuracy targets'],
    ARRAY['Head of AI', 'Product Manager'],
    '2025-01-22T00:00:00Z'
  ),
  (
    'uc000000-0000-0000-0000-000000000010',
    'Executive BI Dashboards',
    'AI/BI-powered executive dashboards with natural language querying.',
    'a0000000-0000-0000-0000-000000000005', -- MetricPulse AI
    'u0000000-0000-0000-0000-000000000005', -- Anna Kim
    'onboarding',
    9000000, -- $90K
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['Set up workspace access', 'Configure data connections', 'Train end users'],
    ARRAY['CEO', 'CFO', 'Head of Analytics'],
    '2024-12-27T00:00:00Z'
  );

-- Meeting Notes
INSERT INTO meeting_notes (id, filename, account_id, summary, attendees, uploaded_at) VALUES
  (
    'mn000000-0000-0000-0000-000000000001',
    'acme-quarterly-review-q4.txt',
    'a0000000-0000-0000-0000-000000000001', -- Acme Corporation
    'Quarterly review focused on expanding data lakehouse deployment and introducing ML pipeline automation. Client expressed strong interest in real-time analytics capabilities.',
    ARRAY['Sarah Chen', 'John Smith (Acme)', 'VP Engineering (Acme)'],
    '2026-01-25T00:00:00Z'
  ),
  (
    'mn000000-0000-0000-0000-000000000002',
    'techstart-kickoff-meeting.txt',
    'a0000000-0000-0000-0000-000000000002', -- TechStart Inc
    'Initial discovery call with TechStart. They are evaluating solutions for customer analytics and fraud detection. Budget approved for Q1 initiatives.',
    ARRAY['Mike Johnson', 'CTO (TechStart)', 'Data Team Lead (TechStart)'],
    '2026-01-22T00:00:00Z'
  );

-- Extracted Use Cases (from meeting notes)
INSERT INTO extracted_use_cases (id, meeting_note_id, title, description, suggested_stage, next_steps) VALUES
  (
    'ex000000-0000-0000-0000-000000000001',
    'mn000000-0000-0000-0000-000000000001',
    'Real-time Analytics Dashboard',
    'Client wants real-time analytics dashboard integrated with their existing data lakehouse for executive visibility.',
    'evaluating',
    ARRAY['Schedule technical deep-dive', 'Prepare POC environment', 'Share architecture document']
  ),
  (
    'ex000000-0000-0000-0000-000000000002',
    'mn000000-0000-0000-0000-000000000001',
    'ML Pipeline v2 Upgrade',
    'Upgrade existing ML pipeline to support automated retraining and A/B model testing.',
    'confirming',
    ARRAY['Send updated pricing proposal', 'Align on timeline with engineering']
  ),
  (
    'ex000000-0000-0000-0000-000000000003',
    'mn000000-0000-0000-0000-000000000002',
    'Customer 360 Platform',
    'Unified customer view combining web, mobile, and in-store data for personalized marketing.',
    'validating',
    ARRAY['Map data sources', 'Schedule data audit', 'Identify stakeholders']
  );

-- Activities
INSERT INTO activities (type, description, account_id, created_at) VALUES
  ('meeting', 'Meeting with Acme Corp - Discussed data lakehouse POC',
   'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 hours'),
  ('usecase', 'New use case created: Real-time analytics for TechStart',
   'a0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '4 hours'),
  ('note',    'Meeting notes uploaded for DataFlow Inc quarterly review',
   'a0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '6 hours'),
  ('usecase', 'Use case "ML Pipeline" moved to Confirming stage',
   'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day'),
  ('meeting', 'Follow-up scheduled with CloudNine for next Tuesday',
   'a0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '1 day');

-- ============================================================
-- VERIFY
-- ============================================================
SELECT 'accounts'           AS tbl, COUNT(*) FROM accounts
UNION ALL SELECT 'users',             COUNT(*) FROM users
UNION ALL SELECT 'use_cases',         COUNT(*) FROM use_cases
UNION ALL SELECT 'meeting_notes',     COUNT(*) FROM meeting_notes
UNION ALL SELECT 'extracted_use_cases', COUNT(*) FROM extracted_use_cases
UNION ALL SELECT 'activities',        COUNT(*) FROM activities;
