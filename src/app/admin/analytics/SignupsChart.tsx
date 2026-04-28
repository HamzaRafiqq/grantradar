'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const PLAN_COLORS: Record<string, string> = {
  free: '#9CA3AF',
  starter: '#60A5FA',
  pro: '#0F4C35',
  agency: '#059669',
}

interface SignupDataPoint {
  date: string
  count: number
}

interface PlanDataPoint {
  plan: string
  count: number
}

export function SignupsBarChart({ data }: { data: SignupDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
          cursor={{ fill: '#F3F4F6' }}
        />
        <Bar dataKey="count" fill="#0F4C35" radius={[4, 4, 0, 0]} name="Signups" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PlanPieChart({ data }: { data: PlanDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data.map(d => ({ ...d, name: d.plan }))}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? '#6B7280'} />
          ))}
        </Pie>
        <Legend formatter={(val) => <span style={{ fontSize: 12, color: '#6B7280' }}>{val}</span>} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
