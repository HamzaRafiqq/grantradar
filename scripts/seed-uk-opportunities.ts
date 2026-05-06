import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  try {
    const lines = readFileSync(join(process.cwd(), '.env.local'), 'utf-8').split('\n')
    for (const line of lines) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 1) continue
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim()
      if (k && !process.env[k]) process.env[k] = v
    }
  } catch { /* ignore */ }
}

const GRANTS = [
  {
    name: 'National Lottery Awards for All England',
    funder: 'National Lottery Community Fund',
    funder_type: 'Lottery',
    min_award: 300,
    max_award: 10000,
    description: 'Awards for All is a simple small grants programme for local communities. Apply for £300 to £10,000 for projects that bring communities together.',
    public_title: 'Small Grants Programme — Lottery Distributor',
    public_description: 'A simple small grants programme for local communities. Apply for £300 to £10,000.',
    application_url: 'https://www.tnlcommunityfund.org.uk/funding/programmes/national-lottery-awards-for-all-england',
    sectors: ['community', 'education', 'health', 'arts', 'sport', 'environment'],
    locations: ['England'],
    eligibility_criteria: 'Community organisations, charities, schools, statutory bodies',
    income_requirements: 'any size',
  },
  {
    name: 'National Lottery Reaching Communities England',
    funder: 'National Lottery Community Fund',
    funder_type: 'Lottery',
    min_award: 10000,
    max_award: 500000,
    description: 'Funding for organisations working with people and communities who experience disadvantage.',
    public_title: 'Large Grants Programme — Lottery Distributor',
    public_description: 'Funding for organisations working with people and communities who experience disadvantage.',
    application_url: 'https://www.tnlcommunityfund.org.uk/funding/programmes/reaching-communities-england',
    sectors: ['community', 'poverty', 'disability', 'elderly', 'children'],
    locations: ['England'],
    eligibility_criteria: 'Voluntary and community organisations, charities, social enterprises',
    income_requirements: 'any size',
  },
  {
    name: 'National Lottery Community Fund Scotland',
    funder: 'National Lottery Community Fund',
    funder_type: 'Lottery',
    min_award: 300,
    max_award: 150000,
    description: 'Funding for projects that make a difference to communities across Scotland.',
    public_title: 'Community Grants Scotland — Lottery Distributor',
    public_description: 'Funding for projects that make a difference to communities.',
    application_url: 'https://www.tnlcommunityfund.org.uk/funding/scotland',
    sectors: ['community', 'health', 'arts', 'environment'],
    locations: ['Scotland'],
    eligibility_criteria: 'Community organisations, charities, statutory bodies',
    income_requirements: 'any size',
  },
  {
    name: 'National Lottery Community Fund Wales',
    funder: 'National Lottery Community Fund',
    funder_type: 'Lottery',
    min_award: 300,
    max_award: 500000,
    description: 'Funding for projects and organisations that make a real difference to communities in Wales.',
    public_title: 'Community Grants Wales — Lottery Distributor',
    public_description: 'Funding for projects and organisations that make a real difference to communities.',
    application_url: 'https://www.tnlcommunityfund.org.uk/funding/wales',
    sectors: ['community', 'health', 'arts', 'environment'],
    locations: ['Wales'],
    eligibility_criteria: 'Community organisations, charities, statutory bodies',
    income_requirements: 'any size',
  },
  {
    name: 'Sport England Together Fund',
    funder: 'Sport England',
    funder_type: 'Government',
    min_award: 300,
    max_award: 10000,
    description: 'Funding to help people and communities across England get and stay active.',
    public_title: 'Sport and Physical Activity Grant — Government Funder',
    public_description: 'Funding to help people and communities get and stay active.',
    application_url: 'https://www.sportengland.org/funds-and-campaigns/together-fund',
    sectors: ['sport', 'health', 'community', 'children'],
    locations: ['England'],
    eligibility_criteria: 'Community organisations, sports clubs, charities',
    income_requirements: 'any size',
  },
  {
    name: 'Arts Council England National Lottery Project Grants',
    funder: 'Arts Council England',
    funder_type: 'Lottery',
    min_award: 1000,
    max_award: 100000,
    description: 'Open access programme for arts, museums and libraries. For individuals, arts organisations, museums and libraries in England.',
    public_title: 'Arts and Culture Grant — Lottery Distributor',
    public_description: 'Open access programme for arts, museums and libraries.',
    application_url: 'https://www.artscouncil.org.uk/project-grants',
    sectors: ['arts', 'culture', 'heritage', 'museums'],
    locations: ['England'],
    eligibility_criteria: 'Individuals, arts organisations, museums, libraries',
    income_requirements: 'any size',
  },
  {
    name: 'The Henry Smith Charity',
    funder: 'The Henry Smith Charity',
    funder_type: 'Trust',
    min_award: 5000,
    max_award: 50000,
    description: 'Grants to registered charities working with people who are disadvantaged or in difficult circumstances. Focus on mental health, disadvantaged communities, and older people.',
    public_title: 'Community Grant — Major Independent Trust',
    public_description: 'Grants for charities working with people who are disadvantaged or in difficult circumstances.',
    application_url: 'https://www.henrysmithcharity.org.uk/apply-for-a-grant/',
    sectors: ['mental health', 'poverty', 'elderly', 'disability', 'community'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Registered charities',
    income_requirements: 'any size',
  },
  {
    name: 'Tudor Trust',
    funder: 'Tudor Trust',
    funder_type: 'Trust',
    min_award: 1000,
    max_award: 50000,
    description: 'Tudor Trust supports a wide range of community organisations. We look for groups that are rooted in their communities and working to address local needs.',
    public_title: 'Community Development Grant — Major Independent Trust',
    public_description: 'Supporting community organisations rooted in their communities and working to address local needs.',
    application_url: 'https://www.tudortrust.org.uk/apply',
    sectors: ['community', 'poverty', 'housing', 'homelessness', 'mental health'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Community organisations, charities',
    income_requirements: 'any size',
  },
  {
    name: 'Lloyds Bank Foundation England and Wales',
    funder: 'Lloyds Bank Foundation for England and Wales',
    funder_type: 'Corporate',
    min_award: 25000,
    max_award: 75000,
    description: 'We exclusively fund registered charities with an income between £25,000 and £1 million that focus on complex social issues.',
    public_title: 'Core Funding Grant — Corporate Foundation',
    public_description: 'Funding for charities focusing on complex social issues.',
    application_url: 'https://www.lloydsbankfoundation.org.uk/we-fund',
    sectors: ['poverty', 'homelessness', 'mental health', 'disability'],
    locations: ['England', 'Wales'],
    eligibility_criteria: 'Registered charities with income £25,000 to £1 million',
    income_requirements: 'any size',
  },
  {
    name: 'The Clothworkers Foundation',
    funder: 'The Clothworkers Foundation',
    funder_type: 'Trust',
    min_award: 5000,
    max_award: 40000,
    description: 'The Clothworkers Foundation supports registered charities working with people who are disadvantaged in the UK.',
    public_title: 'Capital and Revenue Grant — Independent Trust',
    public_description: 'Supporting charities working with people who are disadvantaged.',
    application_url: 'https://www.clothworkersfoundation.org.uk/apply',
    sectors: ['poverty', 'disability', 'elderly', 'children', 'community'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Registered charities',
    income_requirements: 'any size',
  },
  {
    name: 'Paul Hamlyn Foundation',
    funder: 'Paul Hamlyn Foundation',
    funder_type: 'Trust',
    min_award: 5000,
    max_award: 60000,
    description: 'Paul Hamlyn Foundation supports people to overcome disadvantage and lack of opportunity through arts and education.',
    public_title: 'Arts and Young People Grant — Major Independent Trust',
    public_description: 'Supporting people to overcome disadvantage through arts and education.',
    application_url: 'https://www.phf.org.uk/apply',
    sectors: ['arts', 'education', 'children', 'poverty'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Registered charities, social enterprises',
    income_requirements: 'any size',
  },
  {
    name: 'The Garfield Weston Foundation',
    funder: 'Garfield Weston Foundation',
    funder_type: 'Trust',
    min_award: 1000,
    max_award: 100000,
    description: 'One of the UK\'s largest family foundations. Funds welfare, education, arts, community, youth, health, religion, and environment.',
    public_title: 'General Grant — Major Independent Trust',
    public_description: 'One of the UK\'s largest family foundations supporting welfare, education, arts and more.',
    application_url: 'https://www.garfieldweston.org/apply-for-a-grant',
    sectors: ['community', 'education', 'arts', 'health', 'environment', 'welfare'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Registered charities',
    income_requirements: 'any size',
  },
  {
    name: 'The Joseph Rowntree Foundation',
    funder: 'Joseph Rowntree Foundation',
    funder_type: 'Trust',
    min_award: 10000,
    max_award: 150000,
    description: 'JRF funds work that solves poverty in the UK. We are interested in what works to reduce poverty and its underlying causes.',
    public_title: 'Research and Policy Grant — Independent Trust',
    public_description: 'Funding work that solves poverty in the UK.',
    application_url: 'https://www.jrf.org.uk/funding',
    sectors: ['poverty', 'housing', 'employment'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Research organisations, charities, social enterprises',
    income_requirements: 'any size',
  },
  {
    name: 'Esmee Fairbairn Foundation',
    funder: 'Esmee Fairbairn Foundation',
    funder_type: 'Trust',
    min_award: 10000,
    max_award: 200000,
    description: 'We fund the work of organisations that aim to improve the quality of life for people and communities in the UK.',
    public_title: 'Core Funding Grant — Major Independent Trust',
    public_description: 'Funding organisations that aim to improve quality of life for people and communities.',
    application_url: 'https://www.esmeefairbairn.org.uk/apply-for-funding',
    sectors: ['arts', 'environment', 'food', 'social change', 'community'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Charities, social enterprises, community interest companies',
    income_requirements: 'any size',
  },
  {
    name: 'The Wellcome Trust Health Grants',
    funder: 'Wellcome Trust',
    funder_type: 'Trust',
    min_award: 5000,
    max_award: 500000,
    description: 'Wellcome supports science to solve the urgent health challenges facing everyone.',
    public_title: 'Health and Science Grant — Major Independent Trust',
    public_description: 'Supporting science to solve urgent health challenges.',
    application_url: 'https://wellcome.org/grant-funding',
    sectors: ['health', 'research', 'mental health', 'science'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Research organisations, universities, charities',
    income_requirements: 'any size',
  },
  {
    name: 'The National Lottery Heritage Fund',
    funder: 'The National Lottery Heritage Fund',
    funder_type: 'Lottery',
    min_award: 3000,
    max_award: 250000,
    description: 'We support projects that connect people and communities to heritage. From museums to historic buildings to natural landscapes.',
    public_title: 'Heritage Grant — Lottery Distributor',
    public_description: 'Supporting projects that connect people to heritage.',
    application_url: 'https://www.heritagefund.org.uk/funding',
    sectors: ['heritage', 'arts', 'environment', 'community', 'museums'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Charities, voluntary organisations, local authorities',
    income_requirements: 'any size',
  },
  {
    name: 'Comic Relief UK Grants',
    funder: 'Comic Relief',
    funder_type: 'Trust',
    min_award: 5000,
    max_award: 100000,
    description: 'Comic Relief funds organisations making real change in the UK. Focus on mental health, gender justice, ending poverty.',
    public_title: 'Social Change Grant — Major Charity Funder',
    public_description: 'Funding organisations making real change across the UK.',
    application_url: 'https://www.comicrelief.com/funding',
    sectors: ['mental health', 'poverty', 'gender', 'children', 'community'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Charities, social enterprises',
    income_requirements: 'any size',
  },
  {
    name: 'The Rank Foundation',
    funder: 'The Rank Foundation',
    funder_type: 'Trust',
    min_award: 1000,
    max_award: 30000,
    description: 'The Rank Foundation supports community-based projects that help people in need across the UK.',
    public_title: 'Community and Faith Grant — Independent Trust',
    public_description: 'Supporting community-based projects that help people in need.',
    application_url: 'https://www.rankfoundation.com',
    sectors: ['community', 'poverty', 'children', 'faith'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Charities, community organisations',
    income_requirements: 'any size',
  },
  {
    name: 'The Big Lottery Fund People and Places',
    funder: 'National Lottery Community Fund',
    funder_type: 'Lottery',
    min_award: 50000,
    max_award: 500000,
    description: 'Supporting projects that help communities thrive. Larger grants for organisations with strong community roots.',
    public_title: 'Community Infrastructure Grant — Lottery Distributor',
    public_description: 'Supporting projects that help communities thrive.',
    application_url: 'https://www.tnlcommunityfund.org.uk/funding/programmes/people-and-places',
    sectors: ['community', 'poverty', 'health', 'education'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Charities, voluntary organisations, social enterprises',
    income_requirements: 'any size',
  },
  {
    name: 'Barchester Healthcare Foundation',
    funder: 'Barchester Healthcare Foundation',
    funder_type: 'Corporate',
    min_award: 100,
    max_award: 2500,
    description: 'Barchester Healthcare Foundation funds activities and resources for people with disabilities, elderly people or others who are in need of care.',
    public_title: 'Care and Elderly Grant — Corporate Foundation',
    public_description: 'Funding activities for people with disabilities, elderly people or others in need of care.',
    application_url: 'https://www.barchesterhealthcarefoundation.org.uk',
    sectors: ['elderly', 'disability', 'care', 'community'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Charities, community organisations, care providers',
    income_requirements: 'any size',
  },
  {
    name: 'The Henry Smith Charity — Core Grants',
    funder: 'The Henry Smith Charity',
    funder_type: 'Trust',
    min_award: 20000,
    max_award: 200000,
    description: 'Core costs funding for registered charities in the UK working to help people in need.',
    public_title: 'Core Costs Grant — Major Independent Trust',
    public_description: 'Core costs funding for charities working to help people in need.',
    application_url: 'https://www.henrysmithcharity.org.uk/apply-for-a-grant/core-grants/',
    sectors: ['poverty', 'elderly', 'disability', 'homelessness', 'community'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Registered charities',
    income_requirements: 'any size',
  },
  {
    name: 'BBC Children in Need Main Grants',
    funder: 'BBC Children in Need',
    funder_type: 'Trust',
    min_award: 10000,
    max_award: 100000,
    description: 'Main grants programme for organisations working to make a positive difference to children and young people\'s lives.',
    public_title: 'Children and Young People Grant — BBC Charity',
    public_description: 'Making a positive difference to children and young people\'s lives.',
    application_url: 'https://www.bbcchildreninneed.co.uk/grants/main-grants/',
    sectors: ['children', 'poverty', 'disability', 'mental health'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Charities, community organisations, statutory bodies',
    income_requirements: 'any size',
  },
  {
    name: 'BBC Children in Need Small Grants',
    funder: 'BBC Children in Need',
    funder_type: 'Trust',
    min_award: 300,
    max_award: 10000,
    description: 'Small grants for local organisations working with children and young people under 18 who are experiencing disadvantage.',
    public_title: 'Small Grants for Children — BBC Charity',
    public_description: 'Grants for local organisations working with disadvantaged children and young people.',
    application_url: 'https://www.bbcchildreninneed.co.uk/grants/small-grants/',
    sectors: ['children', 'poverty', 'community', 'disability'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Local charities, community organisations',
    income_requirements: 'any size',
  },
  {
    name: 'The Numico Trust',
    funder: 'The Nuffield Foundation',
    funder_type: 'Trust',
    min_award: 5000,
    max_award: 50000,
    description: 'The Nuffield Foundation funds research and projects that improve education, family justice and social welfare.',
    public_title: 'Social Welfare Research Grant — Independent Trust',
    public_description: 'Funding research and projects that improve education, family justice and social welfare.',
    application_url: 'https://www.nuffieldfoundation.org/funding',
    sectors: ['education', 'social welfare', 'family', 'justice'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Research organisations, charities, academic institutions',
    income_requirements: 'any size',
  },
  {
    name: 'The Community Foundation Network',
    funder: 'Community Foundations UK',
    funder_type: 'Foundation',
    min_award: 500,
    max_award: 25000,
    description: '46 community foundations across the UK fund local charities and community groups making a difference in their area.',
    public_title: 'Local Community Grant — Community Foundation',
    public_description: 'Funding local charities and community groups making a difference in their area.',
    application_url: 'https://www.ukcommunityfoundations.org/our-foundations',
    sectors: ['community', 'poverty', 'elderly', 'children', 'arts', 'environment'],
    locations: ['United Kingdom'],
    eligibility_criteria: 'Local charities, community groups, voluntary organisations',
    income_requirements: 'any size',
  },
]

async function main() {
  loadEnv()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://qwusrijtsrdhdkhvddei.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3dXNyaWp0c3JkaGRraHZkZGVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcwNTQ2MSwiZXhwIjoyMDkyMjgxNDYxfQ.xwRjhXLwS8OnjCTOkI0jWUCqYcxtjwpQ7rhV8S9WKIM'
  )

  console.log(`Seeding ${GRANTS.length} UK grant opportunities...`)

  const rows = GRANTS.map(g => ({
    name: g.name,
    funder: g.funder,
    funder_type: g.funder_type,
    description: g.description,
    public_title: g.public_title,
    public_description: g.public_description,
    min_award: g.min_award,
    max_award: g.max_award,
    currency: 'GBP',
    country: 'United Kingdom',
    application_url: g.application_url,
    sectors: g.sectors,
    locations: g.locations,
    eligibility_criteria: g.eligibility_criteria,
    income_requirements: g.income_requirements,
    source: 'manual',
    is_active: true,
    grant_type: 'opportunity',
    deadline: null,
  }))

  // Try with grant_type first; fall back without it if column doesn't exist yet
  let { error } = await supabase
    .from('grants')
    .upsert(rows, { onConflict: 'application_url' })

  if (error && error.message?.includes('grant_type')) {
    console.warn('grant_type column not yet created — retrying without it...')
    const rowsWithoutType = rows.map(({ grant_type, ...rest }) => rest)
    const result = await supabase
      .from('grants')
      .upsert(rowsWithoutType, { onConflict: 'application_url' })
    error = result.error
  }

  if (error) {
    console.error('Upsert error:', error.message)
    process.exit(1)
  }

  console.log(`Done! ${GRANTS.length} grants upserted.`)

  // Verify
  const { data: check, count } = await supabase
    .from('grants')
    .select('id, name, funder, deadline, source', { count: 'exact' })
    .eq('source', 'manual')
    .eq('is_active', true)

  console.log(`\nActive manual grants in DB: ${count}`)
  console.log('\nSample of seeded grants:')
  check?.slice(0, 10).forEach(g => {
    console.log(`  ${g.deadline ?? 'Rolling'} | ${g.funder?.slice(0, 30).padEnd(30)} | ${g.name?.slice(0, 50)}`)
  })
}

main().catch(console.error)
