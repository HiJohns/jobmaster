-- Add division_id column to workorders table
ALTER TABLE workorders 
ADD COLUMN IF NOT EXISTS division_id UUID,
ADD CONSTRAINT fk_workorders_division 
    FOREIGN KEY (division_id) REFERENCES admin_divisions(id) 
    ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_workorders_division_id ON workorders(division_id);
