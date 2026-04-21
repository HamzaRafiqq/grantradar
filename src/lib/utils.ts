export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function daysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function scoreColor(score: number): string {
  if (score >= 8) return 'bg-green-100 text-green-800'
  if (score >= 6) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export function deadlineColor(days: number): string {
  if (days <= 7) return 'text-red-600 font-semibold'
  if (days <= 14) return 'text-orange-500 font-medium'
  return 'text-gray-500'
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
