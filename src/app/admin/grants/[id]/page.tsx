import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import GrantForm from '../GrantForm'

export const metadata = { title: 'Edit Grant — Admin' }

export default async function EditGrantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  const { data: grant } = await supabase.from('grants').select('*').eq('id', id).single()
  if (!grant) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/grants" className="text-sm text-gray-500 hover:text-gray-700">← Back to Grants</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Grant</h1>
        <p className="text-gray-500 text-sm mt-1">{grant.name}</p>
      </div>
      <GrantForm initialData={grant} grantId={grant.id} />
    </div>
  )
}
