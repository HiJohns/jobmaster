-- +goose Up
ALTER TABLE work_orders ADD COLUMN hop_limit INT DEFAULT 0;
ALTER TABLE work_orders ADD COLUMN current_hop INT DEFAULT 0;

-- +goose Down
ALTER TABLE work_orders DROP COLUMN IF EXISTS current_hop;
ALTER TABLE work_orders DROP COLUMN IF EXISTS hop_limit;
