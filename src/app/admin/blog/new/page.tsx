import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BlogPostEditor from '../BlogPostEditor'

export const metadata = { title: 'New Post — Admin Blog' }

export default async function NewBlogPostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/blog" className="text-sm text-gray-500 hover:text-gray-700">← Back to Blog</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New Post</h1>
      </div>
      <BlogPostEditor />
    </div>
  )
}
