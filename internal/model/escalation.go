package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EscalationRecord tracks automatic escalation notifications for overdue urgent work orders
type EscalationRecord struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	OrderID    uuid.UUID `gorm:"type:uuid;not null;index" json:"order_id"`
	Order      WorkOrder `gorm:"foreignKey:OrderID" json:"order"`
	NotifiedAt time.Time `gorm:"not null" json:"notified_at"`
	Recipient  string    `gorm:"size:100;not null" json:"recipient"` // Admin user ID or email
	Message    string    `gorm:"type:text;not null" json:"message"`
	
	CreatedAt time.Time `json:"created_at"`
}

// TableName returns the table name for EscalationRecord
func (e EscalationRecord) TableName() string {
	return "escalation_records"
}

// HasBeenNotified checks if an order has already been escalated
func HasBeenNotified(db *gorm.DB, orderID uuid.UUID) (bool, error) {
	var count int64
	err := db.Model(&EscalationRecord{}).Where("order_id = ?", orderID).Count(&count).Error
	return count > 0, err
}

// RecordEscalation creates an escalation record for an overdue urgent order
func RecordEscalation(db *gorm.DB, orderID uuid.UUID, recipient string, message string) error {
	record := EscalationRecord{
		ID:         uuid.New(),
		OrderID:    orderID,
		NotifiedAt: time.Now(),
		Recipient:  recipient,
		Message:    message,
	}
	return db.Create(&record).Error
}
