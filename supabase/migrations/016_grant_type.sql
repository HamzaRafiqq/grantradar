-- Add grant_type to distinguish open opportunities from historical awarded grants
ALTER TABLE grants ADD COLUMN IF NOT EXISTS grant_type VARCHAR(20) DEFAULT 'opportunity';

-- All 360Giving data is historical awarded grants, NOT open opportunities
UPDATE grants SET grant_type = 'awarded' WHERE source = '360giving';

-- All existing manual/discovery grants are open opportunities
UPDATE grants SET grant_type = 'opportunity' WHERE source IN ('manual', 'discovery');

-- Performance indexes
CREATE INDEX IF NOT EXISTS grants_grant_type_idx ON grants(grant_type);
CREATE INDEX IF NOT EXISTS grants_opportunity_idx ON grants(grant_type, is_active, deadline) WHERE grant_type = 'opportunity';
