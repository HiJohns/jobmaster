-- Add security fields to users table for NIST compliance
-- 新增用户安全字段，满足等保2.0要求

-- password_hash: 使用 bcrypt 存储密码哈希，不再存储明文
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';

-- must_change_password: 标记用户是否需要修改初始密码
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- last_login_at: 记录用户最后登录时间，用于安全审计
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- 如果是新建系统，可以将密码字段迁移到 password_hash
-- 如果是已有系统，需要执行数据迁移脚本

CREATE INDEX idx_users_must_change_password ON users(must_change_password);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);
