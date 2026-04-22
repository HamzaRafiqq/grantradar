// ── Country locale config ─────────────────────────────────────────────────────

export type DateStyle = 'DMY' | 'MDY' | 'DMY_DOT'

export interface LocaleConfig {
  country: string
  flag: string
  orgTerm: string        // "charity" | "nonprofit" | "NGO" | "NFP organisation"
  teamTerm: string       // "fundraiser" | "fundraising team"
  regTerm: string        // "Gift Aid" | "501(c)(3)" | "DGR" etc.
  currency: string
  currencySymbol: string
  dateStyle: DateStyle
}

const LOCALE_MAP: Record<string, LocaleConfig> = {
  'United Kingdom': {
    country: 'United Kingdom', flag: '🇬🇧',
    orgTerm: 'charity', teamTerm: 'fundraiser', regTerm: 'Gift Aid',
    currency: 'GBP', currencySymbol: '£', dateStyle: 'DMY',
  },
  'United States': {
    country: 'United States', flag: '🇺🇸',
    orgTerm: 'nonprofit', teamTerm: 'fundraising team', regTerm: '501(c)(3)',
    currency: 'USD', currencySymbol: '$', dateStyle: 'MDY',
  },
  'Canada': {
    country: 'Canada', flag: '🇨🇦',
    orgTerm: 'registered charity', teamTerm: 'fundraising team', regTerm: 'charitable tax receipt',
    currency: 'CAD', currencySymbol: 'C$', dateStyle: 'MDY',
  },
  'Australia': {
    country: 'Australia', flag: '🇦🇺',
    orgTerm: 'NFP organisation', teamTerm: 'fundraising team', regTerm: 'DGR status',
    currency: 'AUD', currencySymbol: 'A$', dateStyle: 'DMY',
  },
  'New Zealand': {
    country: 'New Zealand', flag: '🇳🇿',
    orgTerm: 'charity', teamTerm: 'fundraising team', regTerm: 'Charities Register',
    currency: 'NZD', currencySymbol: 'NZ$', dateStyle: 'DMY',
  },
  'India': {
    country: 'India', flag: '🇮🇳',
    orgTerm: 'NGO', teamTerm: 'fundraising team', regTerm: 'FCRA registration',
    currency: 'INR', currencySymbol: '₹', dateStyle: 'DMY',
  },
}

const EUR_COUNTRIES = [
  'Germany', 'France', 'Netherlands', 'Ireland', 'Italy', 'Spain', 'Portugal',
  'Austria', 'Belgium', 'Finland', 'Greece', 'Luxembourg', 'Malta', 'Cyprus',
]

const EUR_FLAGS: Record<string, string> = {
  Germany: '🇩🇪', France: '🇫🇷', Netherlands: '🇳🇱', Ireland: '🇮🇪',
  Italy: '🇮🇹', Spain: '🇪🇸', Portugal: '🇵🇹', Austria: '🇦🇹',
  Belgium: '🇧🇪', Finland: '🇫🇮', Greece: '🇬🇷', Luxembourg: '🇱🇺',
}

export function getLocale(country?: string): LocaleConfig {
  if (!country) return LOCALE_MAP['United Kingdom']
  if (LOCALE_MAP[country]) return LOCALE_MAP[country]
  if (EUR_COUNTRIES.includes(country)) {
    return {
      country, flag: EUR_FLAGS[country] ?? '🇪🇺',
      orgTerm: 'nonprofit', teamTerm: 'fundraising team', regTerm: 'nonprofit registration',
      currency: 'EUR', currencySymbol: '€', dateStyle: 'DMY_DOT',
    }
  }
  return {
    country, flag: '🌐',
    orgTerm: 'nonprofit', teamTerm: 'fundraising team', regTerm: 'registration number',
    currency: 'USD', currencySymbol: '$', dateStyle: 'DMY',
  }
}

// ── Date formatting ───────────────────────────────────────────────────────────

export function formatDateLocale(dateStr: string, country?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const locale = getLocale(country)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  const monthName = d.toLocaleString('en', { month: 'long' })
  const pad = (n: number) => String(n).padStart(2, '0')

  if (locale.dateStyle === 'MDY') return `${monthName} ${day}, ${year}`
  if (locale.dateStyle === 'DMY_DOT') return `${pad(day)}.${pad(month)}.${year}`
  return `${day} ${monthName} ${year}` // DMY default
}

// ── Currency conversion (fixed approximate rates) ─────────────────────────────

const TO_USD: Record<string, number> = {
  GBP: 1.27, USD: 1, EUR: 1.09, AUD: 0.65, CAD: 0.74,
  NZD: 0.60, INR: 0.012, JPY: 0.0066, CHF: 1.12, ZAR: 0.054,
}

export function convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount
  const usd = amount * (TO_USD[fromCurrency] ?? 1)
  return Math.round(usd / (TO_USD[toCurrency] ?? 1))
}

export function formatLocalAmount(
  amount: number,
  grantCurrency: string,
  userCurrency: string,
  userSymbol: string,
): { primary: string; secondary: string | null } {
  if (!amount || amount === 0) return { primary: 'TBC', secondary: null }

  const grantSymbols: Record<string, string> = {
    GBP: '£', USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$',
    NZD: 'NZ$', INR: '₹', JPY: '¥', CHF: 'CHF ',
  }

  const grantSym = grantSymbols[grantCurrency] ?? grantCurrency + ' '

  if (grantCurrency === userCurrency) {
    return { primary: `${userSymbol}${amount.toLocaleString()}`, secondary: null }
  }

  const converted = convertAmount(amount, grantCurrency, userCurrency)
  return {
    primary: `${userSymbol}${converted.toLocaleString()}`,
    secondary: `${grantSym}${amount.toLocaleString()} ${grantCurrency}`,
  }
}

// ── Greeting ──────────────────────────────────────────────────────────────────

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
