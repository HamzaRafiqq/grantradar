/**
 * Plan capability helpers — single source of truth for what each plan can do.
 * Import these everywhere instead of sprinkling plan === 'free' checks.
 */

export function canSeeFunderName(plan: string): boolean {
  return ['starter', 'pro', 'agency'].includes(plan)
}

export function canSeeExactDeadline(plan: string): boolean {
  return ['starter', 'pro', 'agency'].includes(plan)
}

export function canSeeApplyLink(plan: string): boolean {
  return ['starter', 'pro', 'agency'].includes(plan)
}

export function canUseAI(plan: string): boolean {
  return ['pro', 'agency'].includes(plan)
}

export function canUseDocumentVault(plan: string): boolean {
  return ['pro', 'agency'].includes(plan)
}

export function getFreeGrantLimit(plan: string): number {
  return plan === 'free' ? 3 : Infinity
}
