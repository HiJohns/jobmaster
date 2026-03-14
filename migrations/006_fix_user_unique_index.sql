-- 修复用户唯一索引：确保用户名在租户范围内唯一
-- Migration 006

-- 删除错误的全局唯一索引（如果存在）
DROP INDEX IF EXISTS idx_user_username_tenant;

-- 创建正确的复合唯一索引（租户范围内唯一）
CREATE UNIQUE INDEX idx_user_username_tenant ON users (tenant_id, username);
