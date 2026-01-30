-- ============================================================
-- LogFoodAgent — Chat Sessions Seed Data
-- Sample data for testing the Research Agent conversation history
-- ============================================================

-- Sample chat sessions
INSERT INTO chat_sessions (id, user_email, title, created_at, updated_at) VALUES
  (
    'f0000000-0000-0000-0000-000000000001',
    'ankit.yadav@databricks.com',
    'Summarize the latest meeting notes for Acme Corp',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_sessions (id, user_email, title, created_at, updated_at) VALUES
  (
    'f0000000-0000-0000-0000-000000000002',
    'ankit.yadav@databricks.com',
    'What use cases are in the POC stage?',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_sessions (id, user_email, title, created_at, updated_at) VALUES
  (
    'f0000000-0000-0000-0000-000000000003',
    'ankit.yadav@databricks.com',
    'Draft follow-up email for TechStart meeting',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- Messages for session 1
INSERT INTO chat_messages (id, session_id, role, content, status, created_at) VALUES
  (
    'ff000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'user',
    'Summarize the latest meeting notes for Acme Corp',
    'completed',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_messages (id, session_id, role, content, status, created_at) VALUES
  (
    'ff000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'assistant',
    '## Acme Corp Meeting Summary

The quarterly review with Acme Corporation focused on:

1. **Data Lakehouse Expansion** - POC environment is ready, client impressed with Delta Lake performance showing 10x improvement over legacy warehouse.

2. **ML Pipeline Automation** - Updated pricing proposal sent, awaiting VP Data Science approval. Q2 timeline aligned with ML engineering team.

### Key Stakeholders
- VP Engineering
- Data Team Lead
- CTO

### Next Steps
- Complete architecture sign-off with VP Engineering
- Finalize data quality pipeline for legacy ERP
- Schedule technical deep-dive for ML pipeline',
    'completed',
    NOW() - INTERVAL '2 days' + INTERVAL '30 seconds'
  )
ON CONFLICT (id) DO NOTHING;

-- Messages for session 2
INSERT INTO chat_messages (id, session_id, role, content, status, created_at) VALUES
  (
    'ff000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000002',
    'user',
    'What use cases are in the POC stage?',
    'completed',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_messages (id, session_id, role, content, status, created_at) VALUES
  (
    'ff000000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000002',
    'assistant',
    'Based on the current pipeline, here are the use cases in **POC/Evaluating** stage:

| Use Case | Account | Owner | Go-Live |
|----------|---------|-------|--------|
| Real-time Data Lakehouse | Acme Corporation | Sarah Chen | Jun 15, 2025 |
| Predictive Maintenance | DataFlow Systems | Lisa Park | Jul 1, 2025 |

Both are showing strong progress with positive client feedback.',
    'completed',
    NOW() - INTERVAL '1 day' + INTERVAL '45 seconds'
  )
ON CONFLICT (id) DO NOTHING;

-- Messages for session 3
INSERT INTO chat_messages (id, session_id, role, content, status, created_at) VALUES
  (
    'ff000000-0000-0000-0000-000000000005',
    'f0000000-0000-0000-0000-000000000003',
    'user',
    'Draft a follow-up email for the TechStart meeting about their fraud detection project',
    'completed',
    NOW() - INTERVAL '3 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_messages (id, session_id, role, content, status, created_at) VALUES
  (
    'ff000000-0000-0000-0000-000000000006',
    'f0000000-0000-0000-0000-000000000003',
    'assistant',
    'Here is a draft follow-up email:

---

**Subject:** Next Steps - Fraud Detection System Discussion

Hi Team,

Thank you for the productive discussion today about your fraud detection initiative. I wanted to summarize our key takeaways and next steps:

**What We Discussed:**
- Real-time scoring requirement (<100ms latency)
- 18 months of historical transaction data available
- Target: 40% reduction in fraud losses

**Next Steps:**
1. Feature engineering workshop scheduled for Feb 3
2. I will share sample architecture docs by EOW
3. Data readiness assessment follow-up

Please let me know if you have any questions.

Best regards',
    'completed',
    NOW() - INTERVAL '3 hours' + INTERVAL '1 minute'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT
  'chat_sessions' AS table_name,
  COUNT(*) AS count
FROM chat_sessions
UNION ALL
SELECT
  'chat_messages' AS table_name,
  COUNT(*) AS count
FROM chat_messages;
