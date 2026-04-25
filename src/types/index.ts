export type Plan = 'free' | 'starter' | 'pro' | 'agency'

export type Sector =
  | 'animals'
  | 'children'
  | 'elderly'
  | 'homelessness'
  | 'arts'
  | 'environment'
  | 'education'
  | 'health'
  | 'disability'
  | 'other'

export type AnnualIncome = 'under_100k' | '100k_500k' | 'over_500k'

export type MatchStatus =
  | 'new'
  | 'researching'
  | 'applying'
  | 'submitted'
  | 'won'
  | 'lost'

export interface Profile {
  id: string
  email: string
  full_name: string
  plan: Plan
  stripe_customer_id: string | null
  created_at: string
}

export interface Organisation {
  id: string
  user_id: string
  name: string
  sector: Sector
  location: string
  annual_income: AnnualIncome
  registered_charity: boolean
  charity_number: string | null
  beneficiaries: string
  current_projects: string
  created_at: string
  country?: string
  currency?: string
  nonprofit_type?: string
}

export interface Grant {
  id: string
  name: string
  funder: string
  description: string
  eligibility_criteria: string
  min_award: number
  max_award: number
  deadline: string
  application_url: string
  sectors: string[]
  locations: string[]
  income_requirements: string
  is_active: boolean
  created_at: string
  country?: string
  region?: string
  currency?: string
  amount_usd?: number
  // 360Giving / anonymisation fields
  public_title?: string | null
  public_description?: string | null
  source?: string | null
  funder_type?: string | null
}

export interface GrantMatch {
  id: string
  user_id: string
  grant_id: string
  eligibility_score: number
  match_reason: string
  watch_out: string
  status: MatchStatus
  notes: string | null
  created_at: string
  grant?: Grant
}

export interface GrantMatchWithGrant extends GrantMatch {
  grant: Grant
}
