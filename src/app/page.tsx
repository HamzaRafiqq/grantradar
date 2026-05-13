import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'
import ScrollReveal from '@/components/ui/ScrollReveal'
import PricingToggle from '@/components/ui/PricingToggle'
import AnimatedHero from '@/components/ui/AnimatedHero'
import CountUp from '@/components/ui/CountUp'

export const metadata: Metadata = {
  title: 'FundsRadar — AI Grant Discovery for UK Charities',
  description: 'FundsRadar matches your UK charity to 300+ active grants using AI, explains your eligibility, and helps you draft applications — saving your team 8–10 hours every week.',
  openGraph: {
    title: 'FundsRadar — AI Grant Discovery for UK Charities',
    description: 'Find funding your charity is missing. Stop searching. Start winning.',
    type: 'website',
    locale: 'en_GB',
    siteName: 'FundsRadar',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FundsRadar — AI Grant Discovery for UK Charities',
    description: 'Find funding your charity is missing. Stop searching. Start winning.',
  },
  robots: { index: true, follow: true },
}

const benefits = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke="#0F4C35" strokeWidth="2"/>
        <circle cx="14" cy="14" r="5" fill="#00C875"/>
        <line x1="14" y1="2" x2="14" y2="5" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
        <line x1="23" y1="14" x2="26" y2="14" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
        <line x1="2" y1="14" x2="5" y2="14" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
        <line x1="14" y1="23" x2="14" y2="26" stroke="#0F4C35" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Instant Grant Discovery',
    desc: 'Our AI scans 300+ active UK grants and matches them to your charity profile in seconds — not hours.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="5" width="22" height="18" rx="3" stroke="#0F4C35" strokeWidth="2"/>
        <path d="M9 13l3.5 3.5L19 10" stroke="#00C875" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Eligibility Explained',
    desc: 'For every match, Claude AI tells you exactly why you qualify — and what to watch out for before you apply.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="5" y="3" width="18" height="22" rx="3" stroke="#0F4C35" strokeWidth="2"/>
        <line x1="9" y1="9" x2="19" y2="9" stroke="#00C875" strokeWidth="2" strokeLinecap="round"/>
        <line x1="9" y1="14" x2="19" y2="14" stroke="#00C875" strokeWidth="2" strokeLinecap="round"/>
        <line x1="9" y1="19" x2="14" y2="19" stroke="#00C875" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'AI Application Drafts',
    desc: 'Get a tailored opening paragraph for every application in 10 seconds. Your fundraising team edits, not rewrites from scratch.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4C9.58 4 6 7.58 6 12c0 5.25 8 14 8 14s8-8.75 8-14c0-4.42-3.58-8-8-8z" stroke="#0F4C35" strokeWidth="2"/>
        <circle cx="14" cy="12" r="3" fill="#00C875"/>
        <path d="M14 2v2M14 22v2M2 12h2M22 12h2" stroke="#00C875" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Deadline Alerts',
    desc: 'Never miss a closing date. Get email alerts 30 days, 7 days and 48 hours before every matched grant closes.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Tell us about your charity',
    desc: 'Share your sector, size, and what you do. Takes about 3 minutes.',
  },
  {
    step: '02',
    title: 'We find your matches',
    desc: 'Our AI analyses 300+ active UK grants and scores your eligibility for each one in real time.',
  },
  {
    step: '03',
    title: 'Apply with confidence',
    desc: 'Track deadlines, get AI-written drafts, and move grants through your pipeline to won.',
  },
]

const testimonials = [
  {
    quote: "FundsRadar found us four grants we had no idea existed. We submitted two applications and won one within a month. The AI eligibility explanations saved us hours of reading through criteria.",
    name: 'Sarah Mitchell',
    role: 'Fundraising Manager',
    org: 'Brightside Youth Trust, Manchester',
    initials: 'SM',
  },
  {
    quote: "The AI draft generator is genuinely impressive. It reads the grant criteria and writes an opening that actually sounds like us. Our success rate has gone up since we started using it.",
    name: 'Priya Sharma',
    role: 'Development Director',
    org: 'Inclusive Arts Collective, London',
    initials: 'PS',
  },
  {
    quote: "We were spending two days a week searching for grants manually. FundsRadar cut that to under an hour. The deadline alerts alone have saved us from missing three closing dates.",
    name: 'James Okafor',
    role: 'CEO',
    org: 'Community Roots Foundation, Birmingham',
    initials: 'JO',
  },
  {
    quote: "The Charity Commission auto-fill was brilliant — it pulled in all our details in seconds. We had our first grant matches within five minutes of signing up.",
    name: 'Helen Cartwright',
    role: 'Fundraising Lead',
    org: 'Peaks & Valleys Trust, Sheffield',
    initials: 'HC',
  },
]

// ── Updated stats (item 1) ──────────────────────────────────────────────────
const stats = [
  { end: 1, prefix: '£', suffix: 'M+', label: 'Funding matched for UK charities' },
  { end: 300, suffix: '+', label: 'Active UK grants in database' },
  { end: 170000, label: 'UK charities we can help' },
  { end: 94, suffix: '%', label: 'Match accuracy rate' },
]

const funders = ['National Lottery', 'Esmée Fairbairn', 'Comic Relief', 'Lloyds Bank Foundation', 'The Henry Smith Charity', 'Paul Hamlyn Foundation']

// ── FAQ data (item 5) ──────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Is my charity\'s data safe?',
    a: 'Yes. All data is encrypted and stored on UK/EU servers. We are GDPR compliant and never sell your data.',
  },
  {
    q: 'How is FundsRadar different from searching online?',
    a: 'We match grants to your specific charity profile automatically. Instead of searching, you see only the grants you qualify for, scored by eligibility.',
  },
  {
    q: 'Do you cover all UK funders?',
    a: 'We pull from 360Giving (200+ funders), National Lottery, UKRI, Government grants, and more. Our database grows weekly.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, cancel from settings with one click. No questions asked.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />

      {/* Hero */}
      <AnimatedHero />

      {/* ── Trust badges (item 4) ──────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-400 font-medium text-center">
            <span className="flex items-center gap-1.5">
              <span>🇬🇧</span> Built for UK charities
            </span>
            <span className="hidden sm:inline text-gray-200">|</span>
            <span className="flex items-center gap-1.5">
              <span>📊</span> Data from Charity Commission &amp; 360Giving
            </span>
            <span className="hidden sm:inline text-gray-200">|</span>
            <span className="flex items-center gap-1.5">
              <span>🔒</span> Secured by Cloudflare
            </span>
            <span className="hidden sm:inline text-gray-200">|</span>
            <span className="flex items-center gap-1.5">
              <span>✅</span> GDPR Compliant
            </span>
          </div>
        </div>
      </section>

      {/* ── Social proof stats (item 1) ────────────────────────────────────── */}
      <section className="bg-white" style={{ borderBottom: '2px solid #E2E8E4' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s, i) => (
              <ScrollReveal key={s.label} delay={i * 100}>
                <div style={{ borderLeft: '3px solid #00C875', paddingLeft: '20px' }} className="text-left">
                  <div className="font-display font-extrabold text-[#0F4C35] text-[2rem] md:text-[3rem] leading-none">
                    <CountUp
                      end={s.end}
                      prefix={s.prefix ?? ''}
                      suffix={s.suffix ?? ''}
                      duration={1800}
                    />
                  </div>
                  <div className="text-gray-500 text-sm mt-1">{s.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Free tool callout — Grant Deadline Calendar (item 2) ──────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-2">
        <ScrollReveal>
          <div className="bg-[#0F4C35] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="text-5xl flex-shrink-0">🗓️</div>
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 bg-[#00C875]/20 rounded-full px-3 py-1 text-xs text-[#00C875] font-semibold mb-2">
                FREE TOOL — No signup required
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-1">
                UK Grant Deadline Calendar
              </h2>
              <p className="text-white/70 text-sm">
                See all UK grant deadlines for the next 90 days — updated weekly.
              </p>
            </div>
            <Link
              href="/deadlines"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-white text-[#0F4C35] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              View free calendar →
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-[50px] md:py-20">
        <ScrollReveal>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/80 border border-gray-200 rounded-full px-4 py-1.5 text-sm mb-5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#00C875]" />
              BUILT FOR UK CHARITIES
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#0D1117] mb-4">
              Everything your fundraising team needs
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Built for UK charities whose fundraising teams are stretched thin and can&apos;t afford to miss funding opportunities.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((b, i) => (
            <ScrollReveal key={b.title} delay={i * 80}>
              <div
                className="card hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group"
                style={{ borderTop: '3px solid #00C875' }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#E8F2ED] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[#0F4C35]/10 transition-all duration-300">
                  {b.icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-[#0D1117] mb-3">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-[#0F4C35] text-white py-[50px] md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Set up in 3 minutes. Find grants in seconds.
              </h2>
              <p className="text-white/70 text-lg max-w-xl mx-auto">
                No spreadsheets, no endless browsing. Just targeted, AI-matched funding opportunities for your charity.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 120}>
                <div className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-full w-full h-[2px] shimmer-line -translate-x-1/2" />
                  )}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#00C875] text-[#0D1117] flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-[0_0_20px_rgba(0,200,117,0.4)]">
                      {s.step}
                    </div>
                    <h3 className="font-display text-xl font-semibold text-white">{s.title}</h3>
                  </div>
                  <p className="text-[rgba(255,255,255,0.75)] text-[1rem] leading-relaxed pl-14">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <div className="text-center mt-12">
              <Link href="/signup" className="bg-white text-[#0F4C35] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors duration-200 inline-flex items-center gap-2 w-full sm:w-auto justify-center">
                Start for free
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-[50px] md:py-20">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#0D1117] mb-4">
              Trusted by UK charities
            </h2>
            <p className="text-gray-500 text-lg">Real results from UK charity fundraising teams.</p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 80}>
              <div
                className="card flex flex-col relative overflow-hidden hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300"
                style={{ borderLeft: '3px solid #00C875' }}
              >
                <div
                  className="absolute font-display select-none pointer-events-none"
                  style={{ fontSize: '5rem', color: '#00C875', opacity: 0.15, top: '10px', left: '16px', lineHeight: 1 }}
                >
                  &ldquo;
                </div>
                <div className="flex mb-4 relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} width="18" height="18" viewBox="0 0 18 18" fill="#00C875">
                      <path d="M9 1l2.39 4.84L17 6.76l-4 3.9.94 5.5L9 13.77l-4.94 2.39L5 10.66 1 6.76l5.61-.92z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed flex-1 italic relative z-10">&quot;{t.quote}&quot;</p>
                <div className="flex items-center gap-3 mt-6 relative z-10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0F4C35, #00C875)' }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#0D1117]">{t.name}</div>
                    <div className="text-gray-400 text-xs">{t.role}, {t.org}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Trust bar */}
        <ScrollReveal>
          <div className="text-center mt-10">
            <p className="text-[#9BADA6] text-sm">
              Grants we help you find:{' '}
              {funders.map((f, i) => (
                <span key={f}>
                  <span className="font-medium">{f}</span>
                  {i < funders.length - 1 && <span className="mx-2">•</span>}
                </span>
              ))}
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Pricing */}
      <section className="bg-[#F4F6F5] py-[50px] md:py-20 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#0D1117] mb-4">
              Simple, honest pricing
            </h2>
            <p className="text-gray-500 text-lg mb-10">Start free. Upgrade when you&apos;re ready to unlock everything.</p>
          </ScrollReveal>
          <PricingToggle />
        </div>
      </section>

      {/* ── FAQ section (item 5) ────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-[50px] md:py-20">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#0D1117] mb-3">
              Frequently asked questions
            </h2>
            <p className="text-gray-500 text-base">Everything you need to know before you get started.</p>
          </div>
        </ScrollReveal>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <ScrollReveal key={faq.q}>
              <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
                <h3 className="font-display font-semibold text-[#0D1117] mb-2 flex items-start gap-2">
                  <span className="text-[#00C875] flex-shrink-0 mt-0.5">Q</span>
                  {faq.q}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed pl-5">{faq.a}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal>
          <div className="text-center mt-10">
            <p className="text-gray-500 text-sm">
              Still have questions?{' '}
              <a href="mailto:hello@fundsradar.co" className="text-[#0F4C35] font-semibold hover:text-[#00C875] transition-colors">
                Email us →
              </a>
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0F4C35] py-[50px] md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
              Your next grant is out there right now.
            </h2>
            <p className="text-white/70 text-lg mb-8">
              Join UK charities already finding funding they were missing.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8 text-white text-sm">
              <span>🔒 No credit card required</span>
              <span>⚡ Results in 30 seconds</span>
              <span>✓ Cancel anytime</span>
            </div>
            <Link href="/signup" className="bg-white text-[#0F4C35] px-10 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors duration-200 inline-flex items-center gap-2 justify-center w-full sm:w-auto">
              Find My Grants — It&apos;s Free
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white/50 py-12" style={{ background: '#0D1117', borderTop: '2px solid #00C875' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="font-display font-bold text-white text-lg mb-1">FundsRadar</div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
                AI-powered grant discovery for UK charities
              </p>
            </div>
            {/* Product links */}
            <div>
              <div className="text-white text-sm font-semibold mb-3">Product</div>
              <ul className="space-y-2 text-sm">
                {[['Features', '/#features'], ['Pricing', '/pricing'], ['How it works', '/#how-it-works'], ['Grant Deadlines', '/deadlines'], ['Sign up', '/signup']].map(([label, href]) => (
                  <li key={label}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
            {/* Company links */}
            <div>
              <div className="text-white text-sm font-semibold mb-3">Company</div>
              <ul className="space-y-2 text-sm">
                {[['About', '/about'], ['Blog', '/blog'], ['Contact', '/contact'], ['Privacy Policy', '/privacy']].map(([label, href]) => (
                  <li key={label}><Link href={href} className="hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-xs text-center flex flex-col sm:flex-row items-center justify-center gap-3">
            <span>© 2026 FundsRadar. All rights reserved.</span>
            <span className="hidden sm:inline text-white/20">·</span>
            <a href="mailto:hello@fundsradar.co" className="text-white/50 hover:text-white transition-colors">
              hello@fundsradar.co
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
