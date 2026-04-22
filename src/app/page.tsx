import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'
import ScrollReveal from '@/components/ui/ScrollReveal'
import PricingToggle from '@/components/ui/PricingToggle'

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
    desc: 'Our AI scans thousands of grant databases worldwide and matches them to your nonprofit profile in seconds — not hours.',
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
    title: 'Tell us about your nonprofit',
    desc: 'Share your sector, size, country, and what you do. Takes about 3 minutes.',
  },
  {
    step: '02',
    title: 'We find your matches',
    desc: 'Our AI analyses thousands of active grants worldwide and scores your eligibility for each one in real time.',
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
    org: 'Brightside Youth Trust, Manchester 🇬🇧',
    initials: 'SM',
  },
  {
    quote: "We discovered seven foundation grants we'd never heard of in our first week. The country filter meant every result was actually relevant to us. Our team now spends time writing, not searching.",
    name: 'Marcus Johnson',
    role: 'Executive Director',
    org: 'Chicago Education Alliance, Illinois 🇺🇸',
    initials: 'MJ',
  },
  {
    quote: "The AI draft generator is genuinely impressive. It reads the grant criteria and writes an opening that actually sounds like us. Our success rate has gone up since we started using it.",
    name: 'Priya Sharma',
    role: 'Development Director',
    org: 'Inclusive Arts Collective, London 🇬🇧',
    initials: 'PS',
  },
  {
    quote: "As a small community nonprofit in Melbourne, we used to spend days manually searching for funding. FundsRadar surfaces Australian grants we qualify for automatically. It's been a game changer.",
    name: 'Lena Hartmann',
    role: 'CEO',
    org: 'Southside Community Hub, Melbourne 🇦🇺',
    initials: 'LH',
  },
]

const stats = [
  { value: '$8.5M+', label: 'Funding found for our users' },
  { value: '2,400+', label: 'Active grants tracked worldwide' },
  { value: '50+', label: 'Countries supported' },
  { value: '94%', label: 'Match accuracy rate' },
]

const funders = ['Gates Foundation', 'National Lottery', 'Comic Relief', 'Ford Foundation', 'Esmée Fairbairn']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0F4C35] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00C875]" />
            AI-powered grant discovery for nonprofits worldwide
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-white leading-tight mb-6 max-w-3xl mx-auto">
            Find funding your nonprofit is missing.
            <br />
            <span className="text-white">Stop searching. Start winning.</span>
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            FundsRadar matches your nonprofit or charity to hundreds of grants in your country using AI, explains your eligibility in plain English, and helps you draft applications — saving your team 8–10 hours every week.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-white text-[#0F4C35] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors duration-200 inline-flex items-center justify-center gap-2 w-full sm:w-auto">
              Find My Grants — Free
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="#how-it-works" className="bg-white/10 border border-white/30 text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/20 transition-colors duration-200 inline-flex items-center justify-center w-full sm:w-auto">
              See how it works
            </Link>
          </div>
          <p className="text-white/50 text-sm mt-5">Free forever for up to 3 grants. No credit card required.</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white" style={{ borderBottom: '2px solid #E2E8E4' }}>
        <ScrollReveal>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{ borderLeft: '3px solid #00C875', paddingLeft: '20px' }}
                  className="text-left"
                >
                  <div className="font-display font-extrabold text-[#0F4C35] text-[2rem] md:text-[3rem] leading-none">{s.value}</div>
                  <div className="text-gray-500 text-sm mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-[50px] md:py-20">
        <ScrollReveal>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/80 border border-gray-200 rounded-full px-4 py-1.5 text-sm mb-5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#00C875]" />
              BUILT FOR NONPROFITS WORLDWIDE
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[#0D1117] mb-4">
              Everything your fundraising team needs
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Built for nonprofits and charities worldwide whose fundraising teams are stretched thin and can&apos;t afford to miss funding opportunities.
            </p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((b) => (
            <ScrollReveal key={b.title}>
              <div
                className="card hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-[250ms] cursor-pointer"
                style={{ borderTop: '3px solid #00C875' }}
              >
                <div className="w-12 h-12 rounded-xl bg-[#E8F2ED] flex items-center justify-center mb-5">
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
                No spreadsheets, no endless browsing. Just targeted, AI-matched funding opportunities for your nonprofit.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((s, i) => (
              <ScrollReveal key={s.step}>
                <div className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-5 left-full w-full h-[2px] shimmer-line -translate-x-1/2" />
                  )}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#00C875] text-[#0D1117] flex items-center justify-center font-bold text-sm flex-shrink-0">
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
              Trusted by nonprofits worldwide
            </h2>
            <p className="text-gray-500 text-lg">Real results from real nonprofit and charity teams.</p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {testimonials.map((t) => (
            <ScrollReveal key={t.name}>
              <div
                className="card flex flex-col relative overflow-hidden"
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
                <p className="text-gray-600 text-sm leading-relaxed flex-1 italic relative z-10">"{t.quote}"</p>
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
            <p className="text-gray-500 text-lg mb-10">Start free. Upgrade when you're ready to unlock everything.</p>
          </ScrollReveal>
          <PricingToggle />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#0F4C35] py-[50px] md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
              Your next grant is out there right now.
            </h2>
            <p className="text-white/70 text-lg mb-8">
              Join nonprofits worldwide already finding funding they were missing.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8 text-white text-sm">
              <span>🔒 No credit card required</span>
              <span>⚡ Results in 30 seconds</span>
              <span>✓ Cancel anytime</span>
            </div>
            <Link href="/signup" className="bg-white text-[#0F4C35] px-10 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors duration-200 inline-flex items-center gap-2 justify-center w-full sm:w-auto">
              Find My Grants — It's Free
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
                AI-powered grant discovery for nonprofits worldwide
              </p>
            </div>
            {/* Product links */}
            <div>
              <div className="text-white text-sm font-semibold mb-3">Product</div>
              <ul className="space-y-2 text-sm">
                {[['Features', '/#features'], ['Pricing', '/pricing'], ['How it works', '/#how-it-works'], ['Sign up', '/signup']].map(([label, href]) => (
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
