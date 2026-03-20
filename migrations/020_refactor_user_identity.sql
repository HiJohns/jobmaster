-- +goose Up
-- Refactor user identity for "one account, multiple centers" support

-- Step 1: Remove unique constraint on users.email (was tenant-scoped unique)
DROP INDEX IF EXISTS idx_user_email_tenant;

-- Step 2: Add regular index on email for query performance
CREATE INDEX idx_user_email ON users(email);

-- Step 3: Remove global unique index on iam_sub
DROP INDEX IF EXISTS idx_user_iam_sub;

-- Step 4: Create composite unique index (tenant_id, iam_sub)
-- This allows same iam_sub in different tenants, but unique within a tenant
CREATE UNIQUE INDEX idx_user_tenant_iam_sub ON users(tenant_id, iam_sub) WHERE iam_sub IS NOT NULL;

-- Step 5: Create index for membership lookup by iam_sub
CREATE INDEX idx_user_iam_sub ON users(iam_sub);

-- +goose Down
DROP INDEX IF EXISTS idx_user_tenant_iam_sub;
DROP INDEX IF EXISTS idx_user_iam_sub;
DROP INDEX IF EXISTS idx_user_email;
CREATE UNIQUE INDEX idx_user_email_tenant ON users(tenant_id, email);
CREATE UNIQUE INDEX idx_user_iam_sub ON users(iam_sub) WHERE iam_sub IS NOT NULL;
