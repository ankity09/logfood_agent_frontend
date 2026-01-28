-- ============================================================
-- LogFoodAgent — Migration V2: Add go_live_date to use_cases
-- Run this against your Lakebase instance via SQL editor
-- ============================================================

ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS go_live_date DATE;

-- Set go_live_date for existing seed data
UPDATE use_cases SET go_live_date = '2025-06-15' WHERE id = 'cc000000-0000-0000-0000-000000000001'; -- Real-time Data Lakehouse (evaluating)
UPDATE use_cases SET go_live_date = '2025-04-01' WHERE id = 'cc000000-0000-0000-0000-000000000002'; -- ML Pipeline Automation (confirming)
UPDATE use_cases SET go_live_date = '2025-09-01' WHERE id = 'cc000000-0000-0000-0000-000000000003'; -- Customer 360 Analytics (validating)
UPDATE use_cases SET go_live_date = '2025-07-15' WHERE id = 'cc000000-0000-0000-0000-000000000004'; -- Fraud Detection System (scoping)
UPDATE use_cases SET go_live_date = '2025-03-15' WHERE id = 'cc000000-0000-0000-0000-000000000005'; -- Data Governance Platform (confirming)
UPDATE use_cases SET go_live_date = '2025-08-01' WHERE id = 'cc000000-0000-0000-0000-000000000006'; -- Predictive Maintenance (evaluating)
UPDATE use_cases SET go_live_date = '2024-11-15' WHERE id = 'cc000000-0000-0000-0000-000000000007'; -- Recommendation Engine (live)
UPDATE use_cases SET go_live_date = '2025-10-01' WHERE id = 'cc000000-0000-0000-0000-000000000008'; -- Supply Chain Optimization (validating)
UPDATE use_cases SET go_live_date = '2025-06-01' WHERE id = 'cc000000-0000-0000-0000-000000000009'; -- NLP Document Processing (scoping)
UPDATE use_cases SET go_live_date = '2025-02-01' WHERE id = 'cc000000-0000-0000-0000-000000000010'; -- Executive BI Dashboards (onboarding)

-- Verify
SELECT id, title, stage, go_live_date FROM use_cases ORDER BY created_at;
