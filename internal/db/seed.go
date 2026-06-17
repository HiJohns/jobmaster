package db

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"jobmaster/internal/model"
)

// demo seed UUIDs
var (
	demoTenantUUID   = uuid.MustParse("d0000000-0000-0000-0000-000000000001")
	demoBranch1UUID  = uuid.MustParse("d0000000-0000-0000-0000-000000000010")
	demoContractor1  = uuid.MustParse("d0000000-0000-0000-0000-000000000020")
	demoContractor2  = uuid.MustParse("d0000000-0000-0000-0000-000000000021")
	demoVendor1      = uuid.MustParse("d0000000-0000-0000-0000-000000000030")
	demoEmpBranch1   = uuid.MustParse("d0000000-0000-0000-0000-000000000101")
	demoAdminCon1    = uuid.MustParse("d0000000-0000-0000-0000-000000000201")
	demoEmpCon1      = uuid.MustParse("d0000000-0000-0000-0000-000000000203")
	demoEngCon1      = uuid.MustParse("d0000000-0000-0000-0000-000000000202")
	demoEngCon2      = uuid.MustParse("d0000000-0000-0000-0000-000000000204")
	demoAdminCon2    = uuid.MustParse("d0000000-0000-0000-0000-000000000205")
	demoEmpCon2      = uuid.MustParse("d0000000-0000-0000-0000-000000000206")
	demoEngCon2Usr   = uuid.MustParse("d0000000-0000-0000-0000-000000000207")
	demoEngCon2Usr2  = uuid.MustParse("d0000000-0000-0000-0000-000000000208")
	demoEmpVendor1   = uuid.MustParse("d0000000-0000-0000-0000-000000000301")
	demoEngVendor1   = uuid.MustParse("d0000000-0000-0000-0000-000000000302")
	demoVendor2      = uuid.MustParse("d0000000-0000-0000-0000-000000000040")
	demoAdminVendor2 = uuid.MustParse("d0000000-0000-0000-0000-000000000401")
	demoEmpVendor2   = uuid.MustParse("d0000000-0000-0000-0000-000000000402")
	demoEngVendor21  = uuid.MustParse("d0000000-0000-0000-0000-000000000403")
	demoEngVendor22  = uuid.MustParse("d0000000-0000-0000-0000-000000000404")
	demoWorkOrderIDs = []uuid.UUID{
		uuid.MustParse("d0000000-0000-0000-0000-000000000001"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000002"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000003"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000004"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000005"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000006"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000007"),
		uuid.MustParse("d0000000-0000-0000-0000-000000000008"),
	}
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

	// Seed demo data if in demo mode
	if os.Getenv("DEMO_MODE") == "true" {
		if err := s.SeedDemoData(); err != nil {
			return fmt.Errorf("failed to seed demo data: %w", err)
		}
	}

	log.Println("Database seeding completed successfully")
	return nil
}

// SeedDemoData seeds demo organizations, users, and work orders for demo mode.
// All entities use fixed UUIDs for idempotency (safe to call multiple times).
func (s *Seeder) SeedDemoData() error {
	log.Println("Seeding demo data...")

	if err := s.seedDemoTenant(); err != nil {
		return fmt.Errorf("failed to seed demo tenant: %w", err)
	}
	if err := s.seedDemoOrganizations(); err != nil {
		return fmt.Errorf("failed to seed demo organizations: %w", err)
	}
	if err := s.seedDemoUsers(); err != nil {
		return fmt.Errorf("failed to seed demo users: %w", err)
	}
	if err := s.seedDemoWorkOrders(); err != nil {
		return fmt.Errorf("failed to seed demo work orders: %w", err)
	}

	log.Println("Demo data seeding completed")
	return nil
}

func (s *Seeder) seedDemoTenant() error {
	var existing model.Tenant
	err := s.db.Where("uuid = ?", demoTenantUUID).First(&existing).Error
	if err == nil {
		log.Println("Demo tenant already exists, skipping")
		return nil
	}
	if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check demo tenant: %w", err)
	}

	tenant := &model.Tenant{
		UUID:          demoTenantUUID,
		Name:          "Demo Tenant",
		Code:          "demo",
		Slug:          "demo",
		ContactPerson: "Demo Admin",
		Status:        1,
	}
	if err := s.db.Create(tenant).Error; err != nil {
		return fmt.Errorf("failed to create demo tenant: %w", err)
	}
	log.Printf("Created demo tenant (UUID: %s)", demoTenantUUID)
	return nil
}

func (s *Seeder) seedDemoOrganizations() error {
	orgs := []model.Organization{
		{
			ID:           demoBranch1UUID,
			TenantID:     demoTenantUUID,
			Name:         "寿司郎太阳宫店",
			Type:         model.OrgTypeStore,
			Code:         "DEMO-BRANCH1",
			Level:        1,
			Address:      "北京市朝阳区太阳宫中路凯德MALL",
			ContactName:  "店长",
			ContactPhone: "13800000001",
		},
		{
			ID:           demoContractor1,
			TenantID:     demoTenantUUID,
			Name:         "建王",
			Type:         model.OrgTypeMainContractor,
			Code:         "DEMO-CONTRACTOR1",
			Level:        1,
			Address:      "上海市浦东新区",
			ContactName:  "建王管理员",
			ContactPhone: "13800000002",
		},
		{
			ID:           demoVendor1,
			TenantID:     demoTenantUUID,
			Name:         "森泉",
			Type:         model.OrgTypeVendor,
			Code:         "DEMO-VENDOR1",
			Level:        2,
			ParentID:     &demoContractor1,
			Address:      "上海市闵行区",
			ContactName:  "森泉管理员",
			ContactPhone: "13800000003",
		},
		{
			ID:           demoContractor2,
			TenantID:     demoTenantUUID,
			Name:         "希望",
			Type:         model.OrgTypeMainContractor,
			Code:         "DEMO-CONTRACTOR2",
			Level:        2,
			ParentID:     &demoContractor1,
			Address:      "上海市徐汇区",
			ContactName:  "希望管理员",
			ContactPhone: "13800000004",
		},
		{
			ID:           demoVendor2,
			TenantID:     demoTenantUUID,
			Name:         "相川",
			Type:         model.OrgTypeVendor,
			Code:         "DEMO-VENDOR2",
			Level:        3,
			ParentID:     &demoContractor2,
			Address:      "上海市普陀区",
			ContactName:  "相川管理员",
			ContactPhone: "13800000005",
		},
	}

	for _, org := range orgs {
		var existing model.Organization
		err := s.db.Where("id = ?", org.ID).First(&existing).Error
		if err == nil {
			log.Printf("Demo org %s already exists, skipping", org.Name)
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return fmt.Errorf("failed to check org %s: %w", org.Name, err)
		}
		if err := s.db.Create(&org).Error; err != nil {
			return fmt.Errorf("failed to create org %s: %w", org.Name, err)
		}
		log.Printf("Created demo org: %s (ID: %s)", org.Name, org.ID)
	}
	return nil
}

func (s *Seeder) seedDemoUsers() error {
	now := time.Now()
	users := []struct {
		ID             uuid.UUID
		OrgID          uuid.UUID
		Username       string
		DisplayName    string
		Role           model.UserRole
		IsOrgOwner     bool
		Password       string
	}{
		{demoEmpBranch1, demoBranch1UUID, "employee1@branch1", "分公司员工", model.UserRoleStaff, false, "demo123"},
		{demoAdminCon1, demoContractor1, "admin@contractor1", "工程公司管理员", model.UserRoleMainContractor, true, "demo123"},
		{demoEmpCon1, demoContractor1, "employee1@contractor1", "建王职员", model.UserRoleMainContractor, false, "demo123"},
		{demoEngCon1, demoContractor1, "engineer1@contractor1", "工程公司工程师", model.UserRoleEngineer, false, "demo123"},
		{demoEngCon2, demoContractor1, "engineer2@contractor1", "工程公司工程师2", model.UserRoleEngineer, false, "demo123"},
		{demoAdminCon2, demoContractor2, "admin@contractor2", "工程公司管理员", model.UserRoleMainContractor, true, "demo123"},
		{demoEmpCon2, demoContractor2, "employee1@contractor2", "工程公司员工", model.UserRoleMainContractor, false, "demo123"},
		{demoEngCon2Usr, demoContractor2, "engineer1@contractor2", "工程公司工程师", model.UserRoleEngineer, false, "demo123"},
		{demoEngCon2Usr2, demoContractor2, "engineer2@contractor2", "工程公司工程师2", model.UserRoleEngineer, false, "demo123"},
		{demoEmpVendor1, demoVendor1, "employee1@vendor1", "供应商员工", model.UserRoleVendor, false, "demo123"},
		{demoEngVendor1, demoVendor1, "engineer1@vendor1", "供应商工程师", model.UserRoleEngineer, false, "demo123"},
		{demoAdminVendor2, demoVendor2, "admin@相川", "相川管理员", model.UserRoleVendor, true, "demo123"},
		{demoEmpVendor2, demoVendor2, "employee1@相川", "相川员工", model.UserRoleVendor, false, "demo123"},
		{demoEngVendor21, demoVendor2, "engineer1@相川", "相川工程师", model.UserRoleEngineer, false, "demo123"},
		{demoEngVendor22, demoVendor2, "engineer2@相川", "相川工程师2", model.UserRoleEngineer, false, "demo123"},
	}

	for _, u := range users {
		var existing model.User
		err := s.db.Where("id = ?", u.ID).First(&existing).Error
		if err == nil {
			log.Printf("Demo user %s already exists, skipping", u.Username)
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return fmt.Errorf("failed to check user %s: %w", u.Username, err)
		}

		user := &model.User{
			ID:             u.ID,
			TenantID:       demoTenantUUID,
			OrganizationID: u.OrgID,
			Username:       u.Username,
			Email:          u.Username + "@demo.local",
			Phone:          "13800000000",
			Role:           u.Role,
			IsOrgOwner:     u.IsOrgOwner,
			Status:         model.UserStatusActive,
			DisplayName:    u.DisplayName,
			IAMSub:         "demo_" + u.ID.String(),
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if err := user.HashPassword(u.Password); err != nil {
			return fmt.Errorf("failed to hash password for %s: %w", u.Username, err)
		}
		if err := s.db.Create(user).Error; err != nil {
			return fmt.Errorf("failed to create user %s: %w", u.Username, err)
		}
		log.Printf("Created demo user: %s (%s)", u.Username, u.DisplayName)
	}
	return nil
}

func (s *Seeder) seedDemoWorkOrders() error {
	storeID := demoBranch1UUID
	creatorID := demoEmpBranch1
	now := time.Now()

	type seedWO struct {
		id        uuid.UUID
		orderNo   string
		title     string
		status    model.WorkOrderStatus
		ownerOrg  *uuid.UUID
		engineer  *uuid.UUID
		path      []uuid.UUID
	}

	seeds := []seedWO{
		{demoWorkOrderIDs[0], "DEMO-00001", "消防门维修", model.WorkOrderStatusPending, nil, nil, nil},
		{demoWorkOrderIDs[1], "DEMO-00002", "空调不制冷", model.WorkOrderStatusDispatched, &demoContractor1, &demoEngCon1, []uuid.UUID{demoContractor1}},
		{demoWorkOrderIDs[2], "DEMO-00003", "墙面脱落", model.WorkOrderStatusDispatched, &demoContractor2, nil, []uuid.UUID{demoContractor1, demoContractor2}},
		{demoWorkOrderIDs[3], "DEMO-00004", "灯具更换", model.WorkOrderStatusDispatched, &demoContractor2, &demoEngCon2Usr, []uuid.UUID{demoContractor1, demoContractor2}},
		{demoWorkOrderIDs[4], "DEMO-00005", "POS机故障", model.WorkOrderStatusFinished, &demoContractor2, &demoEngCon2Usr, []uuid.UUID{demoContractor1, demoContractor2}},
		{demoWorkOrderIDs[5], "DEMO-00006", "排烟系统异常", model.WorkOrderStatusDispatched, &demoContractor1, &demoEngCon2, []uuid.UUID{demoContractor1}},
		{demoWorkOrderIDs[6], "DEMO-00007", "验收退回", model.WorkOrderStatusDispatched, &demoContractor2, &demoEngCon2Usr, []uuid.UUID{demoContractor1, demoContractor2}},
		{demoWorkOrderIDs[7], "DEMO-00008", "地板损坏", model.WorkOrderStatusDispatched, &demoContractor1, nil, []uuid.UUID{demoContractor1}},
	}

	for _, seed := range seeds {
		var existing model.WorkOrder
		err := s.db.Where("id = ?", seed.id).First(&existing).Error
		if err == nil {
			log.Printf("Demo work order %s already exists, skipping", seed.orderNo)
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return fmt.Errorf("failed to check work order %s: %w", seed.orderNo, err)
		}

		var pathJSON []byte
		if seed.path != nil {
			pathJSON, _ = json.Marshal(seed.path)
		} else {
			pathJSON = []byte("[]")
		}

		info := model.WorkOrderInfo{
			Description: seed.title,
			ContactName: "联系人",
			ContactPhone: "13800000000",
		}

		wo := &model.WorkOrder{
			ID:             seed.id,
			OrderNo:        seed.orderNo,
			TenantID:       demoTenantUUID,
			StoreID:        storeID,
			CreatedBy:      creatorID,
			Status:         seed.status,
			OwnerOrgID:     seed.ownerOrg,
			EngineerID:     seed.engineer,
			DispatchPath:   pathJSON,
			AppointmentType: 1,
			Info:           info,
			Logs:           make(model.WorkOrderLogs, 0),
			CreatedAt:      now,
			UpdatedAt:      now,
		}

		// Set scheduling timestamps for certain statuses
		switch seed.status {
		case model.WorkOrderStatusWorking:
			wo.ArrivedAt = &now
			wo.StartedAt = &now
		case model.WorkOrderStatusFinished:
			arrived := now.Add(-2 * time.Hour)
			started := now.Add(-90 * time.Minute)
			finished := now.Add(-30 * time.Minute)
			wo.ArrivedAt = &arrived
			wo.StartedAt = &started
			wo.FinishedAt = &finished
		}

		if err := s.db.Create(wo).Error; err != nil {
			return fmt.Errorf("failed to create work order %s: %w", seed.orderNo, err)
		}
		log.Printf("Created demo work order: %s - %s", seed.orderNo, seed.title)
	}
	return nil
}

// seedDefaultOrganization creates the default headquarters organization if not exists
func (s *Seeder) seedDefaultOrganization() error {
	// Use fixed UUIDs for the default tenant and organization
	defaultTenantID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	defaultOrgID := uuid.MustParse("00000000-0000-0000-0000-000000000002")

	// Check if default org already exists by ID
	var existing model.Organization
	err := s.db.Where("id = ?", defaultOrgID).First(&existing).Error
	if err == nil {
		log.Println("Default HQ organization already exists, skipping HQ seeding")
		return nil
	}
	if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check default organization: %w", err)
	}

	log.Println("Creating default headquarters organization...")

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
	// Check if owner user already exists by specific ID
	ownerID := uuid.MustParse("00000000-0000-0000-0000-000000000003")
	var existing model.User
	if err := s.db.Where("id = ?", ownerID).First(&existing).Error; err == nil {
		log.Println("System owner already exists, skipping super admin seeding")
		return nil
	} else if err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to check system owner: %w", err)
	}

	log.Println("Creating system admin users...")

	// Use fixed UUIDs to match the organization
	defaultTenantID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	defaultOrgID := uuid.MustParse("00000000-0000-0000-0000-000000000002")

	// Create OWNER user
	owner := &model.User{
		ID:             ownerID,
		TenantID:       defaultTenantID,
		OrganizationID: defaultOrgID,
		Username:       "owner",
		Email:          "owner@jobmaster.local",
		Phone:          "13800138000",
		Role:           model.UserRoleOwner,
		IsOrgOwner:     true,
		Status:         model.UserStatusActive,
		DisplayName:    "系统所有者",
		IAMSub:         "owner_" + ownerID.String(), // Unique IAMSub
	}

	if err := owner.HashPassword("admin123"); err != nil {
		return fmt.Errorf("failed to hash owner password: %w", err)
	}

	if err := s.db.Create(owner).Error; err != nil {
		return fmt.Errorf("failed to create system owner: %w", err)
	}

	log.Printf("Created system owner user: %s (ID: %s)", owner.Username, owner.ID)

	// Create ADMIN user (for backward compatibility with tests)
	adminID := uuid.MustParse("00000000-0000-0000-0000-000000000004")
	admin := &model.User{
		ID:             adminID,
		TenantID:       defaultTenantID,
		OrganizationID: defaultOrgID,
		Username:       "admin",
		Email:          "admin@jobmaster.local",
		Phone:          "13800138001",
		Role:           model.UserRoleAdmin,
		IsOrgOwner:     false,
		Status:         model.UserStatusActive,
		DisplayName:    "系统管理员",
		IAMSub:         "admin_" + adminID.String(), // Unique IAMSub
	}

	if err := admin.HashPassword("admin123"); err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	if err := s.db.Create(admin).Error; err != nil {
		return fmt.Errorf("failed to create system admin: %w", err)
	}

	log.Printf("Created system admin user: %s (ID: %s)", admin.Username, admin.ID)
	log.Println("Please login with default accounts and change passwords immediately")
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
