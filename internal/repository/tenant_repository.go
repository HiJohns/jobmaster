package repository

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"jobmaster/internal/model"
	"gorm.io/gorm"
)

// TenantRepository defines the interface for tenant data operations
type TenantRepository interface {
	Create(tenant *model.Tenant) error
	GetByCode(code string) (*model.Tenant, error)
	List(offset, limit int) ([]model.Tenant, int64, error)
	AddAuditLog(userID uuid.UUID, userName, action, details string, targetID uint) error
}

type tenantRepository struct {
	db *gorm.DB
}

// NewTenantRepository creates a new tenant repository instance
func NewTenantRepository(db *gorm.DB) TenantRepository {
	return &tenantRepository{db: db}
}

// Create inserts a new tenant record
func (r *tenantRepository) Create(tenant *model.Tenant) error {
	if err := r.db.Create(tenant).Error; err != nil {
		return fmt.Errorf("failed to create tenant: %w", err)
	}
	return nil
}

// GetByCode retrieves a tenant by its unique code
func (r *tenantRepository) GetByCode(code string) (*model.Tenant, error) {
	var tenant model.Tenant
	if err := r.db.Where("code = ?", code).First(&tenant).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get tenant by code %s: %w", code, err)
	}
	return &tenant, nil
}

// List retrieves paginated list of tenants with total count
func (r *tenantRepository) List(offset, limit int) ([]model.Tenant, int64, error) {
	var tenants []model.Tenant
	var total int64

	// Get total count
	if err := r.db.Model(&model.Tenant{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count tenants: %w", err)
	}

	// Get paginated results
	if err := r.db.Order("created_at DESC").Offset(offset).Limit(limit).Find(&tenants).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to list tenants: %w", err)
	}

	return tenants, total, nil
}

// AuditLog represents a tenant operation audit log
type AuditLog struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index"`
	UserName  string    `gorm:"size:100;not null"`
	Action    string    `gorm:"size:50;not null;index"`
	Details   string    `gorm:"type:text"`
	TargetID  uint      `gorm:"not null;index"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

// TableName returns the table name for AuditLog model
func (AuditLog) TableName() string {
	return "tenant_audit_logs"
}

// AddAuditLog creates an audit log entry for tenant operations
func (r *tenantRepository) AddAuditLog(userID uuid.UUID, userName, action, details string, targetID uint) error {
	log := &AuditLog{
		UserID:   userID,
		UserName: userName,
		Action:   action,
		Details:  details,
		TargetID: targetID,
	}
	
	if err := r.db.Create(log).Error; err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}
	return nil
}
