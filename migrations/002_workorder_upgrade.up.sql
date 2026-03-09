-- Migration: Upgrade workorders table with new fields
-- Created: 2026-03-09

-- Add new columns for fees
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS labor_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS material_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS other_fee DECIMAL(10, 2) DEFAULT 0;

-- Add appointment time for calendar view
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS appointed_at TIMESTAMP WITH TIME ZONE;

-- Add location details
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS address_detail TEXT;
ALTER TABLE workorders ADD COLUMN IF NOT EXISTS coordinates JSONB;

-- Create index for appointed_at (used in calendar filtering)
CREATE INDEX IF NOT EXISTS idx_workorder_appointed_at ON workorders(appointed_at);

-- Create composite index for engineer/vendor task list queries
CREATE INDEX IF NOT EXISTS idx_workorder_engineer_appointed ON workorders(engineer_id, appointed_at) WHERE engineer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workorder_vendor_appointed ON workorders(vendor_id, appointed_at) WHERE vendor_id IS NOT NULL;

-- Create index for status statistics queries
CREATE INDEX IF NOT EXISTS idx_workorder_engineer_status ON workorders(engineer_id, status) WHERE engineer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workorder_vendor_status ON workorders(vendor_id, status) WHERE vendor_id IS NOT NULL;

-- Create GIN index for coordinates JSONB
CREATE INDEX IF NOT EXISTS idx_workorder_coordinates ON workorders USING GIN (coordinates jsonb_path_ops);

-- Update comments
COMMENT ON COLUMN workorders.labor_fee IS '人工费，默认0';
COMMENT ON COLUMN workorders.material_fee IS '材料费，默认0';
COMMENT ON COLUMN workorders.other_fee IS '其他费用，默认0';
COMMENT ON COLUMN workorders.appointed_at IS '预约进场时间，用于日历视图';
COMMENT ON COLUMN workorders.address_detail IS '报修详细地址';
COMMENT ON COLUMN workorders.coordinates IS 'GPS坐标 {latitude, longitude}';

-- Down migration
-- ALTER TABLE workorders DROP COLUMN IF EXISTS labor_fee;
-- ALTER TABLE workorders DROP COLUMN IF EXISTS material_fee;
-- ALTER TABLE workorders DROP COLUMN IF EXISTS other_fee;
-- ALTER TABLE workorders DROP COLUMN IF EXISTS appointed_at;
-- ALTER TABLE workorders DROP COLUMN IF EXISTS address_detail;
-- ALTER TABLE workorders DROP COLUMN IF EXISTS coordinates;
-- DROP INDEX IF EXISTS idx_workorder_appointed_at;
-- DROP INDEX IF EXISTS idx_workorder_engineer_appointed;
-- DROP INDEX IF EXISTS idx_workorder_vendor_appointed;
-- DROP INDEX IF EXISTS idx_workorder_engineer_status;
-- DROP INDEX IF EXISTS idx_workorder_vendor_status;
-- DROP INDEX IF EXISTS idx_workorder_coordinates;
