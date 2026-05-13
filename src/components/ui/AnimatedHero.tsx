'use client'

import Link from 'next/link'

export default function AnimatedHero() {
  return (
    <section className="bg-[#0F4C35] text-white relative overflow-hidden">
      {/* Dot grid background */}
      <div className="absolute inset-0 hero-dot-grid pointer-events-none" />

      {/* Floating decorative blobs */}
      <div
        className="absolute top-10 left-6 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,200,117,0.08) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-6 right-8 w-56 h-56 rounded-full animate-float-slow pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', animationDelay: '1s' }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 left-1/3 w-40 h-40 rounded-full animate-float pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,200,117,0.05) 0%, transparent 70%)', animationDelay: '2.5s' }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-16 text-center relative z-10">
        {/* Animated badge */}
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#00C875] animate-pulse-dot flex-shrink-0" />
            AI-powered grant discovery for UK charities
          </div>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up anim-delay-150 font-display text-4xl md:text-6xl font-bold text-white leading-tight mb-6 max-w-3xl mx-auto">
          Find funding your charity is missing.
          <br />
          <span className="text-gradient-animated">Stop searching. Start winning.</span>
        </h1>

        {/* Description */}
        <p className="animate-fade-up anim-delay-300 text-white/75 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          FundsRadar matches your charity to hundreds of UK grants using AI, explains your eligibility
          in plain English, and helps you draft applications — saving your team{' '}
          <span className="text-white font-semibold">8–10 hours every week.</span>
        </p>

        {/* CTA buttons */}
        <div className="animate-fade-up anim-delay-450 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-white text-[#0F4C35] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all duration-200 inline-flex items-center justify-center gap-2 w-full sm:w-auto group shadow-[0_4px_24px_rgba(255,255,255,0.15)] hover:shadow-[0_6px_32px_rgba(255,255,255,0.25)]"
          >
            Find My Grants — Free
            <svg
              className="group-hover:translate-x-1 transition-transform duration-200"
              width="20" height="20" viewBox="0 0 20 20" fill="none"
            >
              <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="#how-it-works"
            className="bg-white/10 border border-white/25 text-white px-8 py-4 rounded-xl font-medium text-lg hover:bg-white/18 hover:border-white/40 transition-all duration-200 inline-flex items-center justify-center w-full sm:w-auto backdrop-blur-sm"
          >
            See how it works
          </Link>
        </div>

        {/* Social proof */}
        <p className="animate-fade-up anim-delay-600 text-white/45 text-sm mt-6">
          Free forever for up to 3 grants · No credit card required
        </p>

        {/* Mini stats row */}
        <div className="animate-fade-up anim-delay-700 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-8">
          {[
            { icon: '🏆', text: '£1M+ matched' },
            { icon: '📋', text: '300+ UK grants' },
            { icon: '⭐', text: '94% match accuracy' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-white/60 text-sm">
              <span>{item.icon}</span>
              <span className="font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
