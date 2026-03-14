-- +goose Up
ALTER TABLE work_orders ADD COLUMN parent_provider_id UUID; 
CREATE INDEX idx_work_orders_parent_provider ON work_orders(parent_provider_id);

-- +goose Down
DROP INDEX IF EXISTS idx_work_orders_parent_provider;
ALTER TABLE work_orders DROP COLUMN IF EXISTS parent_provider_id;
