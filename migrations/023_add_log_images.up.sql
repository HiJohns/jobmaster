CREATE TABLE IF NOT EXISTS log_images (
  id UUID PRIMARY KEY,
  log_entry_id UUID,
  file_key VARCHAR(500),
  thumbnail_key VARCHAR(500),
  file_size BIGINT,
  width INT,
  height INT,
  uploaded_at TIMESTAMP,
  uploaded_by UUID,
  work_order_id UUID
);
CREATE INDEX IF NOT EXISTS idx_log_images_work_order ON log_images(work_order_id);
CREATE INDEX IF NOT EXISTS idx_log_images_log_entry ON log_images(log_entry_id);
