# Genie Space Tables

This folder contains Jupyter notebooks for creating and populating tables in the Databricks Genie Space under catalog `ankit_yadav.demo`.

**Important:** The data in these tables is aligned with the Lakebase tables in `db/seed.sql` for demo coherence.

## Tables

| # | Notebook | Table | Description |
|---|----------|-------|-------------|
| 1 | `01_dim_accounts.ipynb` | `ankit_yadav.demo.dim_accounts` | Account dimension (5 accounts from Lakebase) |
| 2 | `02_dim_use_cases.ipynb` | `ankit_yadav.demo.dim_use_cases` | Use case dimension (10 use cases from Lakebase) |
| 3 | `03_fact_consumption_daily.ipynb` | `ankit_yadav.demo.fact_consumption_daily` | Daily consumption metrics (90 days) |
| 4 | `04_fact_consumption_weekly.ipynb` | `ankit_yadav.demo.fact_consumption_weekly` | Weekly aggregated consumption |
| 5 | `05_fact_consumption_monthly.ipynb` | `ankit_yadav.demo.fact_consumption_monthly` | Monthly aggregated consumption |

## Data Alignment with Lakebase

### Accounts (5)

| Genie ID | Lakebase UUID | Account Name | Industry | SA (Owner) |
|----------|---------------|--------------|----------|------------|
| ACCT001 | a0...001 | Acme Corporation | Technology | Sarah Chen |
| ACCT002 | a0...002 | TechStart Inc | Fintech | Mike Johnson |
| ACCT003 | a0...003 | DataFlow Systems | Manufacturing | Lisa Park |
| ACCT004 | a0...004 | CloudNine Analytics | E-commerce | James Lee |
| ACCT005 | a0...005 | MetricPulse AI | AI/Analytics | Anna Kim |

### Use Cases (10)

| Genie ID | Account | Use Case | Stage | Value |
|----------|---------|----------|-------|-------|
| UC001 | Acme Corporation | Real-time Data Lakehouse | 3-Evaluating | $250K |
| UC002 | Acme Corporation | ML Pipeline Automation | 4-Confirming | $180K |
| UC003 | TechStart Inc | Customer 360 Analytics | 1-Validating | $120K |
| UC004 | TechStart Inc | Fraud Detection System | 2-Scoping | $300K |
| UC005 | DataFlow Systems | Data Governance Platform | 4-Confirming | $200K |
| UC006 | DataFlow Systems | Predictive Maintenance | 3-Evaluating | $350K |
| UC007 | CloudNine Analytics | Recommendation Engine | 6-Live | $150K |
| UC008 | CloudNine Analytics | Supply Chain Optimization | 1-Validating | $280K |
| UC009 | MetricPulse AI | NLP Document Processing | 2-Scoping | $175K |
| UC010 | MetricPulse AI | Executive BI Dashboards | 5-Onboarding | $90K |

### AEM Assignments

| AEM | Accounts | Use Cases |
|-----|----------|-----------|
| Marcus Chen | Acme Corporation, TechStart Inc | 4 use cases |
| Elena Rodriguez | DataFlow Systems, CloudNine Analytics | 4 use cases |
| David Park | MetricPulse AI | 2 use cases |

## Data Model

```
┌─────────────────┐     ┌─────────────────┐
│  dim_accounts   │     │  dim_use_cases  │
│  (5 accounts)   │◄────│  (10 use cases) │
└────────┬────────┘     └─────────────────┘
         │
         │ account_id (ACCT001-005)
         ▼
┌─────────────────────────────┐
│   fact_consumption_daily    │
│   (90 days × 5 accounts)    │
└──────────────┬──────────────┘
               │
       ┌───────┴───────┐
       │ aggregate     │ aggregate
       ▼               ▼
┌─────────────┐ ┌──────────────┐
│   weekly    │ │   monthly    │
└─────────────┘ └──────────────┘
```

## Execution Order

Run the notebooks in order:

1. **01_dim_accounts.ipynb** - Creates account dimension (no dependencies)
2. **02_dim_use_cases.ipynb** - Creates use cases dimension (references accounts)
3. **03_fact_consumption_daily.ipynb** - Creates daily consumption (references dim_accounts)
4. **04_fact_consumption_weekly.ipynb** - Aggregates from daily (depends on #3)
5. **05_fact_consumption_monthly.ipynb** - Aggregates from daily (depends on #3)

## Use Case Stages

```
1-Validating → 2-Scoping → 3-Evaluating → 4-Confirming → 5-Onboarding → 6-Live
```

Maps to Lakebase stages: `validating`, `scoping`, `evaluating`, `confirming`, `onboarding`, `live`

## Integration with Lakebase

The Delta tables in `ankit_yadav.demo.*` serve as the **source of truth** for analytics and Genie queries. The Lakebase (Postgres) tables in `db/` power the app experience.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Delta Lake (Unity Catalog)                  │
│                      ankit_yadav.demo.*                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ dim_accounts │  │dim_use_cases │  │ fact_consumption_*     │ │
│  │ (ACCT001-5)  │  │ (UC001-010)  │  │ (90 days data)         │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│                            │                                     │
│                     Genie Space                                  │
│                   (Analytics/NLQ)                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                      Same accounts & use cases
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Lakebase (Postgres)                          │
│                    databricks_postgres                          │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ accounts │  │ use_cases │  │meeting_notes│  │ activities │  │
│  │ (5)      │  │ (10)      │  │             │  │            │  │
│  └──────────┘  └───────────┘  └─────────────┘  └────────────┘  │
│                            │                                     │
│                     App Frontend                                 │
│                   (React + Express)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Sample Genie Questions

After populating the tables, you can ask questions like:

**Consumption:**
- "What is the total revenue for Acme Corporation last month?"
- "Which account has the highest DBU consumption?"
- "Show me week-over-week revenue growth for TechStart Inc"
- "What SKUs does DataFlow Systems use the most?"

**Use Cases:**
- "How many use cases are in each stage?"
- "Which use cases owned by Sarah Chen are in Evaluating stage?"
- "Show me the pipeline value for Marcus Chen's accounts"
- "What is the total pipeline value for accounts in the Confirming stage?"

**Combined:**
- "For Acme Corporation, compare their pipeline value vs actual monthly consumption"
- "Which accounts have use cases in Onboarding and what is their current consumption?"
- "Show me TechStart Inc's Fraud Detection use case details and their DBU usage"
