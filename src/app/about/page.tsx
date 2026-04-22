import Link from 'next/link'
import Navbar from '@/components/ui/Navbar'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">

        <div className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[#0D1117] mb-6">
            Built for nonprofits that deserve better tools
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            FundsRadar was built to help nonprofits and charities worldwide spend less time searching and more time doing.
          </p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8">
          <div className="card">
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-4">Our story</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              After working with dozens of nonprofits and charities, we kept seeing the same problem: brilliant organisations doing vital work were missing out on funding simply because they didn&apos;t have the time or resources to find it. Grant searching was manual, scattered across dozens of websites, and took 8–10 hours a week that most fundraising teams simply didn&apos;t have.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We built FundsRadar to change that. By combining real-time web search with Claude AI, we can match your nonprofit or charity to relevant grants in your country in seconds — not hours — and explain exactly why you qualify in plain English.
            </p>
          </div>

          <div className="card">
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-4">Our mission</h2>
            <p className="text-gray-600 leading-relaxed">
              Every nonprofit should have access to the same quality of grant intelligence as the largest organisations with dedicated development teams. FundsRadar levels the playing field — giving small and medium nonprofits an AI-powered fundraising team they couldn&apos;t otherwise afford, wherever they are in the world.
            </p>
          </div>

          <div className="card">
            <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-4">How we work</h2>
            <div className="grid sm:grid-cols-3 gap-6 mt-2">
              {[
                { icon: '🔍', title: 'We search', desc: 'Our AI scans 2,400+ grant databases worldwide and live web sources to find active funding opportunities in your country.' },
                { icon: '🎯', title: 'We match', desc: 'Claude AI scores every grant against your nonprofit profile — sector, size, country, and work.' },
                { icon: '✍️', title: 'We draft', desc: 'Get an AI-written opening paragraph for every application in 10 seconds.' },
              ].map(item => (
                <div key={item.title} className="text-center">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-[#0D1117] mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card bg-[#0F4C35] text-white">
            <h2 className="font-display text-2xl font-bold mb-4">Get in touch</h2>
            <p className="text-white/80 leading-relaxed mb-4">
              We&apos;re always happy to talk to nonprofits, charities, grant consultants, or anyone interested in what we&apos;re building.
            </p>
            <a href="mailto:hello@fundsradar.co" className="inline-flex items-center gap-2 bg-white text-[#0F4C35] font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm">
              hello@fundsradar.co
            </a>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/signup" className="btn-primary text-sm py-3 px-8 justify-center">
            Start finding grants — it's free
          </Link>
        </div>
      </div>
    </div>
  )
}
