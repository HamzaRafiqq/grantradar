import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Funder Portal — FundsRadar',
  robots: { index: false, follow: false },
}

export default function FunderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
