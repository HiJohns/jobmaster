package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// WorkOrderStatus represents the work order state machine
type WorkOrderStatus int

const (
	WorkOrderStatusPending           WorkOrderStatus = 1 // 报修
	WorkOrderStatusDispatched        WorkOrderStatus = 2 // 已指派
	WorkOrderStatusReserved          WorkOrderStatus = 3 // 已预约
	WorkOrderStatusArrived           WorkOrderStatus = 4 // 已到场
	WorkOrderStatusWorking           WorkOrderStatus = 5 // 施工中
	WorkOrderStatusFinished          WorkOrderStatus = 6 // 离场确认
	WorkOrderStatusPendingEvaluation WorkOrderStatus = 9 // 待评估
	WorkOrderStatusObserving         WorkOrderStatus = 7 // 观察期
	WorkOrderStatusClosed            WorkOrderStatus = 8 // 已关闭
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
	case WorkOrderStatusPendingEvaluation:
		return "PENDING_EVALUATION"
	case WorkOrderStatusObserving:
		return "OBSERVING"
	case WorkOrderStatusClosed:
		return "CLOSED"
	default:
		return "UNKNOWN"
	}
}

// MarshalJSON implements json.Marshaler for custom JSON serialization
func (s WorkOrderStatus) MarshalJSON() ([]byte, error) {
	return json.Marshal(s.String())
}

// UnmarshalJSON implements json.Unmarshaler for custom JSON deserialization
func (s *WorkOrderStatus) UnmarshalJSON(data []byte) error {
	var str string
	if err := json.Unmarshal(data, &str); err != nil {
		return err
	}
	switch str {
	case "PENDING":
		*s = WorkOrderStatusPending
	case "DISPATCHED":
		*s = WorkOrderStatusDispatched
	case "RESERVED":
		*s = WorkOrderStatusReserved
	case "ARRIVED":
		*s = WorkOrderStatusArrived
	case "WORKING":
		*s = WorkOrderStatusWorking
	case "FINISHED":
		*s = WorkOrderStatusFinished
	case "PENDING_EVALUATION":
		*s = WorkOrderStatusPendingEvaluation
	case "OBSERVING":
		*s = WorkOrderStatusObserving
	case "CLOSED":
		*s = WorkOrderStatusClosed
	default:
		*s = WorkOrderStatus(0)
	}
	return nil
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
	// Multi-level category support
	CategoryPath []string `json:"category_path,omitempty"`
	BrandName    string   `json:"brand_name,omitempty"`
	// Evaluation fields
	EvaluationScore int       `json:"evaluation_score,omitempty"`
	EvaluationNotes string    `json:"evaluation_notes,omitempty"`
	EstimatedCost   float64   `json:"estimated_cost,omitempty"`
	EvaluatedBy     *string   `json:"evaluated_by,omitempty"` // User ID
	EvaluatedAt     time.Time `json:"evaluated_at,omitempty"`
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

// Log action constants
const (
	LogActionCreate                          = "create"
	LogActionDispatch                        = "dispatch"
	LogActionStatusChangeToPendingEvaluation = "status_changed_FINISHED_to_PENDING_EVALUATION"
	LogActionAccept                          = "accept"
	LogActionReject                          = "reject"
	LogActionReserve                         = "reserve"
	LogActionArrive                          = "arrive"
	LogActionFinish                          = "finish"
	LogActionStatusChangeToWorking           = "status_changed_ARRIVED_to_WORKING"
	LogActionStatusChangeToFinished          = "status_changed_WORKING_to_FINISHED"
	LogActionStatusChangeToClosed            = "status_changed_OBSERVING_to_CLOSED"
	LogActionStatusChangeToDispatched        = "status_changed_OBSERVING_to_DISPATCHED"
)

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
// Priority represents work order priority levels
type Priority int

const (
	PriorityNormal    Priority = iota // 普通
	PriorityUrgent                    // 加急
	PriorityEmergency                 // 紧急
)

func (p Priority) String() string {
	return []string{"普通", "加急", "紧急"}[p]
}

type WorkOrder struct {
	ID        uuid.UUID       `gorm:"type:uuid;primary_key" json:"id"`
	OrderNo   string          `gorm:"uniqueIndex;not null" json:"order_no"`
	TenantID  uuid.UUID       `gorm:"type:uuid;not null;index:idx_workorder_tenant" json:"tenant_id"`
	StoreID   uuid.UUID       `gorm:"type:uuid;not null;index:idx_workorder_store" json:"store_id"`
	CreatedBy uuid.UUID       `gorm:"type:uuid;not null" json:"created_by"`
	Status    WorkOrderStatus `gorm:"index:idx_workorder_status" json:"status"`

	// Administrative division (district/county level)
	DivisionID *uuid.UUID     `gorm:"type:uuid;index" json:"division_id,omitempty"`
	Division   *AdminDivision `gorm:"foreignKey:DivisionID" json:"division,omitempty"`

	// Assignment fields
	VendorID         *uuid.UUID `gorm:"type:uuid;index" json:"vendor_id,omitempty"`
	EngineerID       *uuid.UUID `gorm:"type:uuid;index" json:"engineer_id,omitempty"`
	ParentProviderID *uuid.UUID `gorm:"type:uuid;index" json:"parent_provider_id,omitempty"` // 单据级临时上下级关系

	// Transfer control
	HopLimit     int            `gorm:"default:0" json:"hop_limit"`                   // 最大流转次数限制
	CurrentHop   int            `gorm:"default:0" json:"current_hop"`                 // 当前流转次数
	DispatchPath datatypes.JSON `gorm:"type:jsonb;default:'[]'" json:"dispatch_path"` // 流转路径记录

	// Scheduling fields
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	ArrivedAt   *time.Time `json:"arrived_at,omitempty"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	FinishedAt  *time.Time `json:"finished_at,omitempty"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`

	// Appointment time for calendar view
	AppointedAt *time.Time `json:"appointed_at,omitempty"`

	// Observation period
	ObservingDeadline *time.Time `json:"observing_deadline,omitempty"`

	// Settlement (manual entry in v1)
	SettlementAmount *float64 `json:"settlement_amount,omitempty"`
	SettlementNote   string   `json:"settlement_note,omitempty"`

	// Fee breakdown (decimal for precision)
	LaborFee    float64 `json:"labor_fee" gorm:"default:0"`
	MaterialFee float64 `json:"material_fee" gorm:"default:0"`
	OtherFee    float64 `json:"other_fee" gorm:"default:0"`

	// Priority and SLA
	Priority    Priority   `gorm:"default:0" json:"priority"`
	SLADeadline *time.Time `json:"sla_deadline,omitempty"`
	PriorityFee float64    `json:"priority_fee" gorm:"default:0"`

	// Location details
	AddressDetail string       `json:"address_detail,omitempty"`
	Coordinates   *GPSLocation `json:"coordinates,omitempty"`

	// Flexible JSONB fields
	Info WorkOrderInfo `gorm:"type:jsonb" json:"info"`
	Logs WorkOrderLogs `gorm:"type:jsonb" json:"logs"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Store          Organization  `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	Vendor         *Organization `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	Engineer       *User         `gorm:"foreignKey:EngineerID" json:"engineer,omitempty"`
	Creator        User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	ParentProvider *Organization `gorm:"foreignKey:ParentProviderID" json:"parent_provider,omitempty"` // 临时上级 Provider
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
// MarkUrgent marks the work order as urgent
func (w *WorkOrder) MarkUrgent() {
	// Old implementation preserved for backward compatibility
	// Prefer using SetPriority(PriorityUrgent) instead
	w.Info.IsUrgent = true
}

// SetPriority sets the priority level
func (w *WorkOrder) SetPriority(p Priority) {
	w.Priority = p
	w.CalculateSLA()
}

// IsValidTransition checks if a state transition is valid
func (w *WorkOrder) IsValidTransition(newStatus WorkOrderStatus) bool {
	// State transition whitelist
	validTransitions := map[WorkOrderStatus][]WorkOrderStatus{
		WorkOrderStatusPending:           {WorkOrderStatusDispatched},
		WorkOrderStatusDispatched:        {WorkOrderStatusReserved, WorkOrderStatusPending}, // Support rejection flow
		WorkOrderStatusReserved:          {WorkOrderStatusArrived},
		WorkOrderStatusArrived:           {WorkOrderStatusWorking},
		WorkOrderStatusWorking:           {WorkOrderStatusFinished},
		WorkOrderStatusFinished:          {WorkOrderStatusPendingEvaluation},                 // After work completion, go to evaluation
		WorkOrderStatusPendingEvaluation: {WorkOrderStatusClosed},                            // After evaluation, close
		WorkOrderStatusObserving:         {WorkOrderStatusClosed, WorkOrderStatusDispatched}, // Support rejection flow
		WorkOrderStatusClosed:            {},                                                 // Terminal state
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

// AppointedAtScope filters work orders by appointment date range
func AppointedAtScope(start, end time.Time) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("appointed_at BETWEEN ? AND ?", start, end)
	}
}

// EngineerScope filters work orders by engineer ID
func EngineerScope(engineerID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("engineer_id = ?", engineerID)
	}
}

// VendorScope filters work orders by vendor ID
func VendorScope(vendorID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("vendor_id = ?", vendorID)
	}
}

// VendorPathScope filters work orders where dispatch_path contains the vendor ID
func VendorPathScope(vendorID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		// Use JSONB containment operator to check if dispatch_path array contains vendorID
		return db.Where("dispatch_path @> ?", fmt.Sprintf(`"%s"`, vendorID.String()))
	}
}

// OrderNoLikeScope filters work orders by order number (fuzzy search)
func OrderNoLikeScope(keyword string) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("order_no ILIKE ?", "%"+keyword+"%")
	}
}

// IsUrgent returns true if order has urgent priority or higher
func (w *WorkOrder) IsUrgent() bool {
	return w.Priority >= PriorityUrgent
}

// CalculateSLA sets SLA deadline and fee based on priority
func (w *WorkOrder) CalculateSLA() {
	if w.Priority == PriorityUrgent {
		deadline := w.CreatedAt.Add(4 * time.Hour)
		w.SLADeadline = &deadline
		w.PriorityFee = 50.00
	} else if w.Priority == PriorityEmergency {
		deadline := w.CreatedAt.Add(2 * time.Hour)
		w.SLADeadline = &deadline
		w.PriorityFee = 100.00
	}
}
