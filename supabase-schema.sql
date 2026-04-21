-- ============================================================
-- GrantRadar Database Schema
-- ============================================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  plan text not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. ORGANISATIONS TABLE
create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sector text not null,
  location text not null,
  annual_income text not null,
  registered_charity boolean not null default true,
  charity_number text,
  beneficiaries text,
  current_projects text,
  created_at timestamptz not null default now()
);

alter table public.organisations enable row level security;

create policy "Users can manage own organisation"
  on public.organisations for all
  using (auth.uid() = user_id);


-- 3. GRANTS TABLE
create table if not exists public.grants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  funder text not null,
  description text not null,
  eligibility_criteria text not null,
  min_award integer not null default 0,
  max_award integer not null,
  deadline date not null,
  application_url text not null,
  sectors text[] not null default '{}',
  locations text[] not null default '{}',
  income_requirements text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.grants enable row level security;

create policy "Grants are publicly readable"
  on public.grants for select
  using (true);


-- 4. GRANT MATCHES TABLE
create table if not exists public.grant_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  grant_id uuid not null references public.grants(id) on delete cascade,
  eligibility_score integer not null check (eligibility_score between 1 and 10),
  match_reason text not null,
  watch_out text,
  status text not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id, grant_id)
);

alter table public.grant_matches enable row level security;

create policy "Users can manage own grant matches"
  on public.grant_matches for all
  using (auth.uid() = user_id);


-- ============================================================
-- SEED GRANTS (one INSERT per grant to avoid syntax issues)
-- ============================================================

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Awards for All',
  'National Lottery Community Fund',
  'A simple small grants programme for local communities. Funds projects that help people and communities thrive.',
  'Must be a constituted group or registered charity in the UK. Annual income under 500000.',
  300, 10000,
  (current_date + interval '3 months')::date,
  'https://www.tnlcommunityfund.org.uk/funding/programmes/national-lottery-awards-for-all-england',
  ARRAY['children','elderly','homelessness','arts','environment','education','health','disability','animals','other'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'Annual income must be under 500000'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Relief of Poverty and Social Welfare Grants',
  'The Henry Smith Charity',
  'Supports charities working with people experiencing poverty and social disadvantage in the UK.',
  'Registered UK charities with annual income between 100000 and 2 million. Must work with people in poverty or disadvantage.',
  10000, 50000,
  (current_date + interval '2 months')::date,
  'https://www.henrysmithcharity.org.uk/grants/relief-of-poverty-and-social-welfare/',
  ARRAY['homelessness','children','elderly','disability','health'],
  ARRAY['England','Scotland','Wales'],
  'Annual income between 100k and 2 million'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Core Funding Programme',
  'Lloyds Bank Foundation for England and Wales',
  'Core funding for small and medium-sized charities tackling complex social issues.',
  'Registered charities with annual income between 25000 and 1 million. Must work with people facing complex social issues in England or Wales.',
  25000, 75000,
  (current_date + interval '5 months')::date,
  'https://www.lloydsbankfoundation.org.uk/our-funding/core-and-enable',
  ARRAY['homelessness','children','disability','health','other'],
  ARRAY['England','Wales'],
  'Annual income between 25000 and 1 million'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Comic Relief UK Grants',
  'Comic Relief',
  'Funds bold and creative projects across the UK that create positive change for people living difficult lives.',
  'UK registered charities and community organisations. Must demonstrate impact and have sound financial management.',
  20000, 100000,
  (current_date + interval '4 months')::date,
  'https://comicrelief.com/our-grants/',
  ARRAY['children','homelessness','health','education','disability','other'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'No specific income restrictions but must demonstrate financial sustainability'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'General Grants Programme',
  'Garfield Weston Foundation',
  'One of the largest family foundations, supporting charities across a wide range of causes.',
  'Registered UK charities. Must have filed accounts with the Charity Commission. Priority given to charities with a proven track record.',
  5000, 50000,
  (current_date + interval '1 month')::date,
  'https://garfieldweston.org/apply-for-a-grant/',
  ARRAY['arts','education','health','environment','children','elderly','other'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'No specific income cap but must have filed accounts'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Reaching Communities',
  'National Lottery Community Fund',
  'Larger grants for organisations supporting people and communities in England facing greater adversity.',
  'UK-based organisations with a track record of community benefit. Projects must benefit people experiencing significant disadvantage.',
  10000, 500000,
  (current_date + interval '6 months')::date,
  'https://www.tnlcommunityfund.org.uk/funding/programmes/reaching-communities-england',
  ARRAY['children','elderly','homelessness','education','health','disability','other'],
  ARRAY['England'],
  'No income cap but must demonstrate organisational capacity'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Open Grants Programme',
  'Esmee Fairbairn Foundation',
  'One of the largest independent foundations in the UK, supporting organisations that enrich UK life.',
  'Registered UK charities and social enterprises. Must have a clear mission and demonstrate impact.',
  20000, 150000,
  (current_date + interval '3 months')::date,
  'https://esmeefairbairn.org.uk/our-work/our-funding/',
  ARRAY['arts','environment','education','health','children','other'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'Annual income typically above 100000'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Capital and Equipment Grants',
  'The Wolfson Foundation',
  'Funds capital projects including buildings, equipment, and refurbishment for charities delivering excellence in health and education.',
  'UK registered charities and public bodies. Must be for capital expenditure. Priority given to health and education sectors.',
  10000, 75000,
  (current_date + interval '4 months')::date,
  'https://www.wolfson.org.uk/funding/funding-guidelines/',
  ARRAY['education','health'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'No income restriction but must be for capital expenditure'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Arts and Learning Grants',
  'Paul Hamlyn Foundation',
  'Supports arts organisations and projects that enable more people to enjoy and be inspired by the arts and culture.',
  'UK registered charities and not-for-profit organisations. Must work in arts, music, or cultural heritage. Must demonstrate access and inclusion.',
  5000, 50000,
  (current_date + interval '2 months')::date,
  'https://www.phf.org.uk/our-grants/',
  ARRAY['arts','education','children','disability'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'Particularly interested in organisations with income under 1 million'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Open Grants for Small Charities',
  'Tudor Trust',
  'Long-term funding for small grassroots charities doing vital work in communities.',
  'Small registered charities with annual income under 500000. Must have been operating for at least 2 years.',
  5000, 30000,
  (current_date + interval '5 months')::date,
  'https://www.tudortrust.org.uk/apply',
  ARRAY['homelessness','children','elderly','disability','health','other'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'Annual income must be under 500000'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Young Persons Grants',
  'BBC Children in Need',
  'Funds projects that make a positive difference to the lives of children and young people who are disadvantaged or disabled.',
  'UK charities working directly with children and young people under 18 who are disadvantaged or disabled.',
  5000, 100000,
  (current_date + interval '3 months')::date,
  'https://www.bbcchildreninneed.co.uk/grants/',
  ARRAY['children','disability','education'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'No income restriction; must work directly with children under 18'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'The Environment Fund',
  'The Baring Foundation',
  'Supports charities working on environmental issues, climate action, and nature conservation.',
  'Registered UK charities with a clear environmental mission. Must demonstrate measurable environmental outcomes.',
  10000, 60000,
  (current_date + interval '4 months')::date,
  'https://www.baringfoundation.org.uk/our-grants/',
  ARRAY['environment'],
  ARRAY['England','Scotland','Wales'],
  'Annual income typically between 50000 and 2 million'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Community Sport Activation Fund',
  'Sport England',
  'Helps people in underrepresented communities get active through sport and physical activity.',
  'Charities and sports clubs in England. Must engage people currently inactive in sport. Priority for deprived areas.',
  500, 15000,
  (current_date + interval '2 months')::date,
  'https://www.sportengland.org/how-we-can-help/our-funds',
  ARRAY['health','children','elderly','disability'],
  ARRAY['England'],
  'No income restriction'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Arts Council Project Grants',
  'Arts Council England',
  'Supports individual artists, arts organisations, and creative projects of all kinds.',
  'Individuals, arts organisations, and not-for-profits based in England. Must have a clear arts element and demonstrate public benefit.',
  1000, 100000,
  (current_date + interval '1 month')::date,
  'https://www.artscouncil.org.uk/ProjectGrants',
  ARRAY['arts','education'],
  ARRAY['England'],
  'No income restriction'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Older People Programme',
  'Age UK Charitable Trust',
  'Funds organisations working to improve the lives of older people. Supports projects tackling loneliness and enabling independence.',
  'Registered UK charities working with people aged 65 and over. Must demonstrate direct impact on older people wellbeing.',
  5000, 40000,
  (current_date + interval '5 months')::date,
  'https://www.ageuk.org.uk/our-impact/funding/',
  ARRAY['elderly','health','disability'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'Annual income under 2 million preferred'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Disability Action Fund',
  'Motability Foundation',
  'Supports charities helping disabled people access transport and participate fully in society.',
  'UK registered charities working to improve mobility and independence for disabled people.',
  5000, 50000,
  (current_date + interval '3 months')::date,
  'https://www.motabilityfoundation.org.uk/how-we-help/grants/',
  ARRAY['disability','health','elderly'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'Annual income between 10000 and 5 million'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Mental Health Foundation Grants',
  'Mental Health Foundation',
  'Funds innovative research and community projects that prevent mental health problems across the UK.',
  'UK charities with expertise in mental health. Must demonstrate innovation. Priority for prevention-focused work.',
  10000, 80000,
  (current_date + interval '4 months')::date,
  'https://www.mentalhealth.org.uk/about-us/our-funding',
  ARRAY['health','children','elderly','homelessness'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'No specific income restriction'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Homeless Link Member Support Fund',
  'Homeless Link',
  'Supports frontline homelessness charities with funding for projects that help people out of homelessness.',
  'UK charities working directly with homeless people or those at risk. Must be a Homeless Link member.',
  5000, 35000,
  (current_date + interval '2 months')::date,
  'https://www.homeless.org.uk/connect/grants',
  ARRAY['homelessness'],
  ARRAY['England'],
  'Annual income under 3 million'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Animal Welfare Grants',
  'Dogs Trust Grants Programme',
  'Supports animal welfare charities working to rescue, rehabilitate, and rehome animals across the UK.',
  'UK registered charities working in animal welfare. Must have direct animal welfare activities.',
  2000, 25000,
  (current_date + interval '6 months')::date,
  'https://www.dogstrust.org.uk/about-us/grants',
  ARRAY['animals'],
  ARRAY['England','Scotland','Wales','Northern Ireland'],
  'Annual income under 1 million preferred'
);

insert into public.grants (name, funder, description, eligibility_criteria, min_award, max_award, deadline, application_url, sectors, locations, income_requirements) values (
  'Education Endowment Foundation Grants',
  'Education Endowment Foundation',
  'Funds projects that improve educational attainment for disadvantaged pupils.',
  'Schools, MATs, and education charities in England. Must focus on improving outcomes for disadvantaged pupils.',
  50000, 300000,
  (current_date + interval '5 months')::date,
  'https://educationendowmentfoundation.org.uk/funding',
  ARRAY['education','children'],
  ARRAY['England'],
  'Must be working with schools or educational settings'
);
