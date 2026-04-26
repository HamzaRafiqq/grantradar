/**
 * AI Application Writer — Claude-powered grant writing helpers.
 * All functions call the Anthropic Messages API directly (server-side only).
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': '2023-06-01',
  }
}

export interface CharityProfile {
  name: string
  beneficiaries?: string | null
  current_projects?: string | null
  annual_income?: string | null
  sector?: string | null
  location?: string | null
  nonprofit_type?: string | null
  charity_number?: string | null
}

const SYSTEM_WRITER = `You are a grant writing expert helping UK charities write compelling applications.
You know what funders want and how to present charity work persuasively.
Always write in plain English. Be specific and evidence-led.
Never use jargon or buzzwords. Write in the charity's voice, not a generic style.`

// ── Ghost text suggestion ──────────────────────────────────────────────────

export async function generateSuggestion(
  question: string,
  currentText: string,
  charityProfile: CharityProfile,
  grantCriteria: string,
): Promise<string> {
  const isBlank = !currentText.trim()

  const userContent = isBlank
    ? `Write one strong opening sentence to answer this grant question for the following charity.
Return only the sentence — no preamble, no explanation.

Charity: ${JSON.stringify(charityProfile)}
Grant criteria: ${grantCriteria}
Question: ${question}`
    : `The charity is: ${JSON.stringify(charityProfile)}

The grant criteria says: ${grantCriteria}

The question is: ${question}

What they have written so far: ${currentText}

Suggest the next 2–3 sentences to continue their answer.
Be specific to their charity and the grant criteria.
Write in their voice, not a generic style.
Return only the suggested text, nothing else.`

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 250,
      system: SYSTEM_WRITER,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

// ── Answer scoring ─────────────────────────────────────────────────────────

export interface ScoreResult {
  score: number
  strengths: string[]
  weaknesses: string[]
  improvements: string[]
}

export async function scoreAnswer(
  question: string,
  answer: string,
  grantCriteria: string,
  charityProfile: CharityProfile,
): Promise<ScoreResult> {
  if (!answer.trim()) {
    return { score: 0, strengths: [], weaknesses: ['No answer written yet'], improvements: ['Start writing your answer'] }
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      system: `You are a grant assessment expert for UK charities. Score objectively and helpfully.
Return ONLY valid JSON — no markdown, no code blocks, no explanation outside the JSON.`,
      messages: [{
        role: 'user',
        content: `Score this grant application answer out of 10.

Grant criteria: ${grantCriteria}
Charity: ${JSON.stringify(charityProfile)}
Question: ${question}
Answer: ${answer}

Return exactly this JSON structure (no other text):
{"score":7,"strengths":["strength 1","strength 2"],"weaknesses":["weakness 1"],"improvements":["specific improvement 1","specific improvement 2","specific improvement 3"]}`,
      }],
    }),
  })

  const data = await res.json()
  try {
    return JSON.parse(data.content[0].text)
  } catch {
    return { score: 0, strengths: [], weaknesses: [], improvements: ['Unable to score — please try again'] }
  }
}

// ── CMD+K commands ─────────────────────────────────────────────────────────

export type Command = 'shorter' | 'specific' | 'impact' | 'opening' | 'beneficiary'

export async function executeCommand(
  command: Command,
  text: string,
  charityProfile: CharityProfile,
  grantCriteria: string,
  question: string,
): Promise<string> {
  const profile = JSON.stringify(charityProfile)

  const instructions: Record<Command, string> = {
    shorter:
      `Reduce this text by approximately 30% while keeping every key point intact. Return only the revised text:\n\n${text}`,
    specific:
      `Make this text more specific by adding concrete details, real numbers, and examples drawn from this charity: ${profile}. Return only the revised text:\n\n${text}`,
    impact:
      `Weave in clear evidence of impact — quantified outcomes, reach figures, and beneficiary data from this charity profile: ${profile}. Return only the revised text:\n\n${text}`,
    opening:
      `Rewrite only the first sentence to be more compelling and direct. Return the full text with just the opening sentence improved:\n\n${text}`,
    beneficiary:
      `Add a brief, realistic beneficiary story that illustrates the charity's work. Base it on this profile: ${profile}. Weave it naturally into the text. Return the full revised text:\n\n${text}`,
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
      system: `${SYSTEM_WRITER}
Grant criteria context: ${grantCriteria}
Question being answered: ${question}`,
      messages: [{ role: 'user', content: instructions[command] }],
    }),
  })

  const data = await res.json()
  return data.content?.[0]?.text ?? text
}

// ── Full quality check ─────────────────────────────────────────────────────

export interface QualityResult {
  overallScore: number
  improvements: string[]
  readyToSubmit: boolean
}

export async function generateQualityCheck(
  answers: { question: string; answer: string }[],
  grantCriteria: string,
  charityProfile: CharityProfile,
): Promise<QualityResult> {
  const answered = answers.filter(a => a.answer.trim().length > 50)
  if (answered.length === 0) {
    return { overallScore: 0, improvements: ['No substantive answers written yet'], readyToSubmit: false }
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: `You are a grant assessment expert for UK charity applications.
Return ONLY valid JSON — no markdown, no code blocks.`,
      messages: [{
        role: 'user',
        content: `Review this complete grant application and give an overall quality score out of 100.

Grant criteria: ${grantCriteria}
Charity: ${JSON.stringify(charityProfile)}
Questions and answers: ${JSON.stringify(answered)}

Return exactly this JSON (no other text):
{"overallScore":74,"improvements":["improvement 1","improvement 2","improvement 3"],"readyToSubmit":false}`,
      }],
    }),
  })

  const data = await res.json()
  try {
    return JSON.parse(data.content[0].text)
  } catch {
    return { overallScore: 0, improvements: ['Assessment failed — please try again'], readyToSubmit: false }
  }
}
