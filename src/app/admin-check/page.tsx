import { createClient } from '@/lib/supabase/server'

// Temporary debug page — shows your current login email
// Visit: /admin-check to see your email, then set ADMIN_EMAIL in Vercel
export default async function AdminCheckPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminEmail = process.env.ADMIN_EMAIL
  const currentEmail = user?.email ?? null
  const isMatch = currentEmail === adminEmail

  return (
    <div style={{ fontFamily: 'monospace', padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>🔑 Admin Setup Check</h1>

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <tr>
            <td style={{ padding: '8px 12px', background: '#f3f4f6', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>
              Your login email
            </td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', color: currentEmail ? '#111' : '#ef4444' }}>
              {currentEmail ?? '❌ Not logged in'}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 12px', background: '#f3f4f6', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>
              ADMIN_EMAIL env var
            </td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', color: adminEmail ? '#111' : '#ef4444' }}>
              {adminEmail ?? '❌ Not set — add ADMIN_EMAIL in Vercel dashboard'}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '8px 12px', background: '#f3f4f6', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>
              Match?
            </td>
            <td style={{ padding: '8px 12px', border: '1px solid #e5e7eb', color: isMatch ? '#16a34a' : '#ef4444', fontWeight: 'bold' }}>
              {isMatch ? '✅ Yes — /admin should work' : '❌ No — see fix below'}
            </td>
          </tr>
        </tbody>
      </table>

      {!isMatch && (
        <div style={{ marginTop: 32, background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>How to fix:</h2>
          {!adminEmail && (
            <p>
              <strong>ADMIN_EMAIL is not set in your Vercel environment.</strong>
              <br />Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
              <br />Add: <code style={{ background: '#f3f4f6', padding: '2px 6px' }}>ADMIN_EMAIL</code> = <code style={{ background: '#f3f4f6', padding: '2px 6px' }}>{currentEmail ?? 'your-email@example.com'}</code>
              <br /><br />Then redeploy.
            </p>
          )}
          {adminEmail && currentEmail && !isMatch && (
            <p>
              <strong>Email mismatch.</strong> You&apos;re logged in as <code style={{ background: '#f3f4f6', padding: '2px 6px' }}>{currentEmail}</code> but ADMIN_EMAIL is set to <code style={{ background: '#f3f4f6', padding: '2px 6px' }}>{adminEmail}</code>.
              <br /><br />
              Either:
              <br />• Log in with <strong>{adminEmail}</strong>, or
              <br />• Change ADMIN_EMAIL in Vercel to <strong>{currentEmail}</strong>
            </p>
          )}
          {!currentEmail && (
            <p>You are not logged in. <a href="/login" style={{ color: '#0F4C35' }}>Log in first →</a></p>
          )}
        </div>
      )}

      {isMatch && (
        <div style={{ marginTop: 32, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: 20 }}>
          <strong>✅ Everything looks good!</strong> Visit <a href="/admin" style={{ color: '#0F4C35' }}>/admin</a>
        </div>
      )}

      <p style={{ marginTop: 32, fontSize: 12, color: '#9ca3af' }}>
        Delete /src/app/admin-check/ after setup is complete.
      </p>
    </div>
  )
}
