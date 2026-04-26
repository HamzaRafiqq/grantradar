-- ── Funder Portal ─────────────────────────────────────────────────────────────

-- 1. Add user_type to profiles so login routing knows where to send the user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'charity'
  CHECK (user_type IN ('charity', 'funder'));

-- 2. Funder organisation profiles
CREATE TABLE IF NOT EXISTS funder_profiles (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_name         text NOT NULL,
  org_type         text NOT NULL DEFAULT 'foundation'
    CHECK (org_type IN ('trust', 'foundation', 'corporate', 'government', 'lottery', 'other')),
  website          text,
  description      text,
  annual_giving    text
    CHECK (annual_giving IN ('under_100k', '100k_1m', '1m_10m', 'over_10m')),
  focus_areas      text[] DEFAULT '{}',
  geographic_focus text   DEFAULT 'uk_wide',
  logo_url         text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE funder_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funders_own_profile"
  ON funder_profiles FOR ALL USING (auth.uid() = id);

-- 3. Grants created by funders
CREATE TABLE IF NOT EXISTS funder_grants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funder_id           uuid NOT NULL REFERENCES funder_profiles(id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text,
  total_pot           integer,
  min_grant           integer,
  max_grant           integer,
  open_date           date,
  deadline            date,
  decision_date       date,
  cause_areas         text[] DEFAULT '{}',
  geographic_focus    text   DEFAULT 'uk_wide',
  org_types_allowed   text[] DEFAULT '{}',
  income_min          integer,
  income_max          integer,
  years_operating_min integer DEFAULT 0,
  additional_criteria text,
  required_documents  text[] DEFAULT '{}',
  status              text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed', 'archived')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funder_grants_funder_idx ON funder_grants (funder_id);
CREATE INDEX IF NOT EXISTS funder_grants_status_idx ON funder_grants (status);

ALTER TABLE funder_grants ENABLE ROW LEVEL SECURITY;
-- Funder can manage their own grants
CREATE POLICY "funders_manage_grants"
  ON funder_grants FOR ALL USING (funder_id = auth.uid());
-- Charities can read open grants
CREATE POLICY "open_grants_public"
  ON funder_grants FOR SELECT USING (status = 'open');

-- 4. Application questions (dynamic question builder)
CREATE TABLE IF NOT EXISTS funder_grant_questions (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id  uuid NOT NULL REFERENCES funder_grants(id) ON DELETE CASCADE,
  question  text NOT NULL,
  type      text NOT NULL DEFAULT 'text'
    CHECK (type IN ('text', 'number', 'file')),
  required  boolean NOT NULL DEFAULT true,
  order_idx integer NOT NULL DEFAULT 0
);

ALTER TABLE funder_grant_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_readable"
  ON funder_grant_questions FOR SELECT USING (
    grant_id IN (
      SELECT id FROM funder_grants WHERE status = 'open' OR funder_id = auth.uid()
    )
  );
CREATE POLICY "funders_manage_questions"
  ON funder_grant_questions FOR ALL USING (
    grant_id IN (SELECT id FROM funder_grants WHERE funder_id = auth.uid())
  );

-- 5. Applications from charities to funder grants
CREATE TABLE IF NOT EXISTS funder_applications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id         uuid NOT NULL REFERENCES funder_grants(id) ON DELETE CASCADE,
  org_id           uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_requested integer,
  status           text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'under_review', 'shortlisted', 'awarded', 'declined', 'waitlisted')),
  funder_notes     text,
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funder_apps_grant_idx  ON funder_applications (grant_id);
CREATE INDEX IF NOT EXISTS funder_apps_user_idx   ON funder_applications (user_id);
CREATE INDEX IF NOT EXISTS funder_apps_status_idx ON funder_applications (status);

ALTER TABLE funder_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charities_own_applications"
  ON funder_applications FOR ALL USING (user_id = auth.uid());
CREATE POLICY "funders_see_applications"
  ON funder_applications FOR ALL USING (
    grant_id IN (SELECT id FROM funder_grants WHERE funder_id = auth.uid())
  );

-- 6. Answers to application questions
CREATE TABLE IF NOT EXISTS funder_application_answers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES funder_applications(id) ON DELETE CASCADE,
  question_id    uuid NOT NULL REFERENCES funder_grant_questions(id) ON DELETE CASCADE,
  answer_text    text,
  answer_number  numeric,
  file_path      text,
  UNIQUE (application_id, question_id)
);

ALTER TABLE funder_application_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answers_access"
  ON funder_application_answers FOR ALL USING (
    application_id IN (
      SELECT id FROM funder_applications
      WHERE user_id = auth.uid()
         OR grant_id IN (SELECT id FROM funder_grants WHERE funder_id = auth.uid())
    )
  );
