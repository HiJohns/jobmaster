-- +goose Up
CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '租户全称',
    code VARCHAR(100) UNIQUE NOT NULL COMMENT '唯一标识码，用于子域名或特定逻辑',
    contact_person VARCHAR(255) COMMENT '联系人',
    status SMALLINT DEFAULT 1 NOT NULL COMMENT '租户状态 (0: 禁用, 1: 启用)',
    config JSONB DEFAULT '{}'::jsonb COMMENT '租户专属配置，如自定义 Logo、SLA 阈值',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_code ON tenants(code);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_config_gin ON tenants USING GIN (config);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- +goose Down
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
DROP FUNCTION IF EXISTS update_updated_at_column;
DROP INDEX IF EXISTS idx_tenants_config_gin;
DROP INDEX IF EXISTS idx_tenants_status;
DROP INDEX IF EXISTS idx_tenants_code;
DROP TABLE IF EXISTS tenants;
