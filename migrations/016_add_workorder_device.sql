-- +goose Up
ALTER TABLE workorders ADD COLUMN device_id UUID REFERENCES devices(id);
CREATE INDEX idx_workorder_device ON workorders(device_id);

-- +goose Down
DROP INDEX IF EXISTS idx_workorder_device;
ALTER TABLE workorders DROP COLUMN IF EXISTS device_id;
