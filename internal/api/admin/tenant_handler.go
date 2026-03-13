package admin

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"jobmaster/internal/model"
	"jobmaster/internal/repository"
	"jobmaster/pkg/redis"
	"jobmaster/pkg/utils"
)

// TenantHandler handles tenant management APIs
type TenantHandler struct {
	repo  repository.TenantRepository
	db    *gorm.DB
	redis *redis.Client
}

// NewTenantHandler creates a new tenant handler
func NewTenantHandler(repo repository.TenantRepository, db *gorm.DB, redisClient *redis.Client) *TenantHandler {
	return &TenantHandler{repo: repo, db: db, redis: redisClient}
}

// CreateTenantRequest represents the request payload for creating a tenant
type CreateTenantRequest struct {
	Name          string                 `json:"name" binding:"required"`
	Code          string                 `json:"code"`
	ContactPerson string                 `json:"contact_person"`
	Status        int8                   `json:"status"`
	Config        map[string]interface{} `json:"config"`
}

// UpdateTenantRequest represents the request payload for updating a tenant
// Note: Code and Slug fields are explicitly excluded to prevent modification
type UpdateTenantRequest struct {
	Name          string                 `json:"name"`
	ContactPerson string                 `json:"contact_person"`
	Config        map[string]interface{} `json:"config"`
}

// UpdateTenantStatusRequest represents the request payload for updating tenant status
type UpdateTenantStatusRequest struct {
	Status int8 `json:"status" binding:"required"`
}

// Create handles POST /api/v1/admin/tenants
func (h *TenantHandler) Create(c *gin.Context) {
	// Permission check - only SYSTEM_ADMIN or BRAND_HQ can access
	roleVal, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	role, ok := roleVal.(string)
	if !ok || (role != string(model.UserRoleAdmin) && role != string(model.UserRoleBrandHQ)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	var req CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// 自动生成租户唯一标识码（防腐层）
	code, err := utils.GenerateUniqueTenantCode(req.Name, func(code string) (bool, error) {
		existing, err := h.repo.GetByCode(code)
		if err != nil {
			return false, fmt.Errorf("failed to check code existence: %w", err)
		}
		return existing != nil, nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tenant code: " + err.Error()})
		return
	}

	// 自动生成租户slug（处理冲突）
	slug, err := utils.GenerateUniqueTenantSlug(req.Name, func(slug string) (bool, error) {
		var count int64
		if err := h.db.Model(&model.Tenant{}).Where("slug = ?", slug).Count(&count).Error; err != nil {
			return false, fmt.Errorf("failed to check slug existence: %w", err)
		}
		return count > 0, nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tenant slug: " + err.Error()})
		return
	}

	// 开始事务
	tx := h.db.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction: " + tx.Error.Error()})
		return
	}

	// 创建租户
	tenant := &model.Tenant{
		Name:          req.Name,
		Code:          code,
		Slug:          slug,
		ContactPerson: req.ContactPerson,
		Status:        req.Status,
		Config:        model.JSONBMap(req.Config),
	}

	if err := tx.Create(tenant).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create tenant: %v", err)})
		return
	}

	// 创建默认组织
	org := &model.Organization{
		TenantID: tenant.UUID,
		Name:     req.Name + "总部",
		Type:     model.OrgTypeHQ,
		Code:     slug,
	}

	if err := tx.Create(org).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create organization: %v", err)})
		return
	}

	// 创建管理员用户
	adminUser := &model.User{
		TenantID:           tenant.UUID,
		OrganizationID:     org.ID,
		Username:           "admin",
		Email:              "admin@" + slug + ".com",
		MustChangePassword: true,
		Role:               model.UserRoleAdmin,
		Status:             model.UserStatusActive,
		DisplayName:        "租户管理员",
	}

	// 生成密码哈希
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("ChangeMe123!"), bcrypt.DefaultCost)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to hash password: %v", err)})
		return
	}
	adminUser.PasswordHash = string(hashedPassword)

	if err := tx.Create(adminUser).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create admin user: %v", err)})
		return
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to commit transaction: %v", err)})
		return
	}

	// Audit log
	logDetails := fmt.Sprintf("Created tenant: %s (code: %s, slug: %s)", tenant.Name, tenant.Code, tenant.Slug)
	userIDVal, userIDExists := c.Get("userId")
	if userIDExists {
		userID, userIDOk := userIDVal.(uuid.UUID)
		if userIDOk && userID != uuid.Nil {
			if err := h.repo.AddAuditLog(userID, "", "create_tenant", logDetails, tenant.ID); err != nil {
				fmt.Printf("Warning: failed to create audit log for tenant %d: %v\n", tenant.ID, err)
			}
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"code": 201,
		"data": tenant,
	})
}

// List handles GET /api/v1/admin/tenants
// ListTenantsResponse represents the paginated tenant list response
type ListTenantsResponse struct {
	Code int            `json:"code"`
	Data ListTenantData `json:"data"`
}

type ListTenantData struct {
	Tenants []model.Tenant `json:"tenants"`
	Total   int64          `json:"total"`
	Page    int            `json:"page"`
	Size    int            `json:"size"`
}

func (h *TenantHandler) List(c *gin.Context) {
	// Permission check - only SYSTEM_ADMIN or BRAND_HQ can access
	roleVal, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	role, ok := roleVal.(string)
	if !ok || (role != string(model.UserRoleAdmin) && role != string(model.UserRoleBrandHQ)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	// Parse pagination parameters with error handling
	pageStr := c.DefaultQuery("page", "1")
	sizeStr := c.DefaultQuery("size", "20")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	size, err := strconv.Atoi(sizeStr)
	if err != nil || size < 1 || size > 100 {
		size = 20
	}

	offset := (page - 1) * size

	tenants, total, err := h.repo.List(offset, size)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list tenants"})
		return
	}

	c.JSON(http.StatusOK, ListTenantsResponse{
		Code: 200,
		Data: ListTenantData{
			Tenants: tenants,
			Total:   total,
			Page:    page,
			Size:    size,
		},
	})
}

// Update handles PATCH /api/v1/admin/tenants/:id
func (h *TenantHandler) Update(c *gin.Context) {
	roleVal, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	role, ok := roleVal.(string)
	if !ok || (role != string(model.UserRoleAdmin) && role != string(model.UserRoleBrandHQ)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	tenant, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get tenant"})
		return
	}
	if tenant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	var req UpdateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if req.Name != "" {
		tenant.Name = req.Name
	}
	if req.ContactPerson != "" {
		tenant.ContactPerson = req.ContactPerson
	}
	if req.Config != nil {
		tenant.Config = model.JSONBMap(req.Config)
	}

	if err := h.repo.Update(tenant); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tenant"})
		return
	}

	userIDVal, _ := c.Get("userId")
	if userID, ok := userIDVal.(uuid.UUID); ok && userID != uuid.Nil {
		logDetails := fmt.Sprintf("Updated tenant: %s (id: %d)", tenant.Name, tenant.ID)
		h.repo.AddAuditLog(userID, "", "update_tenant", logDetails, tenant.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": tenant,
	})
}

// UpdateStatus handles PUT /api/v1/admin/tenants/:id/status
func (h *TenantHandler) UpdateStatus(c *gin.Context) {
	roleVal, exists := c.Get("role")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	role, ok := roleVal.(string)
	if !ok || role != string(model.UserRoleAdmin) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied: admin only"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tenant ID"})
		return
	}

	tenant, err := h.repo.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get tenant"})
		return
	}
	if tenant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant not found"})
		return
	}

	var req UpdateTenantStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if req.Status != 0 && req.Status != 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status value"})
		return
	}

	oldStatus := tenant.Status
	tenant.Status = req.Status

	if err := h.repo.Update(tenant); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update tenant status"})
		return
	}

	if oldStatus == 1 && req.Status == 0 && h.redis != nil {
		blacklistDuration := 24 * time.Hour
		if err := h.redis.AddTenantToBlacklist(tenant.UUID, blacklistDuration); err != nil {
			fmt.Printf("Warning: failed to blacklist tenant %s: %v\n", tenant.UUID, err)
		}
		if _, err := h.redis.IncrementTokenVersion(tenant.UUID); err != nil {
			fmt.Printf("Warning: failed to increment token version for tenant %s: %v\n", tenant.UUID, err)
		}
	}

	userIDVal, _ := c.Get("userId")
	if userID, ok := userIDVal.(uuid.UUID); ok && userID != uuid.Nil {
		action := "enable_tenant"
		if req.Status == 0 {
			action = "disable_tenant"
		}
		logDetails := fmt.Sprintf("%s: %s (id: %d)", action, tenant.Name, tenant.ID)
		h.repo.AddAuditLog(userID, "", action, logDetails, tenant.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": tenant,
	})
}

// RegisterRoutes registers tenant admin routes
func RegisterRoutes(router *gin.RouterGroup, repo repository.TenantRepository, db *gorm.DB, redisClient *redis.Client) {
	handler := NewTenantHandler(repo, db, redisClient)
	router.POST("/admin/tenants", handler.Create)
	router.GET("/admin/tenants", handler.List)
	router.PATCH("/admin/tenants/:id", handler.Update)
	router.PUT("/admin/tenants/:id/status", handler.UpdateStatus)
}
