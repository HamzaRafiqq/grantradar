'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  'Grant advice',
  'UK funders',
  'Application tips',
  'Sector news',
  'FundsRadar updates',
]

interface BlogPostEditorProps {
  initialData?: {
    id?: string
    title?: string
    slug?: string
    excerpt?: string
    content?: string
    meta_description?: string
    status?: string
    categories?: string[]
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function BlogPostEditor({ initialData }: BlogPostEditorProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [slug, setSlug] = useState(initialData?.slug ?? '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [metaDesc, setMetaDesc] = useState(initialData?.meta_description ?? '')
  const [status, setStatus] = useState(initialData?.status ?? 'draft')
  const [categories, setCategories] = useState<string[]>(initialData?.categories ?? [])
  const [slugManual, setSlugManual] = useState(!!initialData?.slug)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slugManual) setSlug(slugify(v))
  }

  function toggleCategory(cat: string) {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const url = isEdit ? `/api/admin/blog/${initialData!.id}` : '/api/admin/blog'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, excerpt, content, meta_description: metaDesc, status, categories }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to save')
      } else {
        router.push('/admin/blog')
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!isEdit || !confirm('Delete this post?')) return
    await fetch(`/api/admin/blog/${initialData!.id}`, { method: 'DELETE' })
    router.push('/admin/blog')
    router.refresh()
  }

  const fieldClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35]"
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Title */}
      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Post title..."
          className="w-full text-2xl font-bold border-0 outline-none text-gray-900 placeholder-gray-300"
        />
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400">Slug:</span>
          <input
            value={slug}
            onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
            className="flex-1 text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0F4C35]/20"
            placeholder="auto-generated-from-title"
          />
        </div>
      </div>

      {/* Excerpt */}
      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <label className={labelClass}>Excerpt</label>
        <textarea
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          rows={2}
          className={fieldClass}
          placeholder="Short summary shown in listings..."
        />
      </div>

      {/* Content */}
      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <label className={labelClass}>Content (Markdown)</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={20}
          className={`${fieldClass} font-mono`}
          placeholder="Write your post in Markdown..."
        />
      </div>

      {/* Meta & settings */}
      <div className="bg-white rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="font-semibold text-gray-900 mb-4">SEO & Settings</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Meta Description <span className="text-gray-400 font-normal">({metaDesc.length}/160)</span></label>
            <textarea
              value={metaDesc}
              onChange={e => setMetaDesc(e.target.value)}
              rows={2}
              maxLength={160}
              className={fieldClass}
              placeholder="SEO meta description..."
            />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={fieldClass}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Categories</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    categories.includes(cat)
                      ? 'bg-[#0F4C35] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !title || !slug}
          className="bg-[#0F4C35] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0a3826] disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Post'}
        </button>
        {isEdit && (
          <button
            onClick={handleDelete}
            className="border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
