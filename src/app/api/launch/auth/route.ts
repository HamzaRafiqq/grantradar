import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const correct = process.env.LAUNCH_PASSWORD

  if (!correct || password !== correct) {
    return NextResponse.json({ error: 'Incorrect' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('launch_auth', correct, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
