import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Currency = 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD'

// Amounts in smallest currency unit (pence/cents)
const PRICES = {
  pro: {
    monthly: { GBP: 4900, USD: 5900, EUR: 5500, AUD: 8900, CAD: 7900 },
    annual:  { GBP: 46800, USD: 56400, EUR: 52800, AUD: 85200, CAD: 75600 },
  },
  agency: {
    monthly: { GBP: 9900, USD: 11900, EUR: 10900, AUD: 17900, CAD: 15900 },
    annual:  { GBP: 94800, USD: 114000, EUR: 104400, AUD: 171600, CAD: 152400 },
  },
}

const PLAN_NAMES = {
  pro: { monthly: 'GrantRadar Pro (Monthly)', annual: 'GrantRadar Pro (Annual)' },
  agency: { monthly: 'GrantRadar Agency (Monthly)', annual: 'GrantRadar Agency (Annual)' },
}

export async function POST(req: NextRequest) {
  try {
    const { plan, annual, currency = 'GBP' } = await req.json() as {
      plan: 'pro' | 'agency'
      annual: boolean
      currency: Currency
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const { default: Stripe } = await import('stripe')
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const billing = annual ? 'annual' : 'monthly'
    const unitAmount = PRICES[plan][billing][currency]
    const productName = PLAN_NAMES[plan][billing]

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: productName,
              description: plan === 'pro'
                ? 'Unlimited grant matches, AI drafts, deadline alerts & pipeline board'
                : 'Everything in Pro + up to 10 profiles, team seats & bulk matching',
            },
            unit_amount: unitAmount,
            recurring: { interval: annual ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { supabase_user_id: user.id, plan, currency },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
