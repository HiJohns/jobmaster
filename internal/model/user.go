package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User represents a system user with role-based access
type User struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID       uuid.UUID      `gorm:"type:uuid;not null;index:idx_user_tenant" json:"tenant_id"`
	OrganizationID uuid.UUID      `gorm:"type:uuid;not null;index" json:"organization_id"`
	Username       string         `gorm:"size:100;uniqueIndex:idx_user_username_tenant;not null" json:"username"`
	Email          string         `gorm:"size:255;uniqueIndex:idx_user_email_tenant" json:"email"`
	Phone          string         `gorm:"size:20" json:"phone"`
	PasswordHash   string         `gorm:"size:255;not null" json:"-"`
	Role           UserRole       `gorm:"type:varchar(20);not null" json:"role"`
	Status         UserStatus     `gorm:"type:varchar(20);default:'active'" json:"status"`
	DisplayName    string         `gorm:"size:100" json:"display_name"`
	AvatarURL      string         `gorm:"size:500" json:"avatar_url"`
	LastLoginAt    *time.Time     `json:"last_login_at,omitempty"`
	Organization   Organization   `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserRole defines user roles in the system
type UserRole string

const (
	UserRoleBrandHQ        UserRole = "BRAND_HQ"        // 总店
	UserRoleStore          UserRole = "STORE"           // 分店
	UserRoleMainContractor UserRole = "MAIN_CONTRACTOR" // 工程公司
	UserRoleVendor         UserRole = "VENDOR"          // 供应商
	UserRoleEngineer       UserRole = "ENGINEER"        // 工程师
	UserRoleAdmin          UserRole = "ADMIN"           // 系统管理员
)

// UserStatus defines user account status
type UserStatus string

const (
	UserStatusActive   UserStatus = "ACTIVE"
	UserStatusInactive UserStatus = "INACTIVE"
	UserStatusBanned   UserStatus = "BANNED"
)

// TableName specifies the table name for User
func (User) TableName() string {
	return "users"
}

// BeforeCreate hook to generate UUID
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

// IsActive returns true if the user account is active
func (u *User) IsActive() bool {
	return u.Status == UserStatusActive
}

// CanManageOrders checks if the user has permission to manage orders
func (u *User) CanManageOrders() bool {
	switch u.Role {
	case UserRoleBrandHQ, UserRoleMainContractor, UserRoleStore:
		return true
	default:
		return false
	}
}

// CanExecuteWork checks if the user can execute maintenance work
func (u *User) CanExecuteWork() bool {
	return u.Role == UserRoleEngineer || u.Role == UserRoleVendor
}
