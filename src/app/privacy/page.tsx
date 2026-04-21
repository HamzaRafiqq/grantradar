import Navbar from '@/components/ui/Navbar'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-[#0D1117] mb-3">Privacy Policy</h1>
          <p className="text-gray-400 text-sm">Last updated: April 2026</p>
        </div>

        <div className="space-y-8">
          {[
            {
              title: '1. Who we are',
              body: 'GrantRadar is operated by GrantRadar Ltd. We provide an AI-powered grant discovery platform for UK charities. Our contact email is hello@grantradar.co.uk.',
            },
            {
              title: '2. What data we collect',
              body: `We collect the following personal data:
• Account data: your name, email address, and password (encrypted).
• Organisation data: charity name, registration number, sector, location, annual income, and project details you provide during onboarding.
• Usage data: which grants you view, save, and apply for; how you use the platform.
• Payment data: processed entirely by Stripe. We never store card numbers or bank details.
• Communications: any emails you send to us.`,
            },
            {
              title: '3. How we use your data',
              body: `We use your data to:
• Match your charity profile against grants in our database.
• Generate AI-powered eligibility assessments and application drafts.
• Send you email alerts about deadlines and new matches (with your consent).
• Process payments via Stripe.
• Improve our platform and fix bugs.
• Comply with legal obligations.`,
            },
            {
              title: '4. Legal basis for processing',
              body: 'We process your data under the following legal bases under UK GDPR: (a) Contract — processing necessary to provide the service you signed up for; (b) Legitimate interests — improving our service, fraud prevention; (c) Consent — email marketing communications (you can withdraw consent at any time).',
            },
            {
              title: '5. Third parties we use',
              body: `We share your data with the following third-party processors:
• Supabase (database hosting) — EU/US data processing under Standard Contractual Clauses.
• Anthropic (Claude AI) — grant analysis and draft generation. Prompts may include your charity profile.
• Stripe (payments) — payment processing. Stripe is PCI-DSS compliant.
• Vercel (hosting) — website and API hosting.
• Resend (email delivery) — transactional and alert emails.
We do not sell your data to any third parties.`,
            },
            {
              title: '6. Data retention',
              body: 'We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or financial compliance purposes.',
            },
            {
              title: '7. Your rights under UK GDPR',
              body: `You have the following rights:
• Right to access — request a copy of your personal data.
• Right to rectification — correct inaccurate data.
• Right to erasure — request deletion of your data.
• Right to restriction — limit how we process your data.
• Right to data portability — receive your data in a portable format.
• Right to object — object to processing based on legitimate interests.
To exercise any of these rights, email hello@grantradar.co.uk. We will respond within 30 days.`,
            },
            {
              title: '8. Cookies',
              body: 'We use essential cookies to keep you logged in and make the platform work. We do not use advertising or tracking cookies. We use a session cookie from Supabase for authentication purposes.',
            },
            {
              title: '9. Security',
              body: 'We use industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and row-level security on our database. Payment data is handled entirely by Stripe and never touches our servers.',
            },
            {
              title: '10. Contact',
              body: 'If you have questions about this privacy policy or how we handle your data, please email hello@grantradar.co.uk. You also have the right to lodge a complaint with the Information Commissioner\'s Office (ICO) at ico.org.uk.',
            },
          ].map(section => (
            <div key={section.title} className="card">
              <h2 className="font-display text-xl font-bold text-[#0D1117] mb-3">{section.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{section.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
