-- Add trust_score to organisations
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 0;

-- Trust score history (one row per weekly recalculation)
CREATE TABLE IF NOT EXISTS trust_score_history (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  total_score         integer     NOT NULL,
  governance_score    integer     NOT NULL DEFAULT 0,
  financial_score     integer     NOT NULL DEFAULT 0,
  document_score      integer     NOT NULL DEFAULT 0,
  track_record_score  integer     NOT NULL DEFAULT 0,
  application_score   integer     NOT NULL DEFAULT 0,
  improvements        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trust_score_history_org_idx     ON trust_score_history (org_id);
CREATE INDEX IF NOT EXISTS trust_score_history_created_idx ON trust_score_history (created_at DESC);

ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_trust_scores"
  ON trust_score_history FOR SELECT
  USING (
    org_id IN (
      SELECT id FROM organisations WHERE user_id = auth.uid()
    )
  );
