-- Categories table for work order category management
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    level INT NOT NULL DEFAULT 1,
    path VARCHAR(500), -- e.g., "水暖/空调/维修"
    sort_order INT DEFAULT 0,
    status INT DEFAULT 1, -- 1: active, 0: inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT uq_category_code_tenant UNIQUE (tenant_id, code),
    CONSTRAINT uq_category_name_tenant UNIQUE (tenant_id, name, deleted_at)
);

CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);

-- Add category_id column to workorders table
ALTER TABLE workorders 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workorders_category ON workorders(category_id);
