'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Document {
  id:           string
  name:         string
  category:     string
  file_type:    string
  file_size:    number | null
  expiry_date:  string | null
  created_at:   string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Legal', 'Financial', 'Policies', 'Governance', 'HR'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  Legal:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  Financial:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  Policies:   { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Governance: { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  HR:         { bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200' },
}

const KEY_DOCS_COUNT: Record<Category, number> = {
  Legal: 3, Financial: 3, Policies: 5, Governance: 4, HR: 2,
}

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'
const MAX_MB = 10

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileIcon(type: string): string {
  if (['pdf'].includes(type))           return '📄'
  if (['doc', 'docx'].includes(type))  return '📝'
  if (['xls', 'xlsx'].includes(type))  return '📊'
  if (['png', 'jpg', 'jpeg'].includes(type)) return '🖼️'
  return '📎'
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function expiryStatus(date: string | null): { label: string; color: string } | null {
  if (!date) return null
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0)  return { label: 'Expired',            color: 'text-red-700 bg-red-100' }
  if (days <= 7) return { label: `${days}d left`,      color: 'text-red-700 bg-red-100' }
  if (days <= 30) return { label: `${days}d left`,     color: 'text-orange-600 bg-orange-50' }
  if (days <= 60) return { label: `${days}d left`,     color: 'text-amber-600 bg-amber-50' }
  return              { label: `${days}d`,              color: 'text-green-700 bg-green-50' }
}

// ── Completeness Widget ────────────────────────────────────────────────────────

function CompletenessWidget({ docs }: { docs: Document[] }) {
  const byCat = (cat: Category) => docs.filter(d => d.category === cat).length
  const total = CATEGORIES.reduce((s, c) => s + Math.min(byCat(c), KEY_DOCS_COUNT[c]), 0)
  const max   = CATEGORIES.reduce((s, c) => s + KEY_DOCS_COUNT[c], 0)
  const pct   = Math.round((total / max) * 100)

  return (
    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-[#0D1117]">Vault completeness</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-[#0F4C35] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-1.5">
        {CATEGORIES.map(cat => {
          const count = byCat(cat)
          const needed = KEY_DOCS_COUNT[cat]
          const done   = count >= needed
          return (
            <div key={cat} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{cat}</span>
              <span className={done ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                {done ? '✓' : `${count}/${needed}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (doc: Document) => void }) {
  const [file,     setFile]     = useState<File | null>(null)
  const [name,     setName]     = useState('')
  const [category, setCategory] = useState<Category>('Legal')
  const [expiry,   setExpiry]   = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  function selectFile(f: File) {
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File exceeds ${MAX_MB} MB`); return }
    setFile(f)
    setName(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
    setError(null)
  }

  async function handleUpload() {
    if (!file || !name.trim()) return
    setUploading(true)
    setError(null)
    setProgress(10)

    const fd = new FormData()
    fd.append('file',     file)
    fd.append('name',     name.trim())
    fd.append('category', category)
    if (expiry) fd.append('expiry', expiry)

    // Fake progress while uploading
    const progressInterval = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 300)

    try {
      const res  = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      const json = await res.json()
      clearInterval(progressInterval)
      setProgress(100)

      if (!res.ok) { setError(json.error ?? 'Upload failed'); setProgress(0); return }
      setTimeout(() => { onUploaded(json.data); onClose() }, 400)
    } catch {
      clearInterval(progressInterval)
      setError('Upload failed — please try again')
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[#0D1117] text-lg">Upload document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragging ? 'border-[#0F4C35] bg-[#F4F6F5]' : file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) selectFile(f) }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f) }}
          />
          {file ? (
            <div>
              <p className="text-2xl mb-1">{fileIcon(file.name.split('.').pop() ?? '')}</p>
              <p className="text-sm font-medium text-[#0D1117]">{file.name}</p>
              <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl mb-2">📁</p>
              <p className="text-sm font-medium text-gray-600">Drag & drop or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, PNG, JPG · max {MAX_MB} MB</p>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Document name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Safeguarding Policy 2025"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Expiry date <span className="font-normal">(optional)</span></label>
              <input
                type="date"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]"
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        {progress > 0 && (
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0F4C35] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={!file || !name.trim() || uploading}
          className="w-full bg-[#0F4C35] text-white text-sm font-semibold py-3 px-4 rounded-xl hover:bg-[#0c3d2a] transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload document'}
        </button>
      </div>
    </div>
  )
}

// ── Document Card ─────────────────────────────────────────────────────────────

function DocumentCard({ doc, onDelete, onShare, onDownload, onSetExpiry }: {
  doc:         Document
  onDelete:    (id: string) => void
  onShare:     (doc: Document) => void
  onDownload:  (doc: Document) => void
  onSetExpiry: (doc: Document) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const cat     = (doc.category as Category)
  const colors  = CATEGORY_COLORS[cat] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  const expiry  = expiryStatus(doc.expiry_date)
  const uploaded = new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    onDelete(doc.id)
  }

  return (
    <div className="bg-white rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex flex-col gap-3 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-shadow">
      {/* Icon + name */}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{fileIcon(doc.file_type)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0D1117] leading-snug line-clamp-2">{doc.name}</p>
          {doc.file_size && <p className="text-xs text-gray-400 mt-0.5">{formatSize(doc.file_size)}</p>}
        </div>
      </div>

      {/* Category badge + expiry */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
          {doc.category}
        </span>
        {expiry && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${expiry.color}`}>
            {expiry.label}
          </span>
        )}
      </div>

      {/* Uploaded date */}
      <p className="text-[10px] text-gray-400">Uploaded {uploaded}</p>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
        <button
          onClick={() => onDownload(doc)}
          className="flex-1 text-xs font-medium text-gray-600 border border-gray-200 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors text-center"
        >
          ↓ Download
        </button>
        <button
          onClick={() => onShare(doc)}
          className="flex-1 text-xs font-medium text-[#0F4C35] border border-[#0F4C35]/30 py-1.5 px-2 rounded-lg hover:bg-[#0F4C35]/5 transition-colors text-center"
        >
          🔗 Share
        </button>
        <button
          onClick={() => onSetExpiry(doc)}
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 py-1.5 px-2 rounded-lg transition-colors"
          title="Set expiry date"
        >
          📅
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-400 hover:text-red-600 border border-red-100 py-1.5 px-2 rounded-lg transition-colors disabled:opacity-50"
          title="Delete"
        >
          🗑
        </button>
      </div>
    </div>
  )
}

// ── Share Modal ───────────────────────────────────────────────────────────────

function ShareModal({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const [url,       setUrl]       = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [copied,    setCopied]    = useState(false)
  const [expiryDays, setExpiryDays] = useState(30)

  async function generate() {
    setLoading(true)
    const res = await fetch(`/api/documents/${doc.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryDays }),
    })
    const json = await res.json()
    setUrl(json.url)
    setLoading(false)
  }

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[#0D1117] text-lg">Share document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Generate a secure link to <span className="font-medium">{doc.name}</span>. No login required to view.
        </p>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Link expires after</label>
          <select
            value={expiryDays}
            onChange={e => setExpiryDays(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35] bg-white"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        {url ? (
          <div>
            <div className="flex items-center gap-2 bg-[#F4F6F5] rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-600 truncate flex-1">{url}</p>
              <button
                onClick={copy}
                className="text-xs font-semibold text-[#0F4C35] flex-shrink-0"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={loading}
            className="w-full bg-[#0F4C35] text-white text-sm font-semibold py-3 px-4 rounded-xl hover:bg-[#0c3d2a] transition-colors disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Generate share link'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Set Expiry Modal ──────────────────────────────────────────────────────────

function SetExpiryModal({ doc, onClose, onSaved }: { doc: Document; onClose: () => void; onSaved: (doc: Document) => void }) {
  const [date, setDate] = useState(doc.expiry_date ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res  = await fetch(`/api/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiry_date: date || null }),
    })
    const json = await res.json()
    if (res.ok) onSaved(json.data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h2 className="font-display font-bold text-[#0D1117]">Set expiry date</h2>
        <p className="text-sm text-gray-500">For <span className="font-medium">{doc.name}</span></p>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4C35]"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-xl">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-[#0F4C35] text-white text-sm font-semibold py-2 rounded-xl disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Vault ────────────────────────────────────────────────────────────────

interface Props {
  initial:  Document[]
  plan:     string
}

export default function DocumentVault({ initial, plan }: Props) {
  const [docs,      setDocs]      = useState<Document[]>(initial)
  const [filter,    setFilter]    = useState<Category | 'All'>('All')
  const [showUpload, setUpload]   = useState(false)
  const [shareDoc,  setShareDoc]  = useState<Document | null>(null)
  const [expiryDoc, setExpiryDoc] = useState<Document | null>(null)

  const visible = filter === 'All' ? docs : docs.filter(d => d.category === filter)

  const handleUploaded = useCallback((doc: Document) => setDocs(prev => [doc, ...prev]), [])
  const handleDelete   = useCallback((id: string) => setDocs(prev => prev.filter(d => d.id !== id)), [])
  const handleSaved    = useCallback((updated: Document) => setDocs(prev => prev.map(d => d.id === updated.id ? updated : d)), [])

  async function handleDownload(doc: Document) {
    const res  = await fetch(`/api/documents/${doc.id}`)
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
  }

  // Gate for free / starter
  if (!['pro', 'agency'].includes(plan)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <div className="text-5xl mb-5">🗄️</div>
        <h2 className="font-display text-2xl font-bold text-[#0D1117] mb-3">Document Vault</h2>
        <p className="text-gray-500 text-sm mb-3 leading-relaxed">
          Store all your charity documents — safeguarding policies, annual accounts, trustee registers — securely in one place. Generate instant share links for funders.
        </p>
        <p className="text-gray-400 text-xs mb-8">Available on Pro and Agency plans</p>
        <Link href="/pricing" className="bg-[#0F4C35] text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-[#0c3d2a] transition-colors">
          Upgrade to Pro — £49/mo
        </Link>
      </div>
    )
  }

  return (
    <>
      {showUpload && <UploadModal onClose={() => setUpload(false)} onUploaded={handleUploaded} />}
      {shareDoc   && <ShareModal  doc={shareDoc}  onClose={() => setShareDoc(null)} />}
      {expiryDoc  && <SetExpiryModal doc={expiryDoc} onClose={() => setExpiryDoc(null)} onSaved={handleSaved} />}

      <div className="px-4 sm:px-6 py-6 sm:py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0D1117]">Document Vault</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''} stored</p>
          </div>
          <button
            onClick={() => setUpload(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-[#0F4C35] text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl hover:bg-[#0c3d2a] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
            Upload
          </button>
        </div>

        {/* Completeness bar — compact on mobile */}
        <CompletenessWidget docs={docs} />

        {/* Category pills — horizontal scroll on mobile, sidebar on desktop */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none' }}>
          {(['All', ...CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat as Category | 'All')}
              className={`flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-full font-medium transition-colors border ${
                filter === cat
                  ? 'bg-[#0F4C35] text-white border-[#0F4C35]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F4C35] hover:text-[#0F4C35]'
              }`}
            >
              {cat}
              {cat !== 'All' && (
                <span className="ml-1 opacity-60">
                  ({docs.filter(d => d.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">

          {/* Grid */}
          {visible.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-[14px]">
              <p className="text-3xl mb-3">📂</p>
              <p className="font-medium text-[#0D1117] text-sm mb-1">No documents yet</p>
              <p className="text-gray-400 text-xs mb-5">
                {filter === 'All'
                  ? 'Upload your first document to get started'
                  : `No ${filter} documents uploaded yet`}
              </p>
              <button
                onClick={() => setUpload(true)}
                className="text-sm font-semibold text-[#0F4C35] hover:underline"
              >
                + Upload document
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDelete}
                  onShare={setShareDoc}
                  onDownload={handleDownload}
                  onSetExpiry={setExpiryDoc}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

