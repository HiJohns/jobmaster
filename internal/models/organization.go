package models

import (
	"time"

	"gorm.io/gorm"
)

// BrandHQ represents the brand headquarters (总店)
type BrandHQ struct {
	ID          uint64         `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Description string         `json:"description"`
	Address     string         `json:"address"`
	ContactInfo JSONMap        `gorm:"type:jsonb" json:"contact_info"` // phone, email, etc.
	Settings    JSONMap        `gorm:"type:jsonb" json:"settings"`     // brand-level settings
	Status      EntityStatus   `gorm:"default:active" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Stores []Store `gorm:"foreignKey:BrandHQID" json:"stores,omitempty"`
	Users  []User  `gorm:"foreignKey:BrandHQID" json:"users,omitempty"`
}

// TableName returns the table name for BrandHQ
func (BrandHQ) TableName() string {
	return "brand_hqs"
}

// Store represents a store location (分店)
type Store struct {
	ID          uint64         `gorm:"primaryKey" json:"id"`
	BrandHQID   uint64         `gorm:"index;not null" json:"brand_hq_id"`
	Name        string         `gorm:"not null" json:"name"`
	Code        string         `gorm:"uniqueIndex" json:"code"` // Store code/identifier
	Address     string         `json:"address"`
	GPSLocation *GPSLocation   `gorm:"embedded;embeddedPrefix:gps_" json:"gps_location,omitempty"`
	ContactInfo JSONMap        `gorm:"type:jsonb" json:"contact_info"`
	Status      EntityStatus   `gorm:"default:active" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	BrandHQ BrandHQ `gorm:"foreignKey:BrandHQID" json:"brand_hq,omitempty"`
	Users   []User  `gorm:"foreignKey:StoreID" json:"users,omitempty"`
	Orders  []Order `gorm:"foreignKey:StoreID" json:"orders,omitempty"`
}

// TableName returns the table name for Store
func (Store) TableName() string {
	return "stores"
}

// MainContractor represents a main contractor company (工程公司)
type MainContractor struct {
	ID          uint64         `gorm:"primaryKey" json:"id"`
	Name        string         `gorm:"not null" json:"name"`
	Code        string         `gorm:"uniqueIndex" json:"code"`
	Description string         `json:"description"`
	Address     string         `json:"address"`
	ContactInfo JSONMap        `gorm:"type:jsonb" json:"contact_info"`
	Status      EntityStatus   `gorm:"default:active" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Users   []User   `gorm:"foreignKey:MainContractorID" json:"users,omitempty"`
	Vendors []Vendor `gorm:"foreignKey:MainContractorID" json:"vendors,omitempty"`
	Orders  []Order  `gorm:"foreignKey:MainContractorID" json:"orders,omitempty"`
}

// TableName returns the table name for MainContractor
func (MainContractor) TableName() string {
	return "main_contractors"
}

// Vendor represents a vendor/supplier company (供应商)
type Vendor struct {
	ID               uint64         `gorm:"primaryKey" json:"id"`
	MainContractorID uint64         `gorm:"index;not null" json:"main_contractor_id"`
	Name             string         `gorm:"not null" json:"name"`
	Code             string         `gorm:"uniqueIndex" json:"code"`
	Description      string         `json:"description"`
	Address          string         `json:"address"`
	ContactInfo      JSONMap        `gorm:"type:jsonb" json:"contact_info"`
	Status           EntityStatus   `gorm:"default:active" json:"status"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	MainContractor MainContractor `gorm:"foreignKey:MainContractorID" json:"main_contractor,omitempty"`
	Engineers      []Engineer     `gorm:"foreignKey:VendorID" json:"engineers,omitempty"`
	Users          []User         `gorm:"foreignKey:VendorID" json:"users,omitempty"`
	Orders         []Order        `gorm:"foreignKey:VendorID" json:"orders,omitempty"`
}

// TableName returns the table name for Vendor
func (Vendor) TableName() string {
	return "vendors"
}

// Engineer represents a field engineer (工程师)
type Engineer struct {
	ID         uint64         `gorm:"primaryKey" json:"id"`
	VendorID   uint64         `gorm:"index;not null" json:"vendor_id"`
	Name       string         `gorm:"not null" json:"name"`
	Phone      string         `json:"phone"`
	Email      string         `json:"email"`
	EmployeeID string         `gorm:"uniqueIndex" json:"employee_id"`
	Skills     JSONMap        `gorm:"type:jsonb" json:"skills"` // Skill set
	Status     EntityStatus   `gorm:"default:active" json:"status"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Vendor Vendor  `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	User   *User   `gorm:"foreignKey:EngineerID" json:"user,omitempty"`
	Orders []Order `gorm:"foreignKey:EngineerID" json:"orders,omitempty"`
}

// TableName returns the table name for Engineer
func (Engineer) TableName() string {
	return "engineers"
}

// EntityStatus represents entity status
type EntityStatus string

const (
	EntityStatusActive    EntityStatus = "active"
	EntityStatusInactive  EntityStatus = "inactive"
	EntityStatusSuspended EntityStatus = "suspended"
)

// GPSLocation represents GPS coordinates
type GPSLocation struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// JSONMap is a helper type for JSONB fields
type JSONMap map[string]interface{}
