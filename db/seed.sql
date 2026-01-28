-- ============================================================
-- LogFoodAgent — Seed Data Only
-- Run this against your Lakebase instance to populate tables
-- ============================================================

-- Accounts  (prefix a0)
INSERT INTO accounts (id, name, industry) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Acme Corporation',     'Technology'),
  ('a0000000-0000-0000-0000-000000000002', 'TechStart Inc',        'Fintech'),
  ('a0000000-0000-0000-0000-000000000003', 'DataFlow Systems',     'Manufacturing'),
  ('a0000000-0000-0000-0000-000000000004', 'CloudNine Analytics',  'E-commerce'),
  ('a0000000-0000-0000-0000-000000000005', 'MetricPulse AI',       'AI/Analytics')
ON CONFLICT (id) DO NOTHING;

-- Users  (prefix b0)
INSERT INTO users (id, name, email, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Sarah Chen',   'sarah.chen@company.com',   'Solutions Architect'),
  ('b0000000-0000-0000-0000-000000000002', 'Mike Johnson', 'mike.johnson@company.com', 'Solutions Architect'),
  ('b0000000-0000-0000-0000-000000000003', 'Lisa Park',    'lisa.park@company.com',    'Solutions Architect'),
  ('b0000000-0000-0000-0000-000000000004', 'James Lee',    'james.lee@company.com',    'Solutions Architect'),
  ('b0000000-0000-0000-0000-000000000005', 'Anna Kim',     'anna.kim@company.com',     'Solutions Architect')
ON CONFLICT (id) DO NOTHING;

-- Use Cases  (prefix cc)
INSERT INTO use_cases (id, title, description, account_id, owner_id, stage, value_cents, databricks_services, next_steps, stakeholders, created_at) VALUES
  (
    'cc000000-0000-0000-0000-000000000001',
    'Real-time Data Lakehouse',
    'Implementing a real-time data lakehouse architecture for unified analytics across all business units.',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'evaluating',
    25000000,
    ARRAY['DBSQL', 'Unity Catalog'],
    ARRAY['Schedule technical deep-dive', 'Prepare POC environment', 'Share architecture document'],
    ARRAY['VP Engineering', 'Data Team Lead', 'CTO'],
    '2025-01-13T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000002',
    'ML Pipeline Automation',
    'Automating ML model training and deployment pipelines with MLflow and Databricks Jobs.',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'confirming',
    18000000,
    ARRAY['AI/ML', 'Unity Catalog'],
    ARRAY['Send updated pricing proposal', 'Align on timeline with engineering'],
    ARRAY['ML Engineering Lead', 'VP Data Science'],
    '2024-12-27T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000003',
    'Customer 360 Analytics',
    'Building a unified customer view across all touchpoints using Delta Lake and DBSQL dashboards.',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'validating',
    12000000,
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['Map data sources', 'Schedule data audit', 'Identify stakeholders'],
    ARRAY['CTO', 'Data Team Lead'],
    '2025-01-24T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000004',
    'Fraud Detection System',
    'Real-time fraud detection using machine learning models on Databricks with feature store.',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'scoping',
    30000000,
    ARRAY['AI/ML', 'DBSQL'],
    ARRAY['Define model requirements', 'Assess data readiness', 'Plan feature engineering'],
    ARRAY['Head of Risk', 'ML Engineering Lead'],
    '2025-01-20T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000005',
    'Data Governance Platform',
    'Enterprise-wide data governance and compliance platform using Unity Catalog.',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'confirming',
    20000000,
    ARRAY['Unity Catalog'],
    ARRAY['Finalize contract terms', 'Schedule kickoff meeting'],
    ARRAY['Chief Data Officer', 'Compliance Lead'],
    '2025-01-06T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000006',
    'Predictive Maintenance',
    'IoT-driven predictive maintenance for manufacturing using streaming and ML.',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'evaluating',
    35000000,
    ARRAY['AI/ML', 'DBSQL', 'Unity Catalog'],
    ARRAY['Set up streaming POC', 'Connect IoT data sources', 'Train baseline model'],
    ARRAY['VP Manufacturing', 'IoT Platform Lead'],
    '2025-01-13T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000007',
    'Recommendation Engine',
    'Personalized recommendation engine for e-commerce powered by Databricks ML.',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'live',
    15000000,
    ARRAY['AI/ML', 'AI/BI'],
    ARRAY['Monitor model performance', 'Plan quarterly review'],
    ARRAY['VP Product', 'Data Science Lead'],
    '2024-11-27T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000008',
    'Supply Chain Optimization',
    'AI-driven supply chain forecasting and optimization with DBSQL dashboards.',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'validating',
    28000000,
    ARRAY['AI/BI', 'DBSQL', 'AI/ML'],
    ARRAY['Discovery call', 'Assess current data infrastructure', 'Identify quick wins'],
    ARRAY['VP Operations', 'Supply Chain Director'],
    '2025-01-20T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000009',
    'NLP Document Processing',
    'Automated document processing using NLP models with foundation model APIs.',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'scoping',
    17500000,
    ARRAY['AI/ML'],
    ARRAY['Document corpus analysis', 'Model selection', 'Define accuracy targets'],
    ARRAY['Head of AI', 'Product Manager'],
    '2025-01-22T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000010',
    'Executive BI Dashboards',
    'AI/BI-powered executive dashboards with natural language querying.',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'onboarding',
    9000000,
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['Set up workspace access', 'Configure data connections', 'Train end users'],
    ARRAY['CEO', 'CFO', 'Head of Analytics'],
    '2024-12-27T00:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

-- Meeting Notes  (prefix d0)
INSERT INTO meeting_notes (id, filename, account_id, summary, attendees, uploaded_at) VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'acme-quarterly-review-q4.txt',
    'a0000000-0000-0000-0000-000000000001',
    'Quarterly review focused on expanding data lakehouse deployment and introducing ML pipeline automation. Client expressed strong interest in real-time analytics capabilities.',
    ARRAY['Sarah Chen', 'John Smith (Acme)', 'VP Engineering (Acme)'],
    '2026-01-25T00:00:00Z'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'techstart-kickoff-meeting.txt',
    'a0000000-0000-0000-0000-000000000002',
    'Initial discovery call with TechStart. They are evaluating solutions for customer analytics and fraud detection. Budget approved for Q1 initiatives.',
    ARRAY['Mike Johnson', 'CTO (TechStart)', 'Data Team Lead (TechStart)'],
    '2026-01-22T00:00:00Z'
  )
ON CONFLICT (id) DO NOTHING;

-- Extracted Use Cases  (prefix e0)
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
  )
ON CONFLICT (id) DO NOTHING;

-- Activities (auto-generated UUIDs, no conflicts)
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

-- Verify counts
SELECT 'accounts'           AS tbl, COUNT(*) FROM accounts
UNION ALL SELECT 'users',             COUNT(*) FROM users
UNION ALL SELECT 'use_cases',         COUNT(*) FROM use_cases
UNION ALL SELECT 'meeting_notes',     COUNT(*) FROM meeting_notes
UNION ALL SELECT 'extracted_use_cases', COUNT(*) FROM extracted_use_cases
UNION ALL SELECT 'activities',        COUNT(*) FROM activities;
