import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { grantId } = await req.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: org } = await supabase
      .from('organisations')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!org) return NextResponse.json({ error: 'No organisation found' }, { status: 404 })

    const { data: grant } = await supabase
      .from('grants')
      .select('*')
      .eq('id', grantId)
      .single()

    if (!grant) return NextResponse.json({ error: 'Grant not found' }, { status: 404 })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are an expert UK charity grant writer with 20 years of experience.
Write compelling, specific grant application content that matches the funder's priorities.
Write in a warm, professional tone appropriate for UK charity sector communications.
Do not use generic phrases like "we are delighted" or "we are pleased to apply."`,
      messages: [
        {
          role: 'user',
          content: `Write an opening introduction paragraph (approximately 200 words) for a grant application from ${org.name} applying to ${grant.name} by ${grant.funder}.

Charity work: ${org.beneficiaries}
Current projects: ${org.current_projects}
Grant criteria: ${grant.eligibility_criteria}
Grant description: ${grant.description}

Make it warm, specific, and compelling. Reference the charity's actual work and connect it directly to what this specific funder cares about. Do not use generic phrases.`,
        },
      ],
    })

    const draft = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ draft })
  } catch (err) {
    console.error('Draft error:', err)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
