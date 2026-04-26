-- 013_leads.sql
-- Captures email leads from public pages (deadlines, blog, etc.)
CREATE TABLE IF NOT EXISTS leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  source      text NOT NULL DEFAULT 'unknown',
  subscribed  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- No RLS — this is server-side only via service role / anon insert
-- Allow anon users to insert (public pages call this without auth)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert_leads" ON leads FOR INSERT WITH CHECK (true);
-- Only service role can read
CREATE POLICY "service_read_leads" ON leads FOR SELECT USING (auth.role() = 'service_role');
