import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'System — Admin' }

const CRON_JOBS = [
  { name: 'Grant sync', schedule: 'Daily at 2am', description: 'Syncs new grants from external sources', endpoint: '/api/cron/sync-grants' },
  { name: 'Weekly plans', schedule: 'Monday 8am', description: 'Generates weekly action plans for all users', endpoint: '/api/cron/weekly-plans' },
  { name: 'Deadline alerts', schedule: 'Daily at 9am', description: 'Sends deadline reminder emails', endpoint: '/api/cron/deadline-alerts' },
  { name: 'Grant matching', schedule: 'On signup / manual', description: 'AI-powered grant matching for charities', endpoint: '/api/grants/match' },
  { name: 'Trust score update', schedule: 'Weekly Sunday', description: 'Recalculates trust scores for all orgs', endpoint: '/api/trust-score' },
]

const ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'N8N_BASE_URL',
  'INTERNAL_API_SECRET',
  'CHARITY_COMMISSION_API_KEY',
  'TAVILY_API_KEY',
  'ADMIN_EMAIL',
  'CRON_SECRET',
  'SYNC_SECRET',
]

export default async function AdminSystemPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  // DB stats
  const [
    { count: profilesCount },
    { count: grantsCount },
    { count: orgsCount },
    { count: docsCount },
    { count: pipelineCount },
    { count: matchesCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('grants').select('*', { count: 'exact', head: true }),
    supabase.from('organisations').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }),
    supabase.from('pipeline_items').select('*', { count: 'exact', head: true }),
    supabase.from('grant_matches').select('*', { count: 'exact', head: true }),
  ])

  const dbStats = [
    { table: 'profiles', count: profilesCount ?? 0 },
    { table: 'grants', count: grantsCount ?? 0 },
    { table: 'organisations', count: orgsCount ?? 0 },
    { table: 'documents', count: docsCount ?? 0 },
    { table: 'pipeline_items', count: pipelineCount ?? 0 },
    { table: 'grant_matches', count: matchesCount ?? 0 },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System</h1>
        <p className="text-gray-500 text-sm mt-1">Cron jobs, database stats, and environment</p>
      </div>

      <div className="space-y-6">
        {/* Cron jobs */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Cron Jobs</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
              </tr>
            </thead>
            <tbody>
              {CRON_JOBS.map((job) => (
                <tr key={job.name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{job.name}</td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{job.schedule}</td>
                  <td className="px-6 py-3 text-gray-500">{job.description}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gray-400">{job.endpoint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DB stats */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Database Row Counts</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 p-6">
            {dbStats.map((stat) => (
              <div key={stat.table} className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{stat.table}</p>
                <p className="text-xl font-bold text-gray-900">{stat.count.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Environment variables */}
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Environment Variables</h2>
            <p className="text-xs text-gray-400 mt-0.5">Values are not shown for security</p>
          </div>
          <div className="p-6 grid grid-cols-2 gap-2">
            {ENV_VARS.map((varName) => {
              const configured = !!process.env[varName]
              return (
                <div key={varName} className="flex items-center gap-2 py-1.5">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${configured ? 'bg-green-500' : 'bg-red-400'}`} />
                  <span className="font-mono text-xs text-gray-700">{varName}</span>
                  <span className={`text-xs ${configured ? 'text-green-600' : 'text-red-500'}`}>
                    {configured ? 'configured' : 'missing'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
