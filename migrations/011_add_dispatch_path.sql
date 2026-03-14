-- +goose Up
ALTER TABLE work_orders ADD COLUMN dispatch_path JSONB DEFAULT '[]'::jsonb;
CREATE INDEX idx_work_orders_dispatch_path ON work_orders USING GIN (dispatch_path);

-- +goose Down
DROP INDEX IF EXISTS idx_work_orders_dispatch_path;
ALTER TABLE work_orders DROP COLUMN IF EXISTS dispatch_path;
