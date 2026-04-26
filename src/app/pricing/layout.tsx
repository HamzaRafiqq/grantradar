import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — FundsRadar',
  description: 'Simple, honest pricing for UK charities. Start free, upgrade when you\'re ready to unlock AI grant matching, application drafts, and deadline alerts.',
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
