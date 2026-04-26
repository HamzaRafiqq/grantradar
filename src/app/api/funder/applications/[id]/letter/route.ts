import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Ctx     = { params: Promise<{ id: string }> }
type LetterType = 'award' | 'decline'

const MODEL = 'claude-sonnet-4-20250514'
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

export async function POST(req: Request, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const { type }: { type: LetterType } = await req.json()

  // Fetch application details
  const { data: app } = await supabase
    .from('funder_applications')
    .select(`
      *,
      grant:funder_grants!inner(title, funder_id, decision_date),
      org:organisations(name, charity_number, website)
    `)
    .eq('id', id)
    .single()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((app.grant as { funder_id: string }).funder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: funder } = await supabase
    .from('funder_profiles')
    .select('org_name, org_type')
    .eq('id', user.id)
    .single()

  const grant   = app.grant as { title: string; decision_date?: string }
  const org     = app.org   as { name: string; charity_number?: string }
  const funderName = funder?.org_name ?? 'The Funder'
  const today   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const awardPrompt = `Draft a professional grant award letter on behalf of ${funderName} to ${org.name}.

Details:
- Grant: ${grant.title}
- Amount awarded: ${app.amount_requested ? `£${Number(app.amount_requested).toLocaleString()}` : '[AMOUNT]'}
- Organisation: ${org.name}${org.charity_number ? ` (Registered Charity ${org.charity_number})` : ''}
- Today's date: ${today}
- Grant period: [typically 12 months from start date]

The letter must include:
1. Congratulatory opening
2. Grant amount and purpose
3. Grant period and reporting requirements (6-month progress report + final report)
4. Conditions of the award (e.g. funds used as specified, acknowledge funder in communications)
5. Payment schedule (e.g. 50% upfront, 50% on interim report)
6. Next steps (sign and return agreement, provide bank details)
7. Contact details placeholder
8. Professional close

Write in a warm but professional tone. Use plain English. Format with clear sections. Include [PLACEHOLDER] where specific details are needed.`

  const declinePrompt = `Draft a professional, compassionate decline letter on behalf of ${funderName} to ${org.name}.

Details:
- Grant applied for: ${grant.title}
- Organisation: ${org.name}
- Today's date: ${today}

The letter must include:
1. Thank them for their application and acknowledge the quality of their work
2. Clearly communicate the decision not to fund at this time
3. A brief, constructive reason (high competition / outside current priorities / criteria not fully met — choose appropriately)
4. 2-3 specific, constructive suggestions to strengthen future applications
5. Encourage them to apply again in the next funding round if appropriate
6. Signpost any alternative funders or resources if possible
7. Warm, encouraging close

Write with empathy. Do not be vague. Be specific and actionable in the feedback. Plain English throughout.`

  const prompt = type === 'award' ? awardPrompt : declinePrompt

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: `You are an expert grant administrator with 20 years experience writing professional funder communications for UK grant-making organisations. Your letters are clear, warm, professional, and specific.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const letter = data.content?.[0]?.text ?? ''
    return NextResponse.json({ letter })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
