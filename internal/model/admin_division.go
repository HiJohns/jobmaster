package model

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

// AdminDivision represents an administrative division (province/city/district)
type AdminDivision struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	ParentID  *uuid.UUID     `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Level     int            `gorm:"not null;index" json:"level"` // 1: province, 2: city, 3: district
	Code      string         `gorm:"size:20;not null;uniqueIndex" json:"code"` // Administrative code
	Name      string         `gorm:"size:100;not null" json:"name"`
	Pinyin    string         `gorm:"size:100" json:"pinyin,omitempty"`
	Latitude  float64        `gorm:"type:decimal(10,8)" json:"latitude,omitempty"`
	Longitude float64        `gorm:"type:decimal(11,8)" json:"longitude,omitempty"`
	SortOrder int            `gorm:"default:0" json:"sort_order"`
	Children  []AdminDivision `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for AdminDivision
func (AdminDivision) TableName() string {
	return "admin_divisions"
}

// BeforeCreate hook to generate UUID
func (a *AdminDivision) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// IsProvince returns true if the division is a province
func (a *AdminDivision) IsProvince() bool {
	return a.Level == 1
}

// IsCity returns true if the division is a city
func (a *AdminDivision) IsCity() bool {
	return a.Level == 2
}

// IsDistrict returns true if the division is a district
func (a *AdminDivision) IsDistrict() bool {
	return a.Level == 3
}
