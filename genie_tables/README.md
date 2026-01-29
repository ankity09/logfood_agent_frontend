# Genie Space Tables

This folder contains Jupyter notebooks for creating and populating tables in the Databricks Genie Space under catalog `ankit_yadav.demo`.

## Tables

| # | Notebook | Table | Description |
|---|----------|-------|-------------|
| 1 | `01_dim_accounts.ipynb` | `ankit_yadav.demo.dim_accounts` | Account dimension with customer details and sales hierarchy |
| 2 | `02_dim_use_cases.ipynb` | `ankit_yadav.demo.dim_use_cases` | Use case dimension with progression stages |
| 3 | `03_fact_consumption_daily.ipynb` | `ankit_yadav.demo.fact_consumption_daily` | Daily grain consumption and revenue metrics |
| 4 | `04_fact_consumption_weekly.ipynb` | `ankit_yadav.demo.fact_consumption_weekly` | Weekly aggregated consumption (from daily) |
| 5 | `05_fact_consumption_monthly.ipynb` | `ankit_yadav.demo.fact_consumption_monthly` | Monthly aggregated consumption (from daily) |

## Data Model

```
┌─────────────────┐     ┌─────────────────┐
│  dim_accounts   │     │  dim_use_cases  │
│  (12 accounts)  │◄────│  (22 use cases) │
└────────┬────────┘     └─────────────────┘
         │
         │ account_id
         ▼
┌─────────────────────────────┐
│   fact_consumption_daily    │
│   (90 days × accounts × SKUs)│
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
2. **02_dim_use_cases.ipynb** - Creates use cases dimension (references dim_accounts)
3. **03_fact_consumption_daily.ipynb** - Creates daily consumption (references dim_accounts)
4. **04_fact_consumption_weekly.ipynb** - Aggregates from daily (depends on #3)
5. **05_fact_consumption_monthly.ipynb** - Aggregates from daily (depends on #3)

## Demo Data Summary

- **12 accounts** across 3 AEMs (Marcus Chen, Elena Rodriguez, David Park)
- **22 use cases** across 6 stages (Validating through Onboarding)
- **90 days** of daily consumption data
- **6 SKUs**: JOBS_COMPUTE, SQL_COMPUTE, ALL_PURPOSE_COMPUTE, MODEL_SERVING, DELTA_LIVE_TABLES
- **2 platforms**: AWS, Azure

## Use Case Stages

```
1-Validating → 2-Scoping → 3-Evaluating → 4-Confirming → 5-Onboarding → 6-Live
```

## Integration with Lakebase

The Delta tables in `ankit_yadav.demo.*` serve as the **source of truth** for analytics and Genie queries. The Lakebase (Postgres) tables in `db/` power the app experience.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Delta Lake (Unity Catalog)                  │
│                      ankit_yadav.demo.*                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ dim_accounts │  │dim_use_cases │  │ fact_consumption_*     │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
│         │                  │                     │               │
│         └──────────────────┴─────────────────────┘               │
│                            │                                     │
│                     Genie Space                                  │
│                   (Analytics/NLQ)                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                      ┌──────▼──────┐
                      │   Sync/ETL  │  (Future: read-only views)
                      └──────┬──────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Lakebase (Postgres)                          │
│                    databricks_postgres                          │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ accounts │  │ use_cases │  │meeting_notes│  │ activities │  │
│  └──────────┘  └───────────┘  └─────────────┘  └────────────┘  │
│                            │                                     │
│                     App Frontend                                 │
│                   (React + Express)                              │
└─────────────────────────────────────────────────────────────────┘
```

### Future: Read-Only Views in Lakebase

To sync Delta tables to Lakebase as read-only views:

```sql
-- Example: Create a foreign data wrapper or materialized view
-- that syncs from Delta Lake to Lakebase for app consumption
```

## Sample Genie Questions

After populating the tables, you can ask questions like:

**Consumption:**
- "What is the total revenue for last month?"
- "Which accounts have the highest DBU consumption?"
- "Show me week-over-week revenue growth by AEM"
- "What SKUs drive the most revenue?"

**Use Cases:**
- "How many use cases are in each stage?"
- "Which use cases have been stuck in the same stage the longest?"
- "Show me the pipeline value by AEM"
- "What accounts have use cases in the Confirming stage?"

**Combined:**
- "For accounts with use cases in Onboarding, what is their current monthly consumption?"
- "Compare pipeline value vs actual consumption by account"
