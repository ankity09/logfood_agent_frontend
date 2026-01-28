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
  go_live_date        DATE,
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
  ('b0000000-0000-0000-0000-000000000001', 'Sarah Chen',   'sarah.chen@company.com',   'Solutions Architect'),
  ('b0000000-0000-0000-0000-000000000002', 'Mike Johnson', 'mike.johnson@company.com', 'Solutions Architect'),
  ('b0000000-0000-0000-0000-000000000003', 'Lisa Park',    'lisa.park@company.com',    'Solutions Architect'),
  ('b0000000-0000-0000-0000-000000000004', 'James Lee',    'james.lee@company.com',    'Solutions Architect'),
  ('b0000000-0000-0000-0000-000000000005', 'Anna Kim',     'anna.kim@company.com',     'Solutions Architect');

-- Use Cases
INSERT INTO use_cases (id, title, description, account_id, owner_id, stage, value_cents, databricks_services, next_steps, stakeholders, go_live_date, created_at) VALUES
  (
    'cc000000-0000-0000-0000-000000000001',
    'Real-time Data Lakehouse',
    E'1. Project Summary\nImplementing a real-time data lakehouse architecture for unified analytics across all business units. The goal is to consolidate 12+ data silos into a single Delta Lake platform with sub-minute latency.\n\n2. Current Status\nPOC environment provisioned. Initial data ingestion pipeline tested with 3 source systems. Performance benchmarks show 10x improvement over legacy warehouse.\n\n3. Key Risks\nData quality from legacy ERP system needs cleansing pipeline. Timeline depends on VP Engineering availability for architecture sign-off.',
    'a0000000-0000-0000-0000-000000000001', -- Acme Corporation
    'b0000000-0000-0000-0000-000000000001', -- Sarah Chen
    'evaluating',
    25000000, -- $250K
    ARRAY['DBSQL', 'Unity Catalog'],
    ARRAY['1/27/26 SC - POC environment ready, shared access credentials with Acme data team', '1/22/26 SC - Technical deep-dive completed, client impressed with Delta Lake performance', '1/15/26 SC - Architecture document shared with VP Engineering and CTO', '1/13/26 SC - Initial discovery call, mapped out 12 data sources across business units'],
    ARRAY['VP Engineering', 'Data Team Lead', 'CTO'],
    '2025-06-15',
    '2025-01-13T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000002',
    'ML Pipeline Automation',
    'Automating ML model training and deployment pipelines with MLflow and Databricks Jobs. Includes automated retraining triggers, A/B model testing, and model registry integration.',
    'a0000000-0000-0000-0000-000000000001', -- Acme Corporation
    'b0000000-0000-0000-0000-000000000001', -- Sarah Chen
    'confirming',
    18000000, -- $180K
    ARRAY['AI/ML', 'Unity Catalog'],
    ARRAY['1/25/26 SC - Updated pricing proposal sent, awaiting VP Data Science approval', '1/20/26 SC - Aligned on Q2 timeline with ML engineering team', '1/10/26 SC - Demo of MLflow integration well received', '12/27/25 SC - Kickoff meeting, identified 5 production models for migration'],
    ARRAY['ML Engineering Lead', 'VP Data Science'],
    '2025-05-01',
    '2024-12-27T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000003',
    'Customer 360 Analytics',
    'Building a unified customer view across all touchpoints using Delta Lake and DBSQL dashboards.',
    'a0000000-0000-0000-0000-000000000002', -- TechStart Inc
    'b0000000-0000-0000-0000-000000000002', -- Mike Johnson
    'validating',
    12000000, -- $120K
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['1/26/26 MJ - Initial stakeholder list compiled, scheduling data audit for next week', '1/24/26 MJ - Discovery call completed, identified 4 primary data sources (CRM, web, mobile, POS)'],
    ARRAY['CTO', 'Data Team Lead'],
    '2025-09-01',
    '2025-01-24T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000004',
    'Fraud Detection System',
    E'1. Project Summary\nReal-time fraud detection using machine learning models on Databricks with feature store. Goal is to reduce fraud losses by 40% within 6 months of go-live.\n\n2. Technical Approach\nStreaming pipeline ingests transaction data in real-time. Feature store computes 200+ features per transaction. Ensemble model (XGBoost + neural net) scores transactions in <100ms.\n\n3. Data Requirements\n18 months of historical transaction data needed for training. PII handling requires Unity Catalog fine-grained access controls.',
    'a0000000-0000-0000-0000-000000000002', -- TechStart Inc
    'b0000000-0000-0000-0000-000000000002', -- Mike Johnson
    'scoping',
    30000000, -- $300K
    ARRAY['AI/ML', 'DBSQL'],
    ARRAY['1/27/26 MJ - Feature engineering workshop scheduled for Feb 3', '1/23/26 MJ - Data readiness assessment complete, 14 of 18 months of data available', '1/20/26 MJ - Scoping call with Head of Risk, defined model requirements and success criteria'],
    ARRAY['Head of Risk', 'ML Engineering Lead'],
    '2025-08-01',
    '2025-01-20T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000005',
    'Data Governance Platform',
    E'1. Project Summary\nEnterprise-wide data governance and compliance platform using Unity Catalog. Covers data lineage, access controls, PII tagging, and audit logging across 500+ tables.\n\n2. Current Status\nContract in final review with legal. Technical architecture approved by Chief Data Officer. Kickoff tentatively scheduled for Feb 10.\n\n3. Compliance Requirements\nMust meet SOC 2 Type II and GDPR requirements. Automated PII detection and masking pipeline required for all customer-facing tables.',
    'a0000000-0000-0000-0000-000000000003', -- DataFlow Systems
    'b0000000-0000-0000-0000-000000000003', -- Lisa Park
    'confirming',
    20000000, -- $200K
    ARRAY['Unity Catalog'],
    ARRAY['1/27/26 LP - Contract redline back from legal, minor changes only', '1/22/26 LP - Kickoff meeting tentatively set for Feb 10', '1/15/26 LP - CDO signed off on technical architecture', '1/10/26 LP - Compliance requirements doc shared with Databricks security team', '1/06/26 LP - Initial scoping complete, 500+ tables identified for governance'],
    ARRAY['Chief Data Officer', 'Compliance Lead'],
    '2025-04-15',
    '2025-01-06T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000006',
    'Predictive Maintenance',
    'IoT-driven predictive maintenance for manufacturing using streaming and ML. Aims to reduce unplanned downtime by 30% across 3 production facilities.',
    'a0000000-0000-0000-0000-000000000003', -- DataFlow Systems
    'b0000000-0000-0000-0000-000000000003', -- Lisa Park
    'evaluating',
    35000000, -- $350K
    ARRAY['AI/ML', 'DBSQL', 'Unity Catalog'],
    ARRAY['1/26/26 LP - Streaming POC ingesting data from 2 of 3 facilities', '1/20/26 LP - IoT gateway connectivity tested, 50k sensors streaming successfully', '1/13/26 LP - Baseline failure prediction model trained, 78% accuracy on historical data'],
    ARRAY['VP Manufacturing', 'IoT Platform Lead'],
    '2025-07-01',
    '2025-01-13T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000007',
    'Recommendation Engine',
    E'1. Project Summary\nPersonalized recommendation engine for e-commerce powered by Databricks ML. Deployed to production serving 2M+ daily active users.\n\n2. Results\nA/B test showed 23% increase in click-through rate and 15% increase in average order value. Model retrains weekly on latest interaction data.\n\n3. Next Phase\nPlanning to add real-time personalization using streaming features and expand to email recommendations.',
    'a0000000-0000-0000-0000-000000000004', -- CloudNine Analytics
    'b0000000-0000-0000-0000-000000000004', -- James Lee
    'live',
    15000000, -- $150K
    ARRAY['AI/ML', 'AI/BI'],
    ARRAY['1/25/26 JL - Q4 review completed, client renewed for 12 months', '1/15/26 JL - Model drift monitoring dashboard deployed', '12/20/25 JL - Production deployment successful, serving 2M+ DAU', '12/10/25 JL - A/B test results: 23% CTR improvement confirmed', '11/27/25 JL - Initial model training complete, accuracy exceeds targets'],
    ARRAY['VP Product', 'Data Science Lead'],
    '2025-01-15',
    '2024-11-27T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000008',
    'Supply Chain Optimization',
    'AI-driven supply chain forecasting and optimization with DBSQL dashboards. Initial focus on demand forecasting for top 100 SKUs.',
    'a0000000-0000-0000-0000-000000000004', -- CloudNine Analytics
    'b0000000-0000-0000-0000-000000000004', -- James Lee
    'validating',
    28000000, -- $280K
    ARRAY['AI/BI', 'DBSQL', 'AI/ML'],
    ARRAY['1/24/26 JL - Discovery call completed, VP Operations very engaged', '1/20/26 JL - Initial outreach, identified supply chain pain points around demand forecasting'],
    ARRAY['VP Operations', 'Supply Chain Director'],
    NULL,
    '2025-01-20T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000009',
    'NLP Document Processing',
    'Automated document processing using NLP models with foundation model APIs. Target is to automate processing of 10K+ documents per month with 95%+ accuracy.',
    'a0000000-0000-0000-0000-000000000005', -- MetricPulse AI
    'b0000000-0000-0000-0000-000000000005', -- Anna Kim
    'scoping',
    17500000, -- $175K
    ARRAY['AI/ML'],
    ARRAY['1/27/26 AK - Model selection narrowed to 3 candidates, benchmark tests running', '1/25/26 AK - Document corpus analysis complete: 12 doc types, avg 8 pages each', '1/22/26 AK - Accuracy targets defined: 95% extraction, 98% classification'],
    ARRAY['Head of AI', 'Product Manager'],
    '2025-10-01',
    '2025-01-22T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000010',
    'Executive BI Dashboards',
    'AI/BI-powered executive dashboards with natural language querying. Covers revenue, operations, and customer metrics for C-suite.',
    'a0000000-0000-0000-0000-000000000005', -- MetricPulse AI
    'b0000000-0000-0000-0000-000000000005', -- Anna Kim
    'onboarding',
    9000000, -- $90K
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['1/26/26 AK - End user training session scheduled for Feb 5 (CEO, CFO, Head of Analytics)', '1/20/26 AK - Data connections configured, all 6 source tables validated', '1/15/26 AK - Workspace access provisioned for 8 users', '12/27/25 AK - Onboarding kickoff, defined 3 dashboard views (revenue, ops, customers)'],
    ARRAY['CEO', 'CFO', 'Head of Analytics'],
    '2025-03-01',
    '2024-12-27T00:00:00Z'
  );

-- Meeting Notes
INSERT INTO meeting_notes (id, filename, account_id, summary, attendees, uploaded_at) VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'acme-quarterly-review-q4.txt',
    'a0000000-0000-0000-0000-000000000001', -- Acme Corporation
    'Quarterly review focused on expanding data lakehouse deployment and introducing ML pipeline automation. Client expressed strong interest in real-time analytics capabilities.',
    ARRAY['Sarah Chen', 'John Smith (Acme)', 'VP Engineering (Acme)'],
    '2026-01-25T00:00:00Z'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'techstart-kickoff-meeting.txt',
    'a0000000-0000-0000-0000-000000000002', -- TechStart Inc
    'Initial discovery call with TechStart. They are evaluating solutions for customer analytics and fraud detection. Budget approved for Q1 initiatives.',
    ARRAY['Mike Johnson', 'CTO (TechStart)', 'Data Team Lead (TechStart)'],
    '2026-01-22T00:00:00Z'
  );

-- Extracted Use Cases (from meeting notes)
INSERT INTO extracted_use_cases (id, meeting_note_id, title, description, suggested_stage, next_steps) VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'Real-time Analytics Dashboard',
    'Client wants real-time analytics dashboard integrated with their existing data lakehouse for executive visibility.',
    'evaluating',
    ARRAY['Schedule technical deep-dive', 'Prepare POC environment', 'Share architecture document']
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'ML Pipeline v2 Upgrade',
    'Upgrade existing ML pipeline to support automated retraining and A/B model testing.',
    'confirming',
    ARRAY['Send updated pricing proposal', 'Align on timeline with engineering']
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000002',
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
