-- +goose Up
-- 添加 uuid 字段
ALTER TABLE tenants ADD COLUMN uuid UUID UNIQUE;

-- 添加 slug 字段
ALTER TABLE tenants ADD COLUMN slug VARCHAR(100) UNIQUE;

-- 为现有记录生成 UUID
UPDATE tenants SET uuid = gen_random_uuid() WHERE uuid IS NULL;

-- 为现有记录生成默认 slug（基于 code）
UPDATE tenants SET slug = code WHERE slug IS NULL OR slug = '';

-- 添加非空约束
ALTER TABLE tenants ALTER COLUMN uuid SET NOT NULL;
ALTER TABLE tenants ALTER COLUMN slug SET NOT NULL;

-- +goose Down
ALTER TABLE tenants DROP COLUMN IF EXISTS uuid;
ALTER TABLE tenants DROP COLUMN IF EXISTS slug;
