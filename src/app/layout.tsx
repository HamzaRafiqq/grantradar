import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'FundsRadar — Find Grants Your Nonprofit is Missing',
  description: 'FundsRadar matches your nonprofit to hundreds of grants worldwide using AI — saving your team 8-10 hours every week.',
  keywords: 'nonprofit grants, grant finder, charity funding, grant tracker, nonprofit grants worldwide, NGO funding',
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
