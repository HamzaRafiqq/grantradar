import type { Metadata } from 'next'
import Script from 'next/script'
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
      <body>
        {children}
        {/* Crisp live chat widget */}
        <Script id="crisp-chat" strategy="afterInteractive">{`
          window.$crisp=[];
          window.CRISP_WEBSITE_ID="YOUR_CRISP_WEBSITE_ID";
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
