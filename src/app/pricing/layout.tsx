import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FundsRadar Pricing — From £9/month | UK Grant Management',
  description: 'Simple, honest pricing for UK charities. Start free forever, upgrade from £9/month to unlock unlimited AI grant matching, application drafts, and deadline alerts.',
  openGraph: {
    title: 'FundsRadar Pricing — From £9/month | UK Grant Management',
    description: 'Start free. Upgrade from £9/month. Built for UK charities.',
    type: 'website',
    locale: 'en_GB',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
