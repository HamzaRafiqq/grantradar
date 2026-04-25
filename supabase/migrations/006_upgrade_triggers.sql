-- Track which grant gate elements free users click (conversion analytics)
CREATE TABLE IF NOT EXISTS upgrade_triggers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  grant_id    uuid REFERENCES grants(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('funder_name', 'deadline', 'apply_link')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS upgrade_triggers_user_idx  ON upgrade_triggers (user_id);
CREATE INDEX IF NOT EXISTS upgrade_triggers_grant_idx ON upgrade_triggers (grant_id);
CREATE INDEX IF NOT EXISTS upgrade_triggers_type_idx  ON upgrade_triggers (trigger_type);

-- RLS: users can insert their own; service role reads all for analytics
ALTER TABLE upgrade_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_triggers"
  ON upgrade_triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
