package model

import (
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User represents a system user with role-based access
type User struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID           uuid.UUID      `gorm:"type:uuid;not null;index:idx_user_tenant" json:"tenant_id"`
	OrganizationID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"organization_id"`
	Username           string         `gorm:"size:100;not null" json:"username"`
	Email              string         `gorm:"size:255;uniqueIndex:idx_user_email_tenant" json:"email"`
	Phone              string         `gorm:"size:20" json:"phone"`
	PasswordHash       string         `gorm:"size:255;not null" json:"-"`
	MustChangePassword bool           `gorm:"default:false;not null" json:"must_change_password"`
	Role               UserRole       `gorm:"type:varchar(20);not null" json:"role"`
	IsOrgOwner         bool           `gorm:"default:false" json:"is_org_owner"` // 组织所有者标志
	Status             UserStatus     `gorm:"type:varchar(20);default:'active'" json:"status"`
	DisplayName        string         `gorm:"size:100" json:"display_name"`
	AvatarURL          string         `gorm:"size:500" json:"avatar_url"`
	LastLoginAt        *time.Time     `json:"last_login_at,omitempty"`
	Organization       Organization   `gorm:"foreignKey:OrganizationID" json:"organization,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserRole defines user roles in the system
type UserRole string

const (
	// IAM roles (management)
	UserRoleOwner   UserRole = "OWNER"   // 组织所有者
	UserRoleAdmin   UserRole = "ADMIN"   // 管理员
	UserRoleManager UserRole = "MANAGER" // 经理
	UserRoleStaff   UserRole = "STAFF"   // 员工

	// Business roles
	UserRoleBrandHQ        UserRole = "BRAND_HQ"        // 总店
	UserRoleStore          UserRole = "STORE"           // 分店
	UserRoleMainContractor UserRole = "MAIN_CONTRACTOR" // 工程公司
	UserRoleVendor         UserRole = "VENDOR"          // 供应商
	UserRoleEngineer       UserRole = "ENGINEER"        // 工程师
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

// HashPassword hashes the password using bcrypt
func (u *User) HashPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hashedPassword)
	return nil
}

// CheckPassword verifies the password against the stored hash
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

// IsOwner returns true if the user is the organization owner
func (u *User) IsOwner() bool {
	return u.IsOrgOwner || u.Role == UserRoleOwner
}

// IsAdmin returns true if the user has admin privileges
func (u *User) IsAdmin() bool {
	return u.Role == UserRoleOwner || u.Role == UserRoleAdmin
}

// HasPermission checks if the user has the specified permission
func (u *User) HasPermission(action string) bool {
	// Owner has full permissions
	if u.IsOwner() {
		return true
	}

	// Permission map for each role
	permissions := map[UserRole][]string{
		UserRoleAdmin: {
			"user:manage", "user:create", "user:delete", "user:update",
			"org:manage", "order:manage", "order:dispatch", "order:view",
			"tenant:manage",
		},
		UserRoleManager: {
			"user:view", "user:create",
			"org:view", "order:manage", "order:dispatch", "order:view",
		},
		UserRoleStaff: {
			"order:view", "order:create",
		},
		UserRoleBrandHQ: {
			"org:manage", "org:view", "order:manage", "order:view",
		},
		UserRoleStore: {
			"order:create", "order:view",
		},
		UserRoleMainContractor: {
			"org:view", "order:manage", "order:dispatch", "order:view",
		},
		UserRoleVendor: {
			"order:view", "order:accept", "order:complete",
		},
		UserRoleEngineer: {
			"order:view", "order:arrive", "order:work", "order:finish",
		},
	}

	perms, exists := permissions[u.Role]
	if !exists {
		return false
	}

	for _, p := range perms {
		if p == action {
			return true
		}
	}
	return false
}

// CanDeleteUser checks if the user can be deleted (protected: last admin/owner)
func (u *User) CanDeleteUser(db *gorm.DB) (bool, string, error) {
	// Check if this is the last owner/admin in the organization
	var count int64
	err := db.Model(&User{}).
		Where("organization_id = ? AND status = ? AND (role IN (?, ?) OR is_org_owner = ?)",
			u.OrganizationID, UserStatusActive, UserRoleOwner, UserRoleAdmin, true).
		Count(&count).Error

	if err != nil {
		return false, "", err
	}

	if count <= 1 {
		return false, "cannot delete the last owner/admin of this organization", nil
	}

	return true, "", nil
}
