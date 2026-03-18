-- +goose Up
-- user_asset_progress 表 - 记录用户设备租赁进度
CREATE TABLE user_asset_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  paid_months INT DEFAULT 0 CHECK (paid_months >= 0),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- 创建索引
CREATE INDEX idx_user_asset_progress_user ON user_asset_progress(user_id);
CREATE INDEX idx_user_asset_progress_device ON user_asset_progress(device_id);
CREATE INDEX idx_user_asset_progress_completed ON user_asset_progress(completed_at) WHERE completed_at IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS user_asset_progress;
