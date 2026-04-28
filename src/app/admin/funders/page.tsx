import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Funders — Admin' }

export default async function AdminFundersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  // Try to get funders from grants table (aggregate by funder)
  const { data: funderData, error } = await supabase
    .from('grants')
    .select('funder, is_active, created_at')
    .not('funder', 'is', null)
    .order('funder')

  // Aggregate by funder name
  const funderMap: Record<string, { name: string; total: number; active: number; latest: string }> = {}
  for (const g of funderData ?? []) {
    if (!g.funder) continue
    if (!funderMap[g.funder]) {
      funderMap[g.funder] = { name: g.funder, total: 0, active: 0, latest: g.created_at }
    }
    funderMap[g.funder].total++
    if (g.is_active !== false) funderMap[g.funder].active++
    if (g.created_at > funderMap[g.funder].latest) funderMap[g.funder].latest = g.created_at
  }

  const funders = Object.values(funderMap).sort((a, b) => b.total - a.total)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Funders</h1>
        <p className="text-gray-500 text-sm mt-1">{funders.length} funders in the database</p>
      </div>

      {error && !error.message?.includes('does not exist') && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{error.message}</div>
      )}

      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funder Name</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Grants</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Added</th>
              </tr>
            </thead>
            <tbody>
              {funders.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-400">No funders found</td></tr>
              )}
              {funders.map((funder) => (
                <tr key={funder.name} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{funder.name}</td>
                  <td className="px-5 py-3 text-gray-600">{funder.total}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">{funder.active}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(funder.latest).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
