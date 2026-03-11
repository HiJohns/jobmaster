package db

import (
	"fmt"
	"log"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"jobmaster/internal/model"
)

// Seeder handles database seeding operations
type Seeder struct {
	db *gorm.DB
}

// NewSeeder creates a new seeder instance
func NewSeeder(db *gorm.DB) *Seeder {
	return &Seeder{db: db}
}

// SeedAll runs all seed operations
func (s *Seeder) SeedAll() error {
	log.Println("Starting database seeding...")

	// Seed in order: Organization first, then User
	if err := s.seedDefaultOrganization(); err != nil {
		return fmt.Errorf("failed to seed organization: %w", err)
	}

	if err := s.seedSuperAdmin(); err != nil {
		return fmt.Errorf("failed to seed super admin: %w", err)
	}

	log.Println("Database seeding completed successfully")
	return nil
}

// seedDefaultOrganization creates the default headquarters organization if not exists
func (s *Seeder) seedDefaultOrganization() error {
	var count int64
	if err := s.db.Model(&model.Organization{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check organizations count: %w", err)
	}

	if count > 0 {
		log.Println("Organizations already exist, skipping HQ seeding")
		return nil
	}

	log.Println("Creating default headquarters organization...")

	// Use a fixed UUID for the default tenant and organization
	defaultTenantID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	defaultOrgID := uuid.MustParse("00000000-0000-0000-0000-000000000002")

	hq := &model.Organization{
		ID:           defaultOrgID,
		TenantID:     defaultTenantID,
		Name:         "总店",
		Type:         model.OrgTypeHQ,
		Code:         "HQ-001",
		Level:        0,
		Address:      "总部地址",
		ContactName:  "系统管理员",
		ContactPhone: "13800138000",
	}

	if err := s.db.Create(hq).Error; err != nil {
		return fmt.Errorf("failed to create headquarters organization: %w", err)
	}

	log.Printf("Created headquarters organization: %s (ID: %s)", hq.Name, hq.ID)
	return nil
}

// seedSuperAdmin creates the super admin user if no users exist
func (s *Seeder) seedSuperAdmin() error {
	var count int64
	if err := s.db.Model(&model.User{}).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to check users count: %w", err)
	}

	if count > 0 {
		log.Println("Users already exist, skipping super admin seeding")
		return nil
	}

	log.Println("Creating super admin user...")

	// Use fixed UUIDs to match the organization
	defaultTenantID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	defaultOrgID := uuid.MustParse("00000000-0000-0000-0000-000000000002")
	adminID := uuid.MustParse("00000000-0000-0000-0000-000000000003")

	admin := &model.User{
		ID:             adminID,
		TenantID:       defaultTenantID,
		OrganizationID: defaultOrgID,
		Username:       "admin",
		Email:          "admin@jobmaster.local",
		Phone:          "13800138000",
		Role:           model.UserRoleBrandHQ,
		Status:         model.UserStatusActive,
		DisplayName:    "超级管理员",
	}

	// Set default password (should be changed after first login)
	if err := admin.HashPassword("admin123"); err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	if err := s.db.Create(admin).Error; err != nil {
		return fmt.Errorf("failed to create super admin: %w", err)
	}

	log.Printf("Created super admin user: %s (ID: %s)", admin.Username, admin.ID)
	log.Println("Please login with default account and change password immediately")
	return nil
}

// IsSeeded checks if the database has been seeded
func (s *Seeder) IsSeeded() (bool, error) {
	var orgCount, userCount int64

	if err := s.db.Model(&model.Organization{}).Count(&orgCount).Error; err != nil {
		return false, fmt.Errorf("failed to count organizations: %w", err)
	}

	if err := s.db.Model(&model.User{}).Count(&userCount).Error; err != nil {
		return false, fmt.Errorf("failed to count users: %w", err)
	}

	return orgCount > 0 && userCount > 0, nil
}
