import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import Navbar from '@/components/ui/Navbar'

// ── Country data ──────────────────────────────────────────────────────────────

const COUNTRY_DATA: Record<string, {
  name: string
  flag: string
  slug: string
  orgTerm: string
  currency: string
  symbol: string
  proPrice: number
  topFunders: { name: string; focus: string; typical: string }[]
  stats: { value: string; label: string }[]
  searches: string[]
  tip: string
}> = {
  'united-states': {
    name: 'United States',
    flag: '🇺🇸',
    slug: 'united-states',
    orgTerm: 'nonprofits',
    currency: 'USD',
    symbol: '$',
    proPrice: 59,
    topFunders: [
      { name: 'Bill & Melinda Gates Foundation', focus: 'Global health, education, poverty', typical: '$100K–$1M+' },
      { name: 'Ford Foundation', focus: 'Social justice, arts, human rights', typical: '$50K–$500K' },
      { name: 'Robert Wood Johnson Foundation', focus: 'Health equity, healthcare access', typical: '$25K–$300K' },
      { name: 'W.K. Kellogg Foundation', focus: 'Children, families, education', typical: '$25K–$250K' },
      { name: 'MacArthur Foundation', focus: 'Climate, justice, nuclear risk', typical: '$50K–$500K' },
      { name: 'Bloomberg Philanthropies', focus: 'Arts, environment, public health', typical: '$10K–$200K' },
      { name: 'Annie E. Casey Foundation', focus: 'Child welfare, family economic security', typical: '$50K–$400K' },
      { name: 'Knight Foundation', focus: 'Journalism, arts, community engagement', typical: '$10K–$200K' },
      { name: 'Pew Charitable Trusts', focus: 'Environment, civic life, health', typical: '$25K–$500K' },
      { name: 'Rockefeller Foundation', focus: 'Climate, food systems, health', typical: '$10K–$100K' },
    ],
    stats: [
      { value: '1.5M+', label: 'registered nonprofits in the US' },
      { value: '$500B+', label: 'given to nonprofits annually' },
      { value: '86,000+', label: 'active private foundations' },
      { value: '$59/mo', label: 'GrantRadar Pro (USD)' },
    ],
    searches: ['nonprofit grants USA', '501c3 funding', 'foundation grants for nonprofits', 'US charity funding'],
    tip: 'Most US foundations require 501(c)(3) status. GrantRadar checks your eligibility and flags which grants accept fiscal sponsors.',
  },
  'united-kingdom': {
    name: 'United Kingdom',
    flag: '🇬🇧',
    slug: 'united-kingdom',
    orgTerm: 'charities',
    currency: 'GBP',
    symbol: '£',
    proPrice: 49,
    topFunders: [
      { name: 'National Lottery Community Fund', focus: 'Community projects across the UK', typical: '£300–£500K' },
      { name: 'Lloyds Bank Foundation', focus: 'Small charities tackling disadvantage', typical: '£30K–£150K' },
      { name: 'Comic Relief', focus: 'Poverty, social justice, UK & international', typical: '£10K–£200K' },
      { name: 'Esmée Fairbairn Foundation', focus: 'Arts, environment, food, social change', typical: '£10K–£500K' },
      { name: 'Tudor Trust', focus: 'People at the margins of society', typical: '£5K–£50K' },
      { name: 'Garfield Weston Foundation', focus: 'Arts, community, education, welfare', typical: '£5K–£50K' },
      { name: 'Henry Smith Charity', focus: 'Poverty, disability, older people', typical: '£10K–£50K' },
      { name: 'Paul Hamlyn Foundation', focus: 'Arts, young people, migration', typical: '£10K–£250K' },
      { name: 'Big Society Capital', focus: 'Social investment, housing, employment', typical: '£50K–£1M' },
      { name: 'Children in Need (BBC)', focus: 'Disadvantaged children and young people', typical: '£10K–£100K' },
    ],
    stats: [
      { value: '170,000+', label: 'registered charities in England & Wales' },
      { value: '£20B+', label: 'donated to UK charities annually' },
      { value: '10,000+', label: 'active grant programmes tracked' },
      { value: '£49/mo', label: 'GrantRadar Pro (GBP)' },
    ],
    searches: ['charity grants UK', 'funding for UK charities', 'grant finder UK', 'UK charity funding 2026'],
    tip: 'UK charities registered with the Charity Commission are eligible for the widest range of grants. GrantRadar also surfaces Gift Aid-boosted funding opportunities.',
  },
  'canada': {
    name: 'Canada',
    flag: '🇨🇦',
    slug: 'canada',
    orgTerm: 'charities and nonprofits',
    currency: 'CAD',
    symbol: 'C$',
    proPrice: 79,
    topFunders: [
      { name: 'Canada Council for the Arts', focus: 'Arts and culture across Canada', typical: 'C$5K–C$150K' },
      { name: 'McConnell Foundation', focus: 'Social innovation, reconciliation', typical: 'C$25K–C$200K' },
      { name: 'Inspirit Foundation', focus: 'Pluralism, digital equity', typical: 'C$10K–C$100K' },
      { name: 'Community Foundations of Canada', focus: 'Local community development', typical: 'C$5K–C$50K' },
      { name: 'Laidlaw Foundation', focus: 'Youth, environment, arts', typical: 'C$10K–C$75K' },
      { name: 'Trillium Foundation', focus: 'Ontario nonprofits', typical: 'C$5K–C$150K' },
      { name: 'RBC Foundation', focus: 'Youth, environment, community', typical: 'C$5K–C$50K' },
      { name: 'Metcalf Foundation', focus: 'Poverty, environment, arts', typical: 'C$25K–C$200K' },
      { name: 'Bell Let\'s Talk', focus: 'Mental health across Canada', typical: 'C$25K–C$500K' },
      { name: 'Government of Canada', focus: 'Social, cultural and environmental grants', typical: 'C$10K–C$250K' },
    ],
    stats: [
      { value: '86,000+', label: 'registered charities in Canada' },
      { value: 'C$14B+', label: 'donated annually to Canadian charities' },
      { value: '5,000+', label: 'active Canadian grant programmes' },
      { value: 'C$79/mo', label: 'GrantRadar Pro (CAD)' },
    ],
    searches: ['charity grants Canada', 'nonprofit funding Canada', 'Canadian foundation grants', 'CRA registered charity grants'],
    tip: 'Canadian charities registered with the CRA can access the broadest range of grants. GrantRadar flags which funders require CRA charitable status vs. nonprofit incorporation.',
  },
  'australia': {
    name: 'Australia',
    flag: '🇦🇺',
    slug: 'australia',
    orgTerm: 'NFP organisations',
    currency: 'AUD',
    symbol: 'A$',
    proPrice: 89,
    topFunders: [
      { name: 'Australian Communities Foundation', focus: 'Social, environmental, arts', typical: 'A$5K–A$100K' },
      { name: 'Paul Ramsay Foundation', focus: 'Breaking cycles of disadvantage', typical: 'A$100K–A$2M' },
      { name: 'Perpetual Foundation', focus: 'Community welfare, health, education', typical: 'A$10K–A$150K' },
      { name: 'Myer Foundation', focus: 'Arts, education, environment', typical: 'A$5K–A$75K' },
      { name: 'Vincent Fairfax Family Foundation', focus: 'Ethics, leadership, environment', typical: 'A$10K–A$100K' },
      { name: 'Ian Potter Foundation', focus: 'Arts, environment, health, education', typical: 'A$10K–A$250K' },
      { name: 'Lord Mayor\'s Charitable Foundation', focus: 'Melbourne-based organisations', typical: 'A$5K–A$50K' },
      { name: 'Scanlon Foundation', focus: 'Social cohesion, migration', typical: 'A$5K–A$100K' },
      { name: 'Minderoo Foundation', focus: 'Children, oceans, justice', typical: 'A$50K–A$500K' },
      { name: 'Australian Government Grants', focus: 'Various social and environmental causes', typical: 'A$20K–A$500K' },
    ],
    stats: [
      { value: '60,000+', label: 'registered charities in Australia' },
      { value: 'A$12B+', label: 'donated annually to Australian charities' },
      { value: '3,000+', label: 'active Australian grant programmes' },
      { value: 'A$89/mo', label: 'GrantRadar Pro (AUD)' },
    ],
    searches: ['charity grants Australia', 'NFP funding Australia', 'Australian foundation grants', 'ACNC registered charity grants'],
    tip: 'ACNC registration and DGR (Deductible Gift Recipient) status opens up the most grant opportunities in Australia. GrantRadar filters grants by your DGR status.',
  },
  'india': {
    name: 'India',
    flag: '🇮🇳',
    slug: 'india',
    orgTerm: 'NGOs',
    currency: 'USD',
    symbol: '$',
    proPrice: 59,
    topFunders: [
      { name: 'Tata Trusts', focus: 'Rural development, health, education', typical: '₹5L–₹5Cr' },
      { name: 'Azim Premji Foundation', focus: 'Education, grassroots development', typical: '₹5L–₹2Cr' },
      { name: 'Bill & Melinda Gates Foundation', focus: 'Health, agriculture, poverty', typical: '$100K–$1M' },
      { name: 'Ford Foundation India', focus: 'Social justice, arts, rights', typical: '$50K–$500K' },
      { name: 'Aga Khan Foundation India', focus: 'Rural health, education, livelihoods', typical: '$25K–$250K' },
      { name: 'Skoll Foundation', focus: 'Social entrepreneurship', typical: '$1M+' },
      { name: 'MacArthur Foundation India', focus: 'Climate, population, housing', typical: '$50K–$500K' },
      { name: 'Wellcome Trust India', focus: 'Biomedical research, public health', typical: '$100K–$1M' },
      { name: 'USAID India', focus: 'Health, agriculture, democracy', typical: '$25K–$1M' },
      { name: 'CSR Funds (Indian corporates)', focus: 'Social welfare, environment, education', typical: '₹5L–₹10Cr' },
    ],
    stats: [
      { value: '3.3M+', label: 'registered NGOs in India' },
      { value: '$7B+', label: 'in CSR spending annually' },
      { value: '10,000+', label: 'active international grant programmes' },
      { value: '$59/mo', label: 'GrantRadar Pro (USD)' },
    ],
    searches: ['NGO grants India', 'nonprofit funding India', 'CSR grants India', 'international grants for Indian NGOs'],
    tip: 'Indian NGOs with FCRA registration can receive international funds. GrantRadar specifically flags which global funders accept FCRA-registered organisations.',
  },
  'germany': {
    name: 'Germany',
    flag: '🇩🇪',
    slug: 'germany',
    orgTerm: 'gemeinnützige Organisationen',
    currency: 'EUR',
    symbol: '€',
    proPrice: 55,
    topFunders: [
      { name: 'Bertelsmann Foundation', focus: 'Education, democracy, health', typical: '€25K–€500K' },
      { name: 'Robert Bosch Foundation', focus: 'Education, health, international cooperation', typical: '€10K–€250K' },
      { name: 'Volkswagen Foundation', focus: 'Research, education, culture', typical: '€50K–€1M' },
      { name: 'Körber Foundation', focus: 'Civic engagement, science, culture', typical: '€10K–€200K' },
      { name: 'Deutsche Bundesstiftung Umwelt', focus: 'Environmental protection', typical: '€25K–€500K' },
      { name: 'Open Society Foundations', focus: 'Civil society, human rights', typical: '€50K–€500K' },
      { name: 'European Cultural Foundation', focus: 'Cross-border cultural projects', typical: '€10K–€150K' },
      { name: 'Horizon Europe', focus: 'Research and innovation (EU-wide)', typical: '€500K–€5M' },
      { name: 'Aktion Mensch', focus: 'Disability, inclusion, social participation', typical: '€5K–€200K' },
      { name: 'Bundesministerium BMZ', focus: 'International development', typical: '€50K–€1M' },
    ],
    stats: [
      { value: '600,000+', label: 'registered associations in Germany' },
      { value: '€11B+', label: 'donated annually to German nonprofits' },
      { value: '2,000+', label: 'active German foundation grant programmes' },
      { value: '€55/mo', label: 'GrantRadar Pro (EUR)' },
    ],
    searches: ['Fördermittel gemeinnützige Organisationen', 'grants for German nonprofits', 'NGO funding Germany', 'Stiftungsförderung Deutschland'],
    tip: 'German nonprofits with Gemeinnützigkeit status (recognised charitable purpose) have access to tax-deductible donations and the widest range of foundation grants.',
  },
}

// ── Static params ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.keys(COUNTRY_DATA).map(slug => ({ country: slug }))
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const { country } = await params
  const data = COUNTRY_DATA[country]
  if (!data) return {}
  return {
    title: `Grants for Nonprofits in ${data.name} — GrantRadar`,
    description: `Find grants for ${data.orgTerm} in ${data.name}. GrantRadar uses AI to match your organisation to hundreds of active grants — saving your team 8-10 hours every week.`,
    keywords: data.searches.join(', '),
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CountryGrantsPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params
  const data = COUNTRY_DATA[country]
  if (!data) notFound()

  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0F4C35] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <div className="text-5xl mb-4">{data.flag}</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Find Grants for {data.orgTerm.charAt(0).toUpperCase() + data.orgTerm.slice(1)} in {data.name}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
            GrantRadar uses AI to match your organisation to hundreds of active grants in {data.name} — explaining your eligibility in plain English and helping you draft applications.
          </p>
          <Link
            href="/signup"
            className="bg-white text-[#0F4C35] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            Find My Grants — Free
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 9h10M9 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <p className="text-white/40 text-sm mt-3">Free forever for up to 3 grants · No credit card required</p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {data.stats.map(s => (
              <div key={s.label} style={{ borderLeft: '3px solid #00C875', paddingLeft: '16px' }} className="text-left">
                <div className="font-display font-extrabold text-[#0F4C35] text-2xl md:text-3xl leading-none">{s.value}</div>
                <div className="text-gray-500 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-16">

        {/* Top funders */}
        <section>
          <h2 className="font-display text-3xl font-bold text-[#0D1117] mb-2">
            Top grant funders in {data.name}
          </h2>
          <p className="text-gray-500 mb-8">GrantRadar tracks these funders and hundreds more, matching your profile automatically.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.topFunders.map((f, i) => (
              <div key={f.name} className="card flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#E8F2ED] text-[#0F4C35] font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-[#0D1117] text-sm mb-0.5">{f.name}</h3>
                  <p className="text-gray-500 text-xs mb-1">{f.focus}</p>
                  <span className="text-[10px] font-semibold bg-[#E8F2ED] text-[#0F4C35] px-2 py-0.5 rounded-full">
                    Typical: {f.typical}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How GrantRadar works */}
        <section className="bg-[#0F4C35] rounded-2xl p-8 md:p-12 text-white">
          <h2 className="font-display text-3xl font-bold mb-8 text-center">
            How GrantRadar works for {data.name}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: `Tell us about your ${data.orgTerm.replace('s', '').split(' ')[0]}`,
                desc: `Share your sector, size, and what you do in ${data.name}. Takes about 3 minutes.`,
              },
              {
                step: '02',
                title: 'We find your matches',
                desc: `Our AI scans grants available in ${data.name} plus global funders and scores your eligibility for each one.`,
              },
              {
                step: '03',
                title: 'Apply with confidence',
                desc: `Get AI-written draft introductions in 10 seconds. Track deadlines and move applications through your pipeline.`,
              },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-[#00C875] text-[#0D1117] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{s.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Local tip */}
        <section className="card border-l-4 border-[#00C875]">
          <div className="flex gap-4">
            <div className="text-3xl">{data.flag}</div>
            <div>
              <h3 className="font-semibold text-[#0D1117] mb-1">{data.name} tip</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{data.tip}</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="text-center">
          <h2 className="font-display text-3xl font-bold text-[#0D1117] mb-3">
            Pricing for {data.name}
          </h2>
          <p className="text-gray-500 mb-8">Start free, upgrade when ready. Charged in {data.currency}.</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="card text-left">
              <h3 className="font-display text-xl font-bold text-[#0D1117] mb-1">Free</h3>
              <p className="text-gray-400 text-sm mb-4">3 grant matches · No credit card</p>
              <div className="text-4xl font-bold text-[#0D1117] mb-6">{data.symbol}0</div>
              <Link href="/signup" className="btn-secondary w-full justify-center py-3 text-sm">
                Get started free
              </Link>
            </div>
            <div className="card border-2 border-[#0F4C35] text-left relative">
              <div className="absolute -top-3 left-4">
                <span className="bg-[#00C875] text-[#0D1117] text-[10px] font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
              </div>
              <h3 className="font-display text-xl font-bold text-[#0D1117] mb-1">Pro</h3>
              <p className="text-gray-400 text-sm mb-4">Unlimited grants · AI drafts · Alerts</p>
              <div className="text-4xl font-bold text-[#0D1117] mb-1">
                {data.symbol}{data.proPrice}<span className="text-lg text-gray-400 font-normal">/mo</span>
              </div>
              <p className="text-gray-400 text-xs mb-6">Billed in {data.currency} · Cancel any time</p>
              <Link href="/signup" className="btn-primary w-full justify-center py-3 text-sm">
                Start Pro
              </Link>
            </div>
          </div>
        </section>

        {/* SEO links to other countries */}
        <section className="border-t border-gray-200 pt-10">
          <h3 className="font-semibold text-[#0D1117] mb-4 text-sm">GrantRadar also works in:</h3>
          <div className="flex flex-wrap gap-2">
            {Object.values(COUNTRY_DATA)
              .filter(c => c.slug !== country)
              .map(c => (
                <Link
                  key={c.slug}
                  href={`/countries/${c.slug}`}
                  className="text-sm text-[#0F4C35] hover:underline bg-[#E8F2ED] px-3 py-1.5 rounded-full"
                >
                  {c.flag} {c.name}
                </Link>
              ))}
          </div>
        </section>

      </div>
    </div>
  )
}
