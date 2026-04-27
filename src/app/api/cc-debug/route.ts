import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const num = req.nextUrl.searchParams.get('reg') ?? '200053'
  const apiKey = process.env.CHARITY_COMMISSION_API_KEY

  if (!apiKey) return NextResponse.json({ error: 'no_api_key' }, { status: 502 })

  try {
    const finRes = await fetch(
      `https://api.charitycommission.gov.uk/register/api/charityFinancialHistory/${num}/0`,
      {
        headers: { Accept: 'application/json', 'Ocp-Apim-Subscription-Key': apiKey },
        cache: 'no-store',
      }
    )

    const finRaw = await finRes.text()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any
    try { parsed = JSON.parse(finRaw) } catch { parsed = null }

    // Find the actual array regardless of nesting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records: any[] = []
    if (Array.isArray(parsed)) {
      records = parsed
    } else if (parsed && typeof parsed === 'object') {
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val)) { records = val as typeof records; break }
      }
    }

    return NextResponse.json({
      httpStatus: finRes.status,
      httpOk: finRes.ok,
      isArray: Array.isArray(parsed),
      topLevelKeys: parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.keys(parsed)
        : null,
      recordCount: records.length,
      firstRecordKeys: records[0] ? Object.keys(records[0]) : null,
      firstRecord: records[0] ?? null,
      rawFirst300: finRaw.slice(0, 300),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
