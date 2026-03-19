-- Add admin fields and max_hops to tenants table
-- Issue: #60

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_phone VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_hops INTEGER DEFAULT 3 CHECK (max_hops >= 1 AND max_hops <= 10);

-- Add index for admin_email lookup
CREATE INDEX IF NOT EXISTS idx_tenants_admin_email ON tenants(admin_email);
