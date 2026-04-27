import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const num = req.nextUrl.searchParams.get('reg') ?? '200053'
  const apiKey = process.env.CHARITY_COMMISSION_API_KEY

  if (!apiKey) return NextResponse.json({ error: 'no api key' }, { status: 502 })

  const finRes = await fetch(
    `https://api.charitycommission.gov.uk/register/api/charityFinancialHistory/${num}/0`,
    {
      headers: { Accept: 'application/json', 'Ocp-Apim-Subscription-Key': apiKey },
      cache: 'no-store',
    }
  )

  const finRaw = await finRes.text()

  let parsed: unknown
  try { parsed = JSON.parse(finRaw) } catch { parsed = finRaw }

  return NextResponse.json({
    status: finRes.status,
    isArray: Array.isArray(parsed),
    topLevelKeys: typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? Object.keys(parsed) : null,
    firstRecord: Array.isArray(parsed)
      ? parsed[0]
      : (typeof parsed === 'object' && parsed !== null
          ? Object.values(parsed as Record<string, unknown>).find(v => Array.isArray(v) && (v as unknown[]).length > 0)
              ? (Object.values(parsed as Record<string, unknown>).find(v => Array.isArray(v)) as unknown[])?.[0]
              : parsed
          : parsed),
    recordCount: Array.isArray(parsed) ? parsed.length : 'N/A',
    rawSnippet: finRaw.slice(0, 800),
  })
}
