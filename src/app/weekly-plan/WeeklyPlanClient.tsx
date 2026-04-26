'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { WeeklyPlan, WeeklyTask } from '@/lib/ai/weekly-plan'

interface WeeklyPlanClientProps {
  plan: WeeklyPlan | null
  planId: string | null
  weekStart: string
  completedKeys: string[]
}

function formatWeekStart(weekStart: string): string {
  const date = new Date(weekStart + 'T00:00:00Z')
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `£${(amount / 1_000_000).toFixed(1)}m`
  if (amount >= 1_000) return `£${(amount / 1_000).toFixed(0)}k`
  return `£${amount.toLocaleString()}`
}

// ── Task Card ──────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: WeeklyTask
  taskKey: string
  planId: string
  completed: boolean
  onToggle: (taskKey: string, completed: boolean) => void
}

function TaskCard({ task, taskKey, planId, completed, onToggle }: TaskCardProps) {
  const [, startTransition] = useTransition()
  const [localCompleted, setLocalCompleted] = useState(completed)
  const [toggling, setToggling] = useState(false)

  function handleToggle() {
    const next = !localCompleted
    setLocalCompleted(next)
    setToggling(true)
    startTransition(async () => {
      try {
        await fetch('/api/weekly-plan/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, taskKey, completed: next }),
        })
        onToggle(taskKey, next)
      } catch {
        // Revert optimistic update on error
        setLocalCompleted(!next)
      } finally {
        setToggling(false)
      }
    })
  }

  return (
    <div
      className={`card flex items-start gap-4 transition-opacity ${
        localCompleted ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={toggling}
        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: localCompleted ? '#0F4C35' : '#D1D5DB',
          backgroundColor: localCompleted ? '#0F4C35' : 'transparent',
        }}
        aria-label={localCompleted ? 'Mark incomplete' : 'Mark complete'}
      >
        {localCompleted && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path
              d="M1 4.5L4 7.5L10 1"
              stroke="white"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3
            className={`font-semibold text-sm text-[#0D1117] leading-snug ${
              localCompleted ? 'line-through text-gray-400' : ''
            }`}
          >
            {task.title}
          </h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
            ~{task.estimated_minutes} min
          </span>
        </div>
        <p className="text-gray-500 text-xs mt-1 leading-relaxed">{task.description}</p>
        {task.link && (
          <Link
            href={task.link}
            className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#0F4C35] hover:text-[#00C875] transition-colors"
          >
            Go to {task.link.replace('/', '')} →
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({
  emoji,
  title,
  colorClass,
}: {
  emoji: string
  title: string
  colorClass: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{emoji}</span>
      <h2 className={`font-display text-base font-bold uppercase tracking-wide ${colorClass}`}>
        {title}
      </h2>
    </div>
  )
}

// ── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  link,
  highlight,
  warn,
}: {
  label: string
  value: string
  link?: string
  highlight?: boolean
  warn?: boolean
}) {
  const borderColor = warn
    ? 'border-l-orange-400'
    : highlight
    ? 'border-l-[#00C875]'
    : 'border-l-transparent'
  const valueColor = warn
    ? 'text-orange-500'
    : highlight
    ? 'text-[#0F4C35]'
    : 'text-[#0D1117]'

  const inner = (
    <div
      className={`bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 border-l-4 ${borderColor} ${
        link ? 'hover:shadow-md transition-shadow' : ''
      }`}
    >
      <div className={`font-bold text-2xl leading-none ${valueColor}`}>{value}</div>
      <div className="text-gray-400 text-xs mt-1.5 font-medium">{label}</div>
    </div>
  )

  if (link) {
    return <Link href={link}>{inner}</Link>
  }
  return inner
}

// ── Main Client Component ──────────────────────────────────────────────────

export default function WeeklyPlanClient({
  plan,
  planId,
  weekStart,
  completedKeys: initialCompletedKeys,
}: WeeklyPlanClientProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(
    new Set(initialCompletedKeys)
  )

  async function handleGenerate() {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/weekly-plan/generate', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        router.refresh()
      } else {
        setGenerateError(data.error ?? `Error ${res.status} — please try again`)
      }
    } catch (err) {
      setGenerateError(String(err))
    } finally {
      setIsGenerating(false)
    }
  }

  function handleToggle(taskKey: string, completed: boolean) {
    setCompletedKeys((prev) => {
      const next = new Set(prev)
      if (completed) next.add(taskKey)
      else next.delete(taskKey)
      return next
    })
  }

  // ── No plan state ──
  if (!plan || !planId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-[#0D1117]">Weekly Action Plan</h1>
          <p className="text-gray-400 text-sm mt-1">Week of {formatWeekStart(weekStart)}</p>
        </div>

        <div className="card text-center py-16 max-w-lg mx-auto">
          <div className="text-5xl mb-5">📋</div>
          <h2 className="font-display text-xl font-bold text-[#0D1117] mb-3">
            No plan yet this week
          </h2>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Your AI fundraising advisor will analyse your grant pipeline, trust score, and upcoming
            deadlines to create a personalised action plan for the week.
          </p>
          <div className="grid grid-cols-3 gap-4 mb-8 text-left">
            {[
              { icon: '🎯', label: 'Urgent tasks based on real deadlines' },
              { icon: '📈', label: 'Actions to improve your trust score' },
              { icon: '📱', label: '3 social media post ideas' },
            ].map((item) => (
              <div key={item.label} className="bg-[#F4F6F5] rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-xs text-gray-600 leading-snug">{item.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary px-8 py-3 text-base font-semibold"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="30"
                    strokeDashoffset="10"
                  />
                </svg>
                Generating your plan…
              </span>
            ) : (
              'Generate my plan →'
            )}
          </button>
          {isGenerating && (
            <p className="text-xs text-gray-400 mt-4">
              This takes about 10–15 seconds — Claude is reading your grant pipeline now.
            </p>
          )}
          {generateError && (
            <p className="text-xs text-red-500 mt-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              ⚠️ {generateError}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Plan state ──

  // Count total tasks and completed
  const allTaskKeys: string[] = [
    ...plan.urgent.map((_, i) => `urgent_${i}`),
    ...plan.important.map((_, i) => `important_${i}`),
    ...plan.social_media.map((_, i) => `social_${i}`),
  ]
  const totalTasks = allTaskKeys.length
  const completedCount = allTaskKeys.filter((k) => completedKeys.has(k)).length
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  const { metrics } = plan

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0D1117]">
            Your Week — {formatWeekStart(weekStart)}
          </h1>
          <p className="text-gray-400 text-sm mt-1">AI-generated action plan for your charity</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 flex-shrink-0"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeDasharray="26"
                  strokeDashoffset="8"
                />
              </svg>
              Regenerating…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M12.5 2.5A6.5 6.5 0 111.5 7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M1.5 3V7H5.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Regenerate
            </>
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#0D1117]">
            {completedCount} of {totalTasks} tasks completed
          </p>
          <span className="text-sm font-bold text-[#0F4C35]">{progressPct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00C875] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* URGENT section */}
      {plan.urgent.length > 0 && (
        <section className="mb-8">
          <SectionHeader emoji="🔴" title="Urgent This Week" colorClass="text-red-600" />
          <div className="space-y-3">
            {plan.urgent.map((task, i) => (
              <TaskCard
                key={`urgent_${i}`}
                task={task}
                taskKey={`urgent_${i}`}
                planId={planId}
                completed={completedKeys.has(`urgent_${i}`)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </section>
      )}

      {/* IMPORTANT section */}
      {plan.important.length > 0 && (
        <section className="mb-8">
          <SectionHeader emoji="🟡" title="Important This Week" colorClass="text-amber-600" />
          <div className="space-y-3">
            {plan.important.map((task, i) => (
              <TaskCard
                key={`important_${i}`}
                task={task}
                taskKey={`important_${i}`}
                planId={planId}
                completed={completedKeys.has(`important_${i}`)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </section>
      )}

      {/* SOCIAL MEDIA section */}
      {plan.social_media.length > 0 && (
        <section className="mb-8">
          <SectionHeader emoji="📱" title="Social Media This Week" colorClass="text-purple-600" />
          <div className="space-y-3">
            {plan.social_media.map((task, i) => (
              <TaskCard
                key={`social_${i}`}
                task={task}
                taskKey={`social_${i}`}
                planId={planId}
                completed={completedKeys.has(`social_${i}`)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </section>
      )}

      {/* AI RECOMMENDATION */}
      {plan.ai_recommendation && (
        <section className="mb-8">
          <SectionHeader emoji="💡" title="AI Recommendation" colorClass="text-[#0F4C35]" />
          <div className="bg-[#0F4C35] rounded-[12px] p-5 text-white">
            <p className="text-sm leading-relaxed text-white/90">{plan.ai_recommendation}</p>
          </div>
        </section>
      )}

      {/* METRICS */}
      <section>
        <SectionHeader emoji="📊" title="Your Metrics" colorClass="text-[#0D1117]" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Trust Score"
            value={`${metrics.trust_score}/100`}
            link="/dashboard"
            highlight={metrics.trust_score >= 70}
            warn={metrics.trust_score < 40}
          />
          <MetricCard
            label="Active Applications"
            value={metrics.active_applications.toString()}
            link="/pipeline"
            highlight={metrics.active_applications > 0}
          />
          <MetricCard
            label="Closing This Week"
            value={metrics.grants_closing_week.toString()}
            link="/alerts"
            warn={metrics.grants_closing_week > 0}
          />
          <MetricCard
            label="Total Potential"
            value={formatCurrency(metrics.total_potential)}
            link="/pipeline"
            highlight={metrics.total_potential > 0}
          />
        </div>
      </section>
    </div>
  )
}
