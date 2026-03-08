-- Migration: Create workorders table with JSONB support
-- Created: 2026-03-08

-- Create workorders table
CREATE TABLE IF NOT EXISTS workorders (
    id UUID PRIMARY KEY,
    order_no VARCHAR(255) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    store_id UUID NOT NULL,
    created_by UUID NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    
    -- Assignment fields
    vendor_id UUID,
    engineer_id UUID,
    
    -- Scheduling fields
    scheduled_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Observation period
    observing_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Settlement
    settlement_amount DECIMAL(10, 2),
    settlement_note TEXT,
    
    -- Flexible JSONB fields
    info JSONB DEFAULT '{}',
    logs JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key constraints
    CONSTRAINT fk_workorder_store FOREIGN KEY (store_id) REFERENCES organizations(id),
    CONSTRAINT fk_workorder_vendor FOREIGN KEY (vendor_id) REFERENCES organizations(id),
    CONSTRAINT fk_workorder_engineer FOREIGN KEY (engineer_id) REFERENCES users(id),
    CONSTRAINT fk_workorder_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workorder_tenant ON workorders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workorder_store ON workorders(store_id);
CREATE INDEX IF NOT EXISTS idx_workorder_status ON workorders(status);
CREATE INDEX IF NOT EXISTS idx_workorder_order_no ON workorders(order_no);
CREATE INDEX IF NOT EXISTS idx_workorder_vendor ON workorders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_workorder_engineer ON workorders(engineer_id);
CREATE INDEX IF NOT EXISTS idx_workorder_deleted_at ON workorders(deleted_at) WHERE deleted_at IS NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workorder_tenant_status ON workorders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_workorder_store_status ON workorders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_workorder_created_at ON workorders(created_at);

-- GIN index for JSONB flexible search
-- This supports complex queries on info field (is_urgent, location, equipment_info, etc.)
CREATE INDEX IF NOT EXISTS idx_workorder_info_jsonb ON workorders USING GIN (info jsonb_path_ops);

-- Comments for documentation
COMMENT ON TABLE workorders IS '工单主表，存储维保工单的核心信息';
COMMENT ON COLUMN workorders.status IS '工单状态: 1-PENDING, 2-DISPATCHED, 3-RESERVED, 4-ARRIVED, 5-WORKING, 6-FINISHED, 7-OBSERVING, 8-CLOSED';
COMMENT ON COLUMN workorders.info IS 'JSONB扩展字段，存储报修描述、设备详情、照片URL、加急标记、地理位置等';
COMMENT ON COLUMN workorders.logs IS 'JSONB数组，记录工单操作日志（只增不减，作为证据链）';

-- Down migration
-- DROP TABLE IF EXISTS workorders;
