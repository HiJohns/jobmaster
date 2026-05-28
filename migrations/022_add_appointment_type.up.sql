-- Migration: Add appointment_type to workorders
-- appointment_type: 1=指定上门时段（无需预约） 2=要求提前预约

ALTER TABLE workorders ADD COLUMN IF NOT EXISTS appointment_type SMALLINT DEFAULT 1;

COMMENT ON COLUMN workorders.appointment_type IS '上门方式：1-指定时段(无需预约) 2-提前预约';
