import Link from 'next/link'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@supabase/supabase-js')

interface PageProps { params: Promise<{ token: string }> }

const FILE_ICONS: Record<string, string> = {
  pdf:  '📄', doc: '📝', docx: '📝',
  xls:  '📊', xlsx: '📊',
  png:  '🖼️', jpg: '🖼️', jpeg: '🖼️',
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: share } = await supabase
    .from('document_shares')
    .select('*, document:documents(*, org:organisations(name))')
    .eq('token', token)
    .single()

  const expired  = share ? new Date(share.expires_at) < new Date() : false
  const invalid  = !share
  const document = share?.document

  if (invalid || expired) {
    return (
      <div className="min-h-screen bg-[#F4F6F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">{invalid ? '🔒' : '⏰'}</div>
          <h1 className="font-display font-bold text-[#0D1117] text-xl mb-2">
            {invalid ? 'Invalid link' : 'Link expired'}
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            {invalid
              ? 'This share link is not valid.'
              : 'This share link has expired. Ask the sender for a new one.'}
          </p>
          <Link href="/" className="text-sm text-[#0F4C35] font-medium hover:underline">
            Go to FundsRadar →
          </Link>
        </div>
      </div>
    )
  }

  const icon = FILE_ICONS[document.file_type ?? ''] ?? '📎'
  const expiresDate = new Date(share.expires_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const fileSizeKb = document.file_size ? `${(document.file_size / 1024).toFixed(0)} KB` : null
  const downloadUrl = `/api/docs/share/${token}`

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-lg bg-[#0F4C35] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#00C875" strokeWidth="1.75"/>
              <circle cx="8" cy="8" r="2.5" fill="#00C875"/>
            </svg>
          </div>
          <span className="font-display font-bold text-[#0D1117]">FundsRadar</span>
        </div>

        {/* Document info */}
        <div className="flex items-start gap-4 mb-6">
          <div className="text-4xl">{icon}</div>
          <div>
            <h1 className="font-display font-bold text-[#0D1117] text-lg leading-snug">{document.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {document.org?.name} · {document.category}
            </p>
            {fileSizeKb && <p className="text-gray-400 text-xs mt-1">{fileSizeKb}</p>}
          </div>
        </div>

        {/* Download */}
        <a
          href={downloadUrl}
          className="block w-full text-center bg-[#0F4C35] text-white font-semibold text-sm py-3 px-4 rounded-xl hover:bg-[#0c3d2a] transition-colors mb-4"
        >
          View / Download document →
        </a>

        <p className="text-xs text-gray-400 text-center">
          This shared link expires on {expiresDate}
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Powered by <Link href="/" className="text-[#0F4C35] hover:underline">FundsRadar</Link>
      </p>
    </div>
  )
}
