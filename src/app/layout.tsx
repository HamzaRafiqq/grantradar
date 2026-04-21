import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GrantRadar — Find Grants Your Charity is Missing',
  description: 'AI-powered grant discovery for UK charities. Find, track and apply for grants your charity is eligible for. Save 8-10 hours per week.',
  keywords: 'UK charity grants, grant finder, charity funding, grant tracker, nonprofit grants UK',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
