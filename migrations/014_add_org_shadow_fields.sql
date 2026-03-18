-- +goose Up
-- organizations 表影子字段
ALTER TABLE organizations ADD COLUMN iam_org_id VARCHAR(100);
ALTER TABLE organizations ADD COLUMN is_shadow BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN max_dispatch_hops INT DEFAULT 3;
ALTER TABLE organizations ADD COLUMN path VARCHAR(500);  -- 组织路径前缀

-- 创建 path 索引
CREATE INDEX idx_org_path ON organizations(path) WHERE path IS NOT NULL;

-- +goose Down
ALTER TABLE organizations DROP COLUMN IF EXISTS iam_org_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS is_shadow;
ALTER TABLE organizations DROP COLUMN IF EXISTS max_dispatch_hops;
ALTER TABLE organizations DROP COLUMN IF EXISTS path;
