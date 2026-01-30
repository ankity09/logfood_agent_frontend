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
INSERT INTO use_cases (id, title, description, account_id, owner_id, stage, value_cents, databricks_services, next_steps, stakeholders, go_live_date, created_at) VALUES
  (
    'cc000000-0000-0000-0000-000000000001',
    'Real-time Data Lakehouse',
    E'1. Project Summary\nImplementing a real-time data lakehouse architecture for unified analytics across all business units. The goal is to consolidate 12+ data silos into a single Delta Lake platform with sub-minute latency.\n\n2. Current Status\nPOC environment provisioned. Initial data ingestion pipeline tested with 3 source systems. Performance benchmarks show 10x improvement over legacy warehouse.\n\n3. Key Risks\nData quality from legacy ERP system needs cleansing pipeline. Timeline depends on VP Engineering availability for architecture sign-off.',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'evaluating',
    25000000,
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
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'confirming',
    18000000,
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
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'validating',
    12000000,
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
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'scoping',
    30000000,
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
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'confirming',
    20000000,
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
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'evaluating',
    35000000,
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
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'live',
    15000000,
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
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'validating',
    28000000,
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
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'scoping',
    17500000,
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
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'onboarding',
    9000000,
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['1/26/26 AK - End user training session scheduled for Feb 5 (CEO, CFO, Head of Analytics)', '1/20/26 AK - Data connections configured, all 6 source tables validated', '1/15/26 AK - Workspace access provisioned for 8 users', '12/27/25 AK - Onboarding kickoff, defined 3 dashboard views (revenue, ops, customers)'],
    ARRAY['CEO', 'CFO', 'Head of Analytics'],
    '2025-03-01',
    '2024-12-27T00:00:00Z'
  ),
  -- ============================================================
  -- NEW USE CASES WITH 2026 GO-LIVE DATES
  -- ============================================================
  -- THIS WEEK (Jan 30 - Feb 5)
  (
    'cc000000-0000-0000-0000-000000000011',
    'Streaming Data Pipeline',
    'Real-time streaming data pipeline using Structured Streaming for IoT sensor data. Processing 100K events/second with exactly-once semantics.',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'onboarding',
    22000000,
    ARRAY['DBSQL', 'Unity Catalog'],
    ARRAY['1/29/26 SC - Final UAT signoff received, go-live checklist complete', '1/27/26 SC - Production deployment rehearsal successful', '1/25/26 SC - Runbook documentation finalized'],
    ARRAY['VP Engineering', 'Platform Lead'],
    '2026-01-31',
    '2025-11-15T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000012',
    'Cost Optimization Dashboard',
    'Cloud cost visibility and optimization dashboard using DBSQL. Tracking spend across AWS, Azure, and GCP with anomaly detection.',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'onboarding',
    8500000,
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['1/28/26 MJ - User training completed, 15 finance users onboarded', '1/26/26 MJ - Cost allocation tags validated across all cloud accounts'],
    ARRAY['CFO', 'Cloud Platform Manager'],
    '2026-02-03',
    '2025-12-01T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000013',
    'Customer Churn Prediction',
    'ML model to predict customer churn 30 days in advance. Integrates with CRM for proactive retention campaigns.',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'onboarding',
    16000000,
    ARRAY['AI/ML', 'DBSQL'],
    ARRAY['1/29/26 JL - Model deployed to production, monitoring dashboards active', '1/27/26 JL - Integration with Salesforce CRM tested end-to-end'],
    ARRAY['VP Customer Success', 'Data Science Lead'],
    '2026-02-05',
    '2025-10-20T00:00:00Z'
  ),
  -- NEXT WEEK (Feb 6 - Feb 13)
  (
    'cc000000-0000-0000-0000-000000000014',
    'Data Quality Framework',
    'Automated data quality monitoring and alerting using Great Expectations integrated with Unity Catalog. Covers 200+ critical tables.',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'confirming',
    12000000,
    ARRAY['Unity Catalog', 'DBSQL'],
    ARRAY['1/28/26 LP - Final pricing approved by procurement', '1/25/26 LP - DQ rules for all critical tables defined and tested'],
    ARRAY['Chief Data Officer', 'Data Quality Lead'],
    '2026-02-07',
    '2025-11-01T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000015',
    'Marketing Attribution Model',
    'Multi-touch attribution model for marketing spend optimization. Tracking conversions across 12 channels with 90-day lookback.',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'confirming',
    14000000,
    ARRAY['AI/ML', 'AI/BI'],
    ARRAY['1/29/26 JL - Contract in legal review, expected signature by Feb 3', '1/26/26 JL - Attribution methodology approved by CMO'],
    ARRAY['CMO', 'Marketing Analytics Lead'],
    '2026-02-10',
    '2025-12-10T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000016',
    'Inventory Forecasting',
    'Demand forecasting for inventory optimization across 5 warehouses. Using time series ML to reduce stockouts by 25%.',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'evaluating',
    19000000,
    ARRAY['AI/ML', 'DBSQL'],
    ARRAY['1/27/26 LP - POC results: 92% forecast accuracy on test data', '1/22/26 LP - Historical sales data loaded, 3 years of transactions'],
    ARRAY['VP Supply Chain', 'Inventory Manager'],
    '2026-02-12',
    '2025-12-15T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000017',
    'Compliance Reporting Automation',
    'Automated regulatory compliance reporting for SOX and GDPR. Reduces manual effort by 80% with audit trail.',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'confirming',
    11000000,
    ARRAY['Unity Catalog', 'DBSQL'],
    ARRAY['1/28/26 AK - Compliance team signed off on report templates', '1/24/26 AK - Audit trail requirements validated with external auditors'],
    ARRAY['Chief Compliance Officer', 'Internal Audit Lead'],
    '2026-02-13',
    '2025-11-20T00:00:00Z'
  ),
  -- THIS MONTH (Feb 14 - Feb 28)
  (
    'cc000000-0000-0000-0000-000000000018',
    'Sales Forecasting Platform',
    'AI-powered sales forecasting with deal scoring. Integrates with Salesforce for pipeline accuracy improvement.',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'evaluating',
    21000000,
    ARRAY['AI/ML', 'AI/BI'],
    ARRAY['1/27/26 SC - POC showing 15% improvement in forecast accuracy', '1/20/26 SC - Historical win/loss data integrated from SFDC'],
    ARRAY['VP Sales', 'Sales Operations Lead'],
    '2026-02-15',
    '2025-12-05T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000019',
    'Log Analytics Platform',
    'Centralized log analytics using Delta Lake for 50TB/day of application logs. Sub-second search with 30-day retention.',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'scoping',
    24000000,
    ARRAY['DBSQL', 'Unity Catalog'],
    ARRAY['1/28/26 MJ - Architecture review scheduled for Feb 5', '1/25/26 MJ - Log volume assessment complete, 50TB/day confirmed'],
    ARRAY['VP Engineering', 'SRE Lead'],
    '2026-02-20',
    '2026-01-10T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000020',
    'Product Analytics Suite',
    'End-to-end product analytics with funnel analysis, cohort tracking, and A/B test result automation.',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'evaluating',
    13000000,
    ARRAY['AI/BI', 'DBSQL'],
    ARRAY['1/26/26 JL - Event tracking schema finalized with product team', '1/22/26 JL - POC environment provisioned, sample dashboards created'],
    ARRAY['VP Product', 'Product Analytics Lead'],
    '2026-02-22',
    '2026-01-05T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000021',
    'HR Analytics Dashboard',
    'People analytics platform covering attrition risk, compensation benchmarking, and DEI metrics.',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'scoping',
    7500000,
    ARRAY['AI/BI', 'Unity Catalog'],
    ARRAY['1/27/26 AK - Data sensitivity classification complete for all HR tables', '1/23/26 AK - HRIS data export tested, 5 years of employee data available'],
    ARRAY['CHRO', 'People Analytics Lead'],
    '2026-02-25',
    '2026-01-15T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000022',
    'Energy Consumption Optimization',
    'ML-based energy optimization for data centers. Targeting 20% reduction in power consumption using predictive cooling.',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'validating',
    32000000,
    ARRAY['AI/ML', 'DBSQL'],
    ARRAY['1/28/26 LP - Initial sensor data ingestion pipeline tested', '1/24/26 LP - Discovery call with facilities team, identified 12 data center locations'],
    ARRAY['VP Operations', 'Facilities Director'],
    '2026-02-28',
    '2026-01-20T00:00:00Z'
  ),
  -- Q1 LATER (March 2026)
  (
    'cc000000-0000-0000-0000-000000000023',
    'Risk Scoring Engine',
    'Real-time credit risk scoring for loan applications. Target: sub-100ms scoring with 95% model accuracy.',
    'a0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'scoping',
    28000000,
    ARRAY['AI/ML', 'DBSQL', 'Unity Catalog'],
    ARRAY['1/26/26 MJ - Model requirements documented with risk team', '1/22/26 MJ - Historical loan performance data identified, 5 years available'],
    ARRAY['Chief Risk Officer', 'Credit Analytics Lead'],
    '2026-03-10',
    '2026-01-15T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000024',
    'Customer Support Analytics',
    'Support ticket analytics with sentiment analysis and resolution time prediction. Integrates with Zendesk.',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'validating',
    9500000,
    ARRAY['AI/ML', 'AI/BI'],
    ARRAY['1/27/26 SC - Zendesk API access configured for data extraction', '1/24/26 SC - Support ticket volume analysis: 50K tickets/month'],
    ARRAY['VP Customer Support', 'Support Operations Lead'],
    '2026-03-15',
    '2026-01-18T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000025',
    'Network Traffic Analysis',
    'Deep packet inspection analytics for network security. Real-time threat detection across 10Gbps of traffic.',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'validating',
    36000000,
    ARRAY['DBSQL', 'AI/ML'],
    ARRAY['1/28/26 LP - Security team briefed on architecture approach', '1/25/26 LP - Network topology mapped, identified key monitoring points'],
    ARRAY['CISO', 'Network Security Lead'],
    '2026-03-25',
    '2026-01-22T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000026',
    'Revenue Recognition Automation',
    'Automated ASC 606 revenue recognition with audit trail. Handles complex multi-element arrangements.',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'scoping',
    15000000,
    ARRAY['DBSQL', 'Unity Catalog'],
    ARRAY['1/27/26 AK - Rev rec rules documented for top 10 contract types', '1/23/26 AK - Contract data assessment complete, 3 years of billing data'],
    ARRAY['Controller', 'Revenue Accounting Lead'],
    '2026-03-30',
    '2026-01-20T00:00:00Z'
  ),
  -- Q2 (April - June 2026)
  (
    'cc000000-0000-0000-0000-000000000027',
    'Clinical Trial Analytics',
    'Real-world evidence analytics for clinical trials. FDA 21 CFR Part 11 compliant with full audit trail.',
    'a0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'validating',
    45000000,
    ARRAY['AI/ML', 'Unity Catalog', 'DBSQL'],
    ARRAY['1/28/26 AK - Compliance requirements documented for FDA submission', '1/25/26 AK - Initial discovery call with clinical operations team'],
    ARRAY['Chief Medical Officer', 'Clinical Data Lead'],
    '2026-04-15',
    '2026-01-25T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000028',
    'Smart Pricing Engine',
    'Dynamic pricing optimization using ML for e-commerce. A/B testing framework for price elasticity.',
    'a0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'validating',
    23000000,
    ARRAY['AI/ML', 'AI/BI'],
    ARRAY['1/26/26 JL - Pricing strategy workshop completed with merchandising', '1/22/26 JL - Historical transaction data scoped, 2 years available'],
    ARRAY['VP Merchandising', 'Pricing Analytics Lead'],
    '2026-05-01',
    '2026-01-20T00:00:00Z'
  ),
  (
    'cc000000-0000-0000-0000-000000000029',
    'Fleet Telematics Platform',
    'Real-time fleet tracking and route optimization for 5,000 vehicles. Fuel efficiency and driver safety scoring.',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'validating',
    27000000,
    ARRAY['AI/ML', 'DBSQL'],
    ARRAY['1/27/26 LP - Telematics device compatibility assessment complete', '1/23/26 LP - Fleet size confirmed: 5,000 vehicles across 3 regions'],
    ARRAY['VP Logistics', 'Fleet Operations Lead'],
    '2026-06-15',
    '2026-01-22T00:00:00Z'
  ),
  -- Q3/Q4 (July - December 2026)
  (
    'cc000000-0000-0000-0000-000000000030',
    'Digital Twin Manufacturing',
    'Digital twin simulation for manufacturing processes. Real-time process optimization with what-if analysis.',
    'a0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'validating',
    52000000,
    ARRAY['AI/ML', 'DBSQL', 'Unity Catalog'],
    ARRAY['1/28/26 LP - Initial requirements gathering with plant managers', '1/25/26 LP - Manufacturing process documentation reviewed'],
    ARRAY['VP Manufacturing', 'Digital Transformation Lead'],
    '2026-09-01',
    '2026-01-25T00:00:00Z'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  stage = EXCLUDED.stage,
  value_cents = EXCLUDED.value_cents,
  databricks_services = EXCLUDED.databricks_services,
  next_steps = EXCLUDED.next_steps,
  stakeholders = EXCLUDED.stakeholders,
  go_live_date = EXCLUDED.go_live_date;

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
