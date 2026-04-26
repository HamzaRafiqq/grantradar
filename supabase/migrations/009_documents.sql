-- Document vault
CREATE TABLE IF NOT EXISTS documents (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  category      text        NOT NULL,
  storage_path  text        NOT NULL UNIQUE,
  file_size     integer,
  file_type     text,
  expiry_date   date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_org_idx      ON documents (org_id);
CREATE INDEX IF NOT EXISTS documents_expiry_idx   ON documents (expiry_date);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_documents"
  ON documents FOR ALL
  USING (auth.uid() = user_id);

-- Share tokens (public, no auth)
CREATE TABLE IF NOT EXISTS document_shares (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  token         text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_shares_token_idx ON document_shares (token);
CREATE INDEX IF NOT EXISTS document_shares_doc_idx   ON document_shares (document_id);

ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;

-- Share tokens are public-readable (needed for /docs/share/[token] page)
CREATE POLICY "shares_publicly_readable"
  ON document_shares FOR SELECT USING (true);

CREATE POLICY "users_create_own_shares"
  ON document_shares FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_shares"
  ON document_shares FOR DELETE
  USING (
    document_id IN (
      SELECT id FROM documents WHERE user_id = auth.uid()
    )
  );
