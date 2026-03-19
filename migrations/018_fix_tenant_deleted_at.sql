-- +goose Up
-- Add deleted_at column to tenants table if it doesn't exist (for GORM soft delete)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE tenants ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at);
    END IF;
END
$$;

-- Clean up any invalid records with empty name or code
DELETE FROM tenants WHERE name IS NULL OR name = '' OR code IS NULL OR code = '';

-- +goose Down
ALTER TABLE tenants DROP COLUMN IF EXISTS deleted_at;
