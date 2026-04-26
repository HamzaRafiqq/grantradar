/**
 * n8n Webhook Integration
 *
 * Sends fire-and-forget POST requests to n8n webhook triggers.
 * All calls are non-blocking — failures are logged but never throw.
 *
 * Set N8N_BASE_URL in your .env.local:
 *   N8N_BASE_URL=https://your-n8n.railway.app
 */

const N8N_BASE_URL = process.env.N8N_BASE_URL?.replace(/\/$/, '') ?? ''

async function callWebhook(path: string, payload: object): Promise<void> {
  if (!N8N_BASE_URL) {
    console.warn(`[n8n] N8N_BASE_URL not set — skipping webhook ${path}`)
    return
  }

  const url = `${N8N_BASE_URL}/webhook/${path}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Non-blocking: don't hold the request open
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.error(`[n8n] Webhook ${path} responded ${res.status}`)
    }
  } catch (err) {
    // Never let n8n failures break the main app flow
    console.error(`[n8n] Webhook ${path} failed:`, err)
  }
}

// ── Workflow 2: New Charity Signup ─────────────────────────────────────────────

export interface NewCharityPayload {
  userId:        string
  orgId:         string
  email:         string
  orgName:       string
  charityNumber: string | null
  country:       string
}

/**
 * Call after onboarding completes — triggers CC lookup, grant matching,
 * and the welcome email.
 */
export async function notifyNewCharitySignup(payload: NewCharityPayload) {
  return callWebhook('new-charity', payload)
}

// ── Workflow 4: Upgrade Trigger ────────────────────────────────────────────────

export interface UpgradeTriggerPayload {
  userId:      string
  email:       string
  orgName:     string
  grantId:     string
  grantTitle:  string
  grantFunder: string
}

/**
 * Call when a free-plan user hits a locked grant.
 * n8n waits 1 hour then checks if they've upgraded before sending the nudge.
 */
export async function notifyUpgradeTrigger(payload: UpgradeTriggerPayload) {
  return callWebhook('upgrade-trigger', payload)
}
