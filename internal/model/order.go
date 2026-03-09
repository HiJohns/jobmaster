package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// GPSLocation represents GPS coordinates
type GPSLocation struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Value implements the driver.Valuer interface
func (g GPSLocation) Value() (driver.Value, error) {
	return json.Marshal(g)
}

// Scan implements the sql.Scanner interface
func (g *GPSLocation) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, g)
}

// OrderStatus represents the work order state machine
type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "pending"    // 报修
	OrderStatusDispatched OrderStatus = "dispatched" // 已指派
	OrderStatusReserved   OrderStatus = "reserved"   // 已预约
	OrderStatusArrived    OrderStatus = "arrived"    // 已到场
	OrderStatusWorking    OrderStatus = "working"    // 施工中
	OrderStatusFinished   OrderStatus = "finished"   // 离场确认
	OrderStatusObserving  OrderStatus = "observing"  // 观察期
	OrderStatusClosed     OrderStatus = "closed"     // 已关闭
)

// Order represents a work order in the system
type Order struct {
	ID          uuid.UUID   `gorm:"type:uuid;primary_key" json:"id"`
	OrderNumber string      `gorm:"uniqueIndex;not null" json:"order_number"`
	Status      OrderStatus `gorm:"index;default:pending" json:"status"`
	TenantID    uuid.UUID   `gorm:"type:uuid;not null;index" json:"tenant_id"`

	// Organization relationships
	StoreID          uuid.UUID  `gorm:"type:uuid;not null;index" json:"store_id"`
	MainContractorID *uuid.UUID `gorm:"type:uuid;index" json:"main_contractor_id,omitempty"`
	VendorID         *uuid.UUID `gorm:"type:uuid;index" json:"vendor_id,omitempty"`
	EngineerID       *uuid.UUID `gorm:"type:uuid;index" json:"engineer_id,omitempty"`

	// Equipment info (stored in JSONB)
	EquipmentInfo datatypes.JSON `gorm:"type:jsonb" json:"equipment_info"`

	// Urgency
	IsUrgent      bool   `gorm:"default:false" json:"is_urgent"`
	UrgencyReason string `json:"urgency_reason,omitempty"`

	// Scheduling
	ScheduledAt *time.Time `json:"scheduled_at,omitempty"`
	ArrivedAt   *time.Time `json:"arrived_at,omitempty"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	FinishedAt  *time.Time `json:"finished_at,omitempty"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`

	// Location verification
	ArrivalLocation *GPSLocation `gorm:"embedded;embeddedPrefix:arrival_" json:"arrival_location,omitempty"`

	// Work summary
	WorkSummary string         `json:"work_summary,omitempty"`
	WorkPhotos  datatypes.JSON `gorm:"type:jsonb" json:"work_photos,omitempty"` // Array of photo URLs

	// Observation period
	ObservingDeadline *time.Time `json:"observing_deadline,omitempty"`

	// Settlement (manual entry in v1)
	SettlementAmount *float64 `json:"settlement_amount,omitempty"`
	SettlementNote   string   `json:"settlement_note,omitempty"`

	// Rejection flow (for return to dispatched)
	RejectionReason string     `json:"rejection_reason,omitempty"`
	RejectedAt      *time.Time `json:"rejected_at,omitempty"`

	// Metadata
	Info      datatypes.JSON `gorm:"type:jsonb" json:"info,omitempty"` // Additional flexible data
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Store          Organization  `gorm:"foreignKey:StoreID" json:"store,omitempty"`
	MainContractor *Organization `gorm:"foreignKey:MainContractorID" json:"main_contractor,omitempty"`
	Vendor         *Organization `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	Engineer       *User         `gorm:"foreignKey:EngineerID" json:"engineer,omitempty"`
}

// TableName returns the table name for Order
func (Order) TableName() string {
	return "orders"
}

// BeforeCreate hook to generate UUID
func (o *Order) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}

// IsValidTransition checks if a status transition is valid
func (o *Order) IsValidTransition(newStatus OrderStatus) bool {
	// Define valid transitions
	validTransitions := map[OrderStatus][]OrderStatus{
		OrderStatusPending:    {OrderStatusDispatched},
		OrderStatusDispatched: {OrderStatusReserved, OrderStatusClosed},
		OrderStatusReserved:   {OrderStatusArrived},
		OrderStatusArrived:    {OrderStatusWorking},
		OrderStatusWorking:    {OrderStatusFinished},
		OrderStatusFinished:   {OrderStatusObserving},
		OrderStatusObserving:  {OrderStatusClosed, OrderStatusDispatched}, // Rejection flow
	}

	allowed, exists := validTransitions[o.Status]
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
func (o *Order) CanTransitionTo(status OrderStatus) bool {
	return o.IsValidTransition(status)
}

// IsRejected returns true if the order was rejected during observation
func (o *Order) IsRejected() bool {
	return o.Status == OrderStatusDispatched && o.RejectedAt != nil && o.RejectionReason != ""
}
