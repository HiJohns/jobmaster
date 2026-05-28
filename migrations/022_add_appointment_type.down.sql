-- Rollback: Remove appointment_type from workorders

ALTER TABLE workorders DROP COLUMN IF EXISTS appointment_type;
