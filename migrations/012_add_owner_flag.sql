-- +goose Up
ALTER TABLE users ADD COLUMN is_org_owner BOOLEAN DEFAULT FALSE;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS is_org_owner;
