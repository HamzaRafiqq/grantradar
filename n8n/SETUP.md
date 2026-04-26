# FundsRadar n8n Automation Setup

## Prerequisites

- n8n self-hosted on Railway (your instance URL)
- FundsRadar PostgreSQL connection string (Supabase transaction pooler)
- Brevo (Sendinblue) API key
- Charity Commission API key (already in .env.local)

---

## Step 1 — Add n8n Credentials

In your n8n instance, go to **Settings → Credentials** and create:

### 1a. PostgreSQL — "FundsRadar DB"

| Field    | Value                                                                             |
| -------- | --------------------------------------------------------------------------------- |
| Host     | `aws-0-eu-west-2.pooler.supabase.com`                                             |
| Port     | `6543`                                                                            |
| Database | `postgres`                                                                        |
| User     | `postgres.qwusrijtsrdhdkhvddei` (your Supabase project ref)                      |
| Password | Your Supabase DB password (Settings → Database → Connection string)               |
| SSL      | **Require**                                                                       |

After saving the credential, copy its **Credential ID** — you'll need to replace
`REPLACE_WITH_YOUR_POSTGRES_CREDENTIAL_ID` in each workflow JSON before importing.

---

## Step 2 — Add n8n Variables

Go to **Settings → Variables** and create:

| Variable name               | Value                              |
| --------------------------- | ---------------------------------- |
| `BREVO_API_KEY`             | Your Brevo transactional API key   |
| `INTERNAL_API_SECRET`       | `fundsradar_internal_2026`         |
| `CHARITY_COMMISSION_API_KEY`| `7a3ea3e8ec664799b0fa8dfec9a01169` |

---

## Step 3 — Update .env.local in FundsRadar

Add your Railway n8n URL to `.env.local`:

```
N8N_BASE_URL=https://your-n8n.railway.app
INTERNAL_API_SECRET=fundsradar_internal_2026
```

Also add to Vercel Environment Variables (Production + Preview).

---

## Step 4 — Import the 5 Workflows

Before importing each JSON, open it and replace every occurrence of:
```
REPLACE_WITH_YOUR_POSTGRES_CREDENTIAL_ID
```
with your actual PostgreSQL credential ID from Step 1.

Then in n8n:
1. Go to **Workflows → Import from file**
2. Import each `.json` file in order

| File                                       | What it does                                   |
| ------------------------------------------ | ---------------------------------------------- |
| `workflow-1-nightly-grant-import.json`     | Nightly 360Giving import at 2 AM UTC           |
| `workflow-2-new-charity-signup.json`       | Welcome flow triggered on new charity signup   |
| `workflow-3-daily-deadline-reminders.json` | Daily deadline alerts at 8 AM UTC              |
| `workflow-4-upgrade-trigger.json`          | Upgrade nudge email (1hr after gate hit)       |
| `workflow-5-weekly-trust-score.json`       | Weekly trust score email every Sunday midnight |

---

## Step 5 — Get Your Webhook URLs

After importing Workflows 2 and 4, click each **Webhook node** to find its URL.
The format will be:

```
Workflow 2: https://your-n8n.railway.app/webhook/new-charity
Workflow 4: https://your-n8n.railway.app/webhook/upgrade-trigger
```

These are already wired into FundsRadar via `src/lib/n8n-webhooks.ts` — you just
need to set `N8N_BASE_URL` and the webhooks fire automatically.

---

## Step 6 — Activate the Workflows

Toggle each workflow to **Active** in n8n. Scheduled workflows will run on their
cron schedule. Webhook workflows are live immediately once activated.

---

## Webhook Integration Points in FundsRadar

| Event                      | Where it fires                                   | n8n Workflow |
| -------------------------- | ------------------------------------------------ | ------------ |
| New charity completes onboarding | `src/app/onboarding/page.tsx` → `/api/n8n/new-charity` | Workflow 2 |
| Free user hits grant gate  | `src/app/api/upgrade-trigger/route.ts`           | Workflow 4   |

---

## Workflow Schedule Summary

| Workflow | Schedule          | Notes                           |
| -------- | ----------------- | ------------------------------- |
| 1        | 2:00 AM UTC daily | 360Giving dataset import        |
| 2        | Webhook trigger   | Fires on each new signup        |
| 3        | 8:00 AM UTC daily | Sends for 30/14/7/1 day marks   |
| 4        | Webhook trigger   | 1hr delay before email          |
| 5        | 00:00 UTC Sunday  | Weekly digest for all charities |

---

## Troubleshooting

- **Workflow not triggering**: Check that the workflow is **Active** in n8n
- **PostgreSQL connection error**: Verify SSL is set to "Require" and the pooler port is 6543 (not 5432)
- **Email not sending**: Check Brevo API key in n8n Variables and that the sender domain is verified in Brevo
- **Webhook 404**: Ensure the workflow is active — webhooks only work in active workflows
- **`x-internal-secret` 401**: Make sure `INTERNAL_API_SECRET` matches in both n8n Variables and Vercel env vars
