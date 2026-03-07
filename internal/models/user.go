package models

import (
	"time"

	"gorm.io/gorm"
)

// Role represents the five-party collaboration roles
type Role string

const (
	RoleBrandHQ        Role = "brand_hq"        // 总店
	RoleStore          Role = "store"           // 分店
	RoleMainContractor Role = "main_contractor" // 工程公司
	RoleVendor         Role = "vendor"          // 供应商
	RoleEngineer       Role = "engineer"        // 工程师
)

// User represents a user in the system
type User struct {
	ID       uint64     `gorm:"primaryKey" json:"id"`
	Email    string     `gorm:"uniqueIndex;not null" json:"email"`
	Password string     `gorm:"not null" json:"-"` // Never expose password
	Name     string     `gorm:"not null" json:"name"`
	Phone    string     `json:"phone"`
	Role     Role       `gorm:"index;not null" json:"role"`
	Status   UserStatus `gorm:"default:active" json:"status"`

	// Foreign keys based on role
	BrandHQID        *uint64 `gorm:"index" json:"brand_hq_id,omitempty"`
	StoreID          *uint64 `gorm:"index" json:"store_id,omitempty"`
	MainContractorID *uint64 `gorm:"index" json:"main_contractor_id,omitempty"`
	VendorID         *uint64 `gorm:"index" json:"vendor_id,omitempty"`
	EngineerID       *uint64 `gorm:"index" json:"engineer_id,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserStatus represents user account status
type UserStatus string

const (
	UserStatusActive   UserStatus = "active"
	UserStatusInactive UserStatus = "inactive"
	UserStatusLocked   UserStatus = "locked"
)

// TableName returns the table name for User
func (User) TableName() string {
	return "users"
}

// IsValidRole checks if the role is valid
func IsValidRole(role Role) bool {
	switch role {
	case RoleBrandHQ, RoleStore, RoleMainContractor, RoleVendor, RoleEngineer:
		return true
	}
	return false
}

// CanCreateOrder checks if the user can create work orders
func (u *User) CanCreateOrder() bool {
	return u.Role == RoleStore && u.Status == UserStatusActive
}

// CanDispatchOrder checks if the user can dispatch work orders
func (u *User) CanDispatchOrder() bool {
	return u.Role == RoleMainContractor && u.Status == UserStatusActive
}

// CanExecuteOrder checks if the user can execute work orders
func (u *User) CanExecuteOrder() bool {
	return (u.Role == RoleVendor || u.Role == RoleEngineer) && u.Status == UserStatusActive
}

// CanApproveOrder checks if the user can approve/close work orders
func (u *User) CanApproveOrder() bool {
	return u.Role == RoleStore && u.Status == UserStatusActive
}
