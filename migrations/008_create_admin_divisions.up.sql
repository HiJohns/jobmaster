-- Administrative divisions table (provinces, cities, districts)
CREATE TABLE IF NOT EXISTS admin_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES admin_divisions(id) ON DELETE CASCADE,
    level INT NOT NULL, -- 1: province, 2: city, 3: district
    code VARCHAR(20) NOT NULL UNIQUE, -- Administrative division code
    name VARCHAR(100) NOT NULL, -- Name
    pinyin VARCHAR(100), -- Pinyin (optional)
    latitude DECIMAL(10, 8), -- Latitude
    longitude DECIMAL(11, 8), -- Longitude
    sort_order INT DEFAULT 0, -- Sorting order
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_divisions_parent ON admin_divisions(parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_divisions_level ON admin_divisions(level);
CREATE INDEX IF NOT EXISTS idx_admin_divisions_code ON admin_divisions(code);

-- Add columns to organizations table for administrative division codes
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS province_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS city_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS district_code VARCHAR(20);

-- Update organizations table indexes
CREATE INDEX IF NOT EXISTS idx_org_province_code ON organizations(province_code);
CREATE INDEX IF NOT EXISTS idx_org_city_code ON organizations(city_code);
CREATE INDEX IF NOT EXISTS idx_org_district_code ON organizations(district_code);
