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
	WorkOrderStatusPending           WorkOrderStatus = 1  // 报修/等待
	WorkOrderStatusDispatched        WorkOrderStatus = 2  // 流转中
	WorkOrderStatusAccepted          WorkOrderStatus = 10 // 已接单/分配
	WorkOrderStatusReserved          WorkOrderStatus = 3  // 已预约
	WorkOrderStatusArrived           WorkOrderStatus = 4  // 已到场
	WorkOrderStatusWorking           WorkOrderStatus = 5  // 施工中
	WorkOrderStatusFinished          WorkOrderStatus = 6  // 离场确认
	WorkOrderStatusPendingEvaluation WorkOrderStatus = 9  // 待评估
	WorkOrderStatusObserving         WorkOrderStatus = 7  // 观察期
	WorkOrderStatusClosed            WorkOrderStatus = 8  // 已关闭
)

// String returns the string representation of the status
func (s WorkOrderStatus) String() string {
	switch s {
	case WorkOrderStatusPending:
		return "PENDING"
	case WorkOrderStatusDispatched:
		return "DISPATCHED"
	case WorkOrderStatusAccepted:
		return "ACCEPTED"
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
	case "ACCEPTED":
		*s = WorkOrderStatusAccepted
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

// TimeSlot represents an appointment time slot
type TimeSlot struct {
	Days      string `json:"days"`       // "weekday" | "weekend" | "everyday"
	StartTime string `json:"start_time"` // "09:00"
	EndTime   string `json:"end_time"`   // "17:00"
}

// WorkOrderInfo stores flexible JSONB data for work order
type WorkOrderInfo struct {
	Title         string       `json:"title,omitempty"`
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
	EvaluatedBy     *string   `json:"evaluated_by,omitempty"`
	EvaluatedAt     time.Time `json:"evaluated_at,omitempty"`
	// Appointment time slots
	TimeSlots []TimeSlot `json:"time_slots,omitempty"`
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
// WorkOrderLog represents a single audit log entry
// Stored as JSONB, append-only for immutable audit trail
type WorkOrderLog struct {
	Timestamp time.Time       `json:"timestamp"`
	UserID    uuid.UUID       `json:"user_id"`
	UserName  string          `json:"user_name"`
	Action    string          `json:"action"`
	Details   string          `json:"details,omitempty"`
	OldStatus WorkOrderStatus `json:"old_status,omitempty"`
	NewStatus WorkOrderStatus `json:"new_status,omitempty"`
	PhotoURLs []string        `json:"photo_urls,omitempty"`
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
	LogActionWorkRecord                      = "work_record"
)

// LogImage stores image file metadata for work order logs
type LogImage struct {
	ID           uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	LogEntryID   uuid.UUID  `gorm:"type:uuid;index" json:"log_entry_id"`
	FileKey      string     `gorm:"size:500" json:"file_key"`
	ThumbnailKey string     `gorm:"size:500" json:"thumbnail_key"`
	FileSize     int64      `json:"file_size"`
	Width        int        `json:"width"`
	Height       int        `json:"height"`
	UploadedAt   time.Time  `json:"uploaded_at"`
	UploadedBy   uuid.UUID  `gorm:"type:uuid" json:"uploaded_by"`
	WorkOrderID  uuid.UUID  `gorm:"type:uuid;index" json:"work_order_id"`
}

// TableName specifies the table name for LogImage
func (LogImage) TableName() string {
	return "log_images"
}

// BeforeCreate hook to generate UUID
func (l *LogImage) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
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

// AddWorkLog appends a new work record with photos (施工中临时记录，不改变状态)
func (l *WorkOrderLogs) AddWorkLog(userID uuid.UUID, userName, details string, photoURLs []string) {
	*l = append(*l, WorkOrderLog{
		Timestamp: time.Now(),
		UserID:    userID,
		UserName:  userName,
		Action:    LogActionWorkRecord,
		Details:   details,
		PhotoURLs: photoURLs,
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
	OwnerOrgID       *uuid.UUID `gorm:"type:uuid;index" json:"owner_org_id,omitempty"`
	EngineerID       *uuid.UUID `gorm:"type:uuid;index" json:"engineer_id,omitempty"`
	HandlerID        *uuid.UUID `gorm:"type:uuid;index" json:"handler_id,omitempty"`
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

	// Service mode: 1=指定上门时段（无需预约） 2=要求提前预约
	AppointmentType int `gorm:"default:1" json:"appointment_type"`

	// Timestamps
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Store          Organization  `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	OwnerOrg       *Organization `gorm:"foreignKey:OwnerOrgID" json:"owner_org,omitempty"`
	Engineer       *User         `gorm:"foreignKey:EngineerID" json:"engineer,omitempty"`
	Handler        *User         `gorm:"foreignKey:HandlerID" json:"handler,omitempty"`
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
		WorkOrderStatusDispatched:        {WorkOrderStatusDispatched, WorkOrderStatusAccepted, WorkOrderStatusPending, WorkOrderStatusArrived},
		WorkOrderStatusAccepted:          {WorkOrderStatusReserved, WorkOrderStatusArrived, WorkOrderStatusPending},
		WorkOrderStatusReserved:          {WorkOrderStatusArrived},
		WorkOrderStatusArrived:           {WorkOrderStatusWorking},
		WorkOrderStatusWorking:           {WorkOrderStatusPendingEvaluation},                   // Engineer finishes → pending evaluation
		WorkOrderStatusFinished:          {WorkOrderStatusClosed},                               // After evaluation, close
		WorkOrderStatusPendingEvaluation: {WorkOrderStatusFinished, WorkOrderStatusDispatched},  // Approve → finished, reject → dispatched
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

// OwnerOrgScope filters work orders by owner organization ID
func OwnerOrgScope(orgID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("owner_org_id = ?", orgID)
	}
}

// HandlerScope filters work orders by handler user ID
func HandlerScope(handlerID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("handler_id = ?", handlerID)
	}
}

// VendorPathScope filters work orders where dispatch_path contains the vendor ID
func VendorPathScope(vendorID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("dispatch_path @> ?", fmt.Sprintf(`"%s"`, vendorID.String()))
	}
}

// DispatchChainScope filters work orders where the org is the current owner OR appears in the dispatch chain
func DispatchChainScope(orgID uuid.UUID) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("owner_org_id = ? OR dispatch_path @> ?", orgID, fmt.Sprintf(`"%s"`, orgID.String()))
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
