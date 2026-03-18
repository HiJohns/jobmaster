-- +goose Up
ALTER TABLE users ADD COLUMN iam_sub VARCHAR(100);
CREATE UNIQUE INDEX idx_user_iam_sub ON users(iam_sub) WHERE iam_sub IS NOT NULL;
ALTER TABLE users ADD COLUMN is_shadow BOOLEAN DEFAULT false;

-- +goose Down
DROP INDEX IF EXISTS idx_user_iam_sub;
ALTER TABLE users DROP COLUMN IF EXISTS iam_sub;
ALTER TABLE users DROP COLUMN IF EXISTS is_shadow;
