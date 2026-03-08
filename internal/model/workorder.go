package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WorkOrderStatus represents the work order state machine
type WorkOrderStatus int

const (
	WorkOrderStatusPending    WorkOrderStatus = 1 // 报修
	WorkOrderStatusDispatched WorkOrderStatus = 2 // 已指派
	WorkOrderStatusReserved   WorkOrderStatus = 3 // 已预约
	WorkOrderStatusArrived    WorkOrderStatus = 4 // 已到场
	WorkOrderStatusWorking    WorkOrderStatus = 5 // 施工中
	WorkOrderStatusFinished   WorkOrderStatus = 6 // 离场确认
	WorkOrderStatusObserving  WorkOrderStatus = 7 // 观察期
	WorkOrderStatusClosed     WorkOrderStatus = 8 // 已关闭
)

// String returns the string representation of the status
func (s WorkOrderStatus) String() string {
	switch s {
	case WorkOrderStatusPending:
		return "PENDING"
	case WorkOrderStatusDispatched:
		return "DISPATCHED"
	case WorkOrderStatusReserved:
		return "RESERVED"
	case WorkOrderStatusArrived:
		return "ARRIVED"
	case WorkOrderStatusWorking:
		return "WORKING"
	case WorkOrderStatusFinished:
		return "FINISHED"
	case WorkOrderStatusObserving:
		return "OBSERVING"
	case WorkOrderStatusClosed:
		return "CLOSED"
	default:
		return "UNKNOWN"
	}
}

// ErrInvalidStateTransition is returned when an invalid state transition is attempted
var ErrInvalidStateTransition = errors.New("invalid state transition")

// WorkOrderInfo stores flexible JSONB data for work order
type WorkOrderInfo struct {
	Description   string       `json:"description,omitempty"`
	EquipmentInfo string       `json:"equipment_info,omitempty"`
	PhotoURLs     []string     `json:"photo_urls,omitempty"`
	IsUrgent      bool         `json:"is_urgent,omitempty"`
	Location      *GPSLocation `json:"location,omitempty"`
	ContactName   string       `json:"contact_name,omitempty"`
	ContactPhone  string       `json:"contact_phone,omitempty"`
}

// Value implements the driver.Valuer interface
func (i WorkOrderInfo) Value() (driver.Value, error) {
	return json.Marshal(i)
}

// Scan implements the sql.Scanner interface
func (i *WorkOrderInfo) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, i)
}

// WorkOrderLog represents a single log entry
type WorkOrderLog struct {
	Timestamp time.Time       `json:"timestamp"`
	UserID    uuid.UUID       `json:"user_id"`
	UserName  string          `json:"user_name"`
	Action    string          `json:"action"`
	Details   string          `json:"details,omitempty"`
	OldStatus WorkOrderStatus `json:"old_status,omitempty"`
	NewStatus WorkOrderStatus `json:"new_status,omitempty"`
}

// WorkOrderLogs is a slice of log entries
type WorkOrderLogs []WorkOrderLog

// Value implements the driver.Valuer interface
func (l WorkOrderLogs) Value() (driver.Value, error) {
	return json.Marshal(l)
}

// Scan implements the sql.Scanner interface
func (l *WorkOrderLogs) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, l)
}

// AddLog appends a new log entry (append-only for audit trail)
func (l *WorkOrderLogs) AddLog(userID uuid.UUID, userName, action, details string, oldStatus, newStatus WorkOrderStatus) {
	*l = append(*l, WorkOrderLog{
		Timestamp: time.Now(),
		UserID:    userID,
		UserName:  userName,
		Action:    action,
		Details:   details,
		OldStatus: oldStatus,
		NewStatus: newStatus,
	})
}

// WorkOrder represents a maintenance work order
type WorkOrder struct {
	ID        uuid.UUID       `gorm:"type:uuid;primary_key" json:"id"`
	OrderNo   string          `gorm:"uniqueIndex;not null" json:"order_no"`
	TenantID  uuid.UUID       `gorm:"type:uuid;not null;index:idx_workorder_tenant" json:"tenant_id"`
	StoreID   uuid.UUID       `gorm:"type:uuid;not null;index:idx_workorder_store" json:"store_id"`
	CreatedBy uuid.UUID       `gorm:"type:uuid;not null" json:"created_by"`
	Status    WorkOrderStatus `gorm:"index:idx_workorder_status" json:"status"`

	// Assignment fields
	VendorID   *uuid.UUID `gorm:"type:uuid;index" json:"vendor_id,omitempty"`
	EngineerID *uuid.UUID `gorm:"type:uuid;index" json:"engineer_id,omitempty"`

	// Scheduling fields
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	ArrivedAt   *time.Time `json:"arrived_at,omitempty"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	FinishedAt  *time.Time `json:"finished_at,omitempty"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`

	// Observation period
	ObservingDeadline *time.Time `json:"observing_deadline,omitempty"`

	// Settlement (manual entry in v1)
	SettlementAmount *float64 `json:"settlement_amount,omitempty"`
	SettlementNote   string   `json:"settlement_note,omitempty"`

	// Flexible JSONB fields
	Info WorkOrderInfo `gorm:"type:jsonb" json:"info"`
	Logs WorkOrderLogs `gorm:"type:jsonb" json:"logs"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Store    Organization  `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	Vendor   *Organization `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	Engineer *User         `gorm:"foreignKey:EngineerID" json:"engineer,omitempty"`
	Creator  User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

// TableName returns the table name for WorkOrder
func (WorkOrder) TableName() string {
	return "workorders"
}

// BeforeCreate hook to generate UUID
func (w *WorkOrder) BeforeCreate(tx *gorm.DB) error {
	if w.ID == uuid.Nil {
		w.ID = uuid.New()
	}
	return nil
}

// IsUrgent returns true if the work order is marked as urgent
func (w *WorkOrder) IsUrgent() bool {
	return w.Info.IsUrgent
}

// MarkUrgent marks the work order as urgent
func (w *WorkOrder) MarkUrgent() {
	w.Info.IsUrgent = true
}

// IsValidTransition checks if a state transition is valid
func (w *WorkOrder) IsValidTransition(newStatus WorkOrderStatus) bool {
	// State transition whitelist
	validTransitions := map[WorkOrderStatus][]WorkOrderStatus{
		WorkOrderStatusPending:    {WorkOrderStatusDispatched},
		WorkOrderStatusDispatched: {WorkOrderStatusReserved, WorkOrderStatusPending}, // Support rejection flow
		WorkOrderStatusReserved:   {WorkOrderStatusArrived},
		WorkOrderStatusArrived:    {WorkOrderStatusWorking},
		WorkOrderStatusWorking:    {WorkOrderStatusFinished},
		WorkOrderStatusFinished:   {WorkOrderStatusObserving},
		WorkOrderStatusObserving:  {WorkOrderStatusClosed, WorkOrderStatusDispatched}, // Support rejection flow
		WorkOrderStatusClosed:     {},                                                 // Terminal state
	}

	allowed, exists := validTransitions[w.Status]
	if !exists {
		return false
	}

	for _, status := range allowed {
		if status == newStatus {
			return true
		}
	}
	return false
}

// CanTransitionTo checks if the order can transition to the given status
func (w *WorkOrder) CanTransitionTo(status WorkOrderStatus) error {
	if !w.IsValidTransition(status) {
		return fmt.Errorf("cannot transition from %s to %s: %w", w.Status.String(), status.String(), ErrInvalidStateTransition)
	}
	return nil
}

// GORM Scopes

// StoreScope filters work orders by store ID
func StoreScope(storeID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("store_id = ?", storeID)
	}
}

// TenantScope filters work orders by tenant ID
func TenantScope(tenantID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("tenant_id = ?", tenantID)
	}
}

// StatusScope filters work orders by status
func StatusScope(status WorkOrderStatus) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("status = ?", status)
	}
}

// StatusInScope filters work orders by multiple statuses
func StatusInScope(statuses []WorkOrderStatus) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("status IN ?", statuses)
	}
}

// CreatedAtScope filters work orders by creation date range
func CreatedAtScope(start, end time.Time) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("created_at BETWEEN ? AND ?", start, end)
	}
}

// IsUrgentScope filters urgent work orders using JSONB
func IsUrgentScope() func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("info->>'is_urgent' = ?", "true")
	}
}
