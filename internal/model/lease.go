package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserAssetProgress tracks lease/rental progress for users and devices
type UserAssetProgress struct {
	ID          uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	UserID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	DeviceID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"device_id"`
	PaidMonths  int        `gorm:"default:0;check:paid_months >= 0" json:"paid_months"`
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Associations
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Device Device `gorm:"foreignKey:DeviceID" json:"device,omitempty"`
}

// TableName specifies the table name
func (UserAssetProgress) TableName() string {
	return "user_asset_progress"
}

// BeforeCreate hook to generate UUID
func (u *UserAssetProgress) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now()
	}
	if u.UpdatedAt.IsZero() {
		u.UpdatedAt = time.Now()
	}
	return nil
}

// BeforeUpdate hook to update timestamp
func (u *UserAssetProgress) BeforeUpdate(tx *gorm.DB) error {
	u.UpdatedAt = time.Now()
	return nil
}
