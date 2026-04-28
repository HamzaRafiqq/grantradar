import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Blog — Admin' }

export default async function AdminBlogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug, status, published_at, created_at')
    .order('created_at', { ascending: false })

  const tableError = error?.message?.includes('does not exist')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
          <p className="text-gray-500 text-sm mt-1">Manage blog posts</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="bg-[#0F4C35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3826] transition-colors"
        >
          + New Post
        </Link>
      </div>

      {tableError ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-[12px] text-sm">
          <strong>Note:</strong> The <code>blog_posts</code> table does not exist yet in the database. Create it to enable blog management.
          <pre className="mt-3 text-xs bg-amber-100 p-3 rounded overflow-x-auto">{`CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text,
  meta_description text,
  status text DEFAULT 'draft',
  categories text[],
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`}</pre>
        </div>
      ) : (
        <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Published</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(posts ?? []).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No posts yet. <Link href="/admin/blog/new" className="text-[#0F4C35] hover:underline">Create your first post →</Link></td></tr>
                )}
                {(posts ?? []).map((post) => (
                  <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900 truncate max-w-[280px]">{post.title}</td>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs truncate max-w-[180px]">{post.slug}</td>
                    <td className="px-5 py-3">
                      {post.status === 'published'
                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Published</span>
                        : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Draft</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/blog/${post.id}`} className="text-[#0F4C35] hover:underline text-xs font-medium mr-3">Edit</Link>
                      <Link href={`/blog/${post.slug}`} target="_blank" className="text-gray-400 hover:text-gray-600 text-xs">View ↗</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
