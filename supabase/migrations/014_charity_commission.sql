-- ============================================================
-- Charity Commission Bulk Data Tables
-- Migration 014
-- ============================================================

-- ── 1. Core charity register ──────────────────────────────────────────────────
create table if not exists public.cc_charity_core (
  id                        uuid        primary key default gen_random_uuid(),
  registration_number       text        not null unique,
  linked_charity_number     text,
  charity_name              text        not null,
  charity_type              text,
  registration_status       text        not null default 'Registered',
  date_of_registration      timestamptz,
  date_of_removal           timestamptz,
  reporting_status          text,
  latest_fin_period_start   timestamptz,
  latest_fin_period_end     timestamptz,
  contact_address1          text,
  contact_address2          text,
  contact_address3          text,
  contact_address4          text,
  contact_address5          text,
  contact_postcode          text,
  contact_phone             text,
  contact_email             text,
  contact_web               text,
  charity_activities        text,
  charity_gift_aid          boolean,
  charity_has_land          boolean,
  charitable_objects        text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists idx_cc_charity_core_name
  on public.cc_charity_core (charity_name);
create index if not exists idx_cc_charity_core_status
  on public.cc_charity_core (registration_status);
create index if not exists idx_cc_charity_core_postcode
  on public.cc_charity_core (contact_postcode);

-- ── 2. Financial history (10 years per charity) ───────────────────────────────
create table if not exists public.cc_financial_history (
  id                            uuid        primary key default gen_random_uuid(),
  registration_number           text        not null references public.cc_charity_core(registration_number) on delete cascade,
  period_end_date               timestamptz not null,
  period_start_date             timestamptz,
  period_order                  int         not null default 1,
  income_donations_legacies     bigint,
  income_charitable_activities  bigint,
  income_other_trading          bigint,
  income_investments            bigint,
  income_other                  bigint,
  income_total                  bigint,
  expenditure_raising_funds     bigint,
  expenditure_charitable        bigint,
  expenditure_other             bigint,
  expenditure_total             bigint,
  net_income                    bigint,
  total_funds_end_period        bigint,
  account_type                  text,
  created_at                    timestamptz not null default now(),
  unique (registration_number, period_end_date)
);

create index if not exists idx_cc_financial_history_reg
  on public.cc_financial_history (registration_number);
create index if not exists idx_cc_financial_history_period
  on public.cc_financial_history (period_end_date);

-- ── 3. Geographic areas ───────────────────────────────────────────────────────
create table if not exists public.cc_geographic_area (
  id                    uuid primary key default gen_random_uuid(),
  registration_number   text not null references public.cc_charity_core(registration_number) on delete cascade,
  geographic_area       text not null,
  unique (registration_number, geographic_area)
);

create index if not exists idx_cc_geographic_area_reg
  on public.cc_geographic_area (registration_number);
create index if not exists idx_cc_geographic_area_area
  on public.cc_geographic_area (geographic_area);

-- ── 4. Classifications (cause areas, beneficiaries, how) ──────────────────────
create table if not exists public.cc_classification (
  id                    uuid primary key default gen_random_uuid(),
  registration_number   text not null references public.cc_charity_core(registration_number) on delete cascade,
  classification_code   text not null,
  classification_type   text not null,
  classification_desc   text,
  unique (registration_number, classification_code, classification_type)
);

create index if not exists idx_cc_classification_reg
  on public.cc_classification (registration_number);
create index if not exists idx_cc_classification_code
  on public.cc_classification (classification_code);
create index if not exists idx_cc_classification_type
  on public.cc_classification (classification_type);

-- ── 5. Trustees ───────────────────────────────────────────────────────────────
create table if not exists public.cc_trustee (
  id                    uuid primary key default gen_random_uuid(),
  registration_number   text not null references public.cc_charity_core(registration_number) on delete cascade,
  trustee_id            text,
  trustee_name          text not null,
  is_chair              boolean not null default false,
  unique (registration_number, trustee_name)
);

create index if not exists idx_cc_trustee_reg
  on public.cc_trustee (registration_number);
create index if not exists idx_cc_trustee_name
  on public.cc_trustee (trustee_name);

-- ── 6. Other / previous names ─────────────────────────────────────────────────
create table if not exists public.cc_other_name (
  id                    uuid primary key default gen_random_uuid(),
  registration_number   text not null references public.cc_charity_core(registration_number) on delete cascade,
  name_type             text not null,
  name                  text not null,
  unique (registration_number, name_type, name)
);

create index if not exists idx_cc_other_name_reg
  on public.cc_other_name (registration_number);

-- ── 7. Events (registration history, status changes) ─────────────────────────
create table if not exists public.cc_event (
  id                    uuid primary key default gen_random_uuid(),
  registration_number   text not null references public.cc_charity_core(registration_number) on delete cascade,
  event_type            text not null,
  date_of_event         timestamptz,
  reason_for_event      text
);

create index if not exists idx_cc_event_reg
  on public.cc_event (registration_number);
create index if not exists idx_cc_event_type
  on public.cc_event (event_type);

-- ── 8. Linked charities (group structures) ───────────────────────────────────
create table if not exists public.cc_linked_charity (
  id                      uuid primary key default gen_random_uuid(),
  registration_number     text not null references public.cc_charity_core(registration_number) on delete cascade,
  linked_charity_number   text not null,
  linked_charity_name     text,
  unique (registration_number, linked_charity_number)
);

create index if not exists idx_cc_linked_charity_reg
  on public.cc_linked_charity (registration_number);

-- ── 9. Annual return compliance ───────────────────────────────────────────────
create table if not exists public.cc_annual_return (
  id                          uuid primary key default gen_random_uuid(),
  registration_number         text not null references public.cc_charity_core(registration_number) on delete cascade,
  ar_cycle_reference          text,
  date_return_received        timestamptz,
  date_return_required        timestamptz,
  total_gross_income          bigint,
  total_gross_expenditure     bigint,
  accounts_required           boolean,
  accounts_received           boolean,
  accounts_type               text,
  period_end                  timestamptz,
  unique (registration_number, ar_cycle_reference)
);

create index if not exists idx_cc_annual_return_reg
  on public.cc_annual_return (registration_number);

-- ── 10. Sync log ──────────────────────────────────────────────────────────────
create table if not exists public.cc_sync_log (
  id              uuid        primary key default gen_random_uuid(),
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  status          text        not null default 'running',  -- running | success | failed
  rows_core       int,
  rows_financial  int,
  rows_geographic int,
  rows_class      int,
  rows_trustees   int,
  rows_names      int,
  rows_events     int,
  rows_linked     int,
  rows_returns    int,
  error_message   text,
  duration_ms     int
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Public read access (CC data is public domain)
-- Write only via service_role (import script uses service role key)

alter table public.cc_charity_core     enable row level security;
alter table public.cc_financial_history enable row level security;
alter table public.cc_geographic_area   enable row level security;
alter table public.cc_classification    enable row level security;
alter table public.cc_trustee           enable row level security;
alter table public.cc_other_name        enable row level security;
alter table public.cc_event             enable row level security;
alter table public.cc_linked_charity    enable row level security;
alter table public.cc_annual_return     enable row level security;
alter table public.cc_sync_log          enable row level security;

-- Public read
create policy "Public read cc_charity_core"      on public.cc_charity_core      for select using (true);
create policy "Public read cc_financial_history" on public.cc_financial_history  for select using (true);
create policy "Public read cc_geographic_area"   on public.cc_geographic_area    for select using (true);
create policy "Public read cc_classification"    on public.cc_classification     for select using (true);
create policy "Public read cc_trustee"           on public.cc_trustee            for select using (true);
create policy "Public read cc_other_name"        on public.cc_other_name         for select using (true);
create policy "Public read cc_event"             on public.cc_event              for select using (true);
create policy "Public read cc_linked_charity"    on public.cc_linked_charity     for select using (true);
create policy "Public read cc_annual_return"     on public.cc_annual_return      for select using (true);
create policy "Public read cc_sync_log"          on public.cc_sync_log           for select using (true);
