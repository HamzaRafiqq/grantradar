import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FundsRadar Blog — Grant Tips & Funding Guides for UK Charities',
  description: 'Expert advice on UK charity funding, grant writing tips, and sector news to help your organisation find and win more grants.',
  openGraph: {
    title: 'FundsRadar Blog — Grant Tips & Funding Guides for UK Charities',
    description: 'Expert advice on UK charity funding, grant writing, and sector news.',
    type: 'website',
    locale: 'en_GB',
    siteName: 'FundsRadar',
  },
  robots: { index: true, follow: true },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
