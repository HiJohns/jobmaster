-- +goose Up
-- Add QR code fields to devices table

ALTER TABLE devices ADD COLUMN IF NOT EXISTS qr_token VARCHAR(128);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS qr_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_devices_qr_token ON devices(qr_token);
CREATE INDEX IF NOT EXISTS idx_devices_qr_expires ON devices(qr_expires_at) WHERE qr_expires_at IS NOT NULL;

-- +goose Down
ALTER TABLE devices DROP COLUMN IF EXISTS qr_token;
ALTER TABLE devices DROP COLUMN IF EXISTS qr_expires_at;

DROP INDEX IF EXISTS idx_devices_qr_token;
DROP INDEX IF EXISTS idx_devices_qr_expires;
