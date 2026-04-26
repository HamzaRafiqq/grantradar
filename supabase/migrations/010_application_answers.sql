-- AI Application Writer: store per-question draft answers
CREATE TABLE IF NOT EXISTS application_answers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid        NOT NULL REFERENCES grant_matches(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  question    text        NOT NULL,
  answer      text        NOT NULL DEFAULT '',
  ai_score    integer,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, question)
);

CREATE INDEX IF NOT EXISTS app_answers_match_idx ON application_answers (match_id);
CREATE INDEX IF NOT EXISTS app_answers_user_idx  ON application_answers (user_id);

ALTER TABLE application_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_answers"
  ON application_answers FOR ALL
  USING (auth.uid() = user_id);
