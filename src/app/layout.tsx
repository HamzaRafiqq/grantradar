import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'FundsRadar — Find Grants Your Charity is Missing',
  description: 'FundsRadar matches your UK charity to hundreds of grants using AI — saving your fundraising team 8–10 hours every week.',
  keywords: 'charity grants UK, grant finder, charity funding, grant tracker, UK charity grants, fundraising tool',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Crisp live chat widget */}
        <Script id="crisp-chat" strategy="afterInteractive">{`
          window.$crisp=[];
          window.CRISP_WEBSITE_ID="13e9e21d-6e78-4b58-9f4f-4e431bf507dc";
          (function(){
            var d=document;
            var s=d.createElement("script");
            s.src="https://client.crisp.chat/l.js";
            s.async=1;
            d.getElementsByTagName("head")[0].appendChild(s);
          })();
        `}</Script>
      </body>
    </html>
  )
}
