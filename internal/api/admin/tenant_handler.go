package admin

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobmaster/internal/model"
	"jobmaster/internal/repository"
)

// TenantHandler handles tenant management APIs
type TenantHandler struct {
	repo repository.TenantRepository
}

// NewTenantHandler creates a new tenant handler
func NewTenantHandler(repo repository.TenantRepository) *TenantHandler {
	return &TenantHandler{repo: repo}
}

// CreateTenantRequest represents the request payload for creating a tenant
type CreateTenantRequest struct {
	Name          string                 `json:"name" binding:"required"`
	Code          string                 `json:"code" binding:"required"`
	ContactPerson string                 `json:"contact_person"`
	Status        int8                   `json:"status"`
	Config        map[string]interface{} `json:"config"`
}

// Create handles POST /api/v1/admin/tenants
func (h *TenantHandler) Create(c *gin.Context) {
	// Permission check - only SYSTEM_ADMIN can access
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	currentUser, ok := user.(*model.User)
	if !ok || currentUser.Role != model.UserRoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
		return
	}

	var req CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// Validate code uniqueness
	existing, err := h.repo.GetByCode(req.Code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error occurred"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Tenant code already exists"})
		return
	}

	tenant := &model.Tenant{
		Name:          req.Name,
		Code:          req.Code,
		ContactPerson: req.ContactPerson,
		Status:        req.Status,
		Config:        model.JSONBMap(req.Config),
	}

	if err := h.repo.Create(tenant); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tenant"})
		return
	}

	// Audit log
	logDetails := fmt.Sprintf("Created tenant: %s (code: %s)", tenant.Name, tenant.Code)
	if currentUser.ID != uuid.Nil {
		_ = h.repo.AddAuditLog(currentUser.ID, currentUser.DisplayName, "create_tenant", logDetails, tenant.ID)
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
	// Permission check - only SYSTEM_ADMIN can access
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	currentUser, ok := user.(*model.User)
	if !ok || currentUser.Role != model.UserRoleAdmin {
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

// RegisterRoutes registers tenant admin routes
func RegisterRoutes(router *gin.RouterGroup, repo repository.TenantRepository) {
	handler := NewTenantHandler(repo)
	router.POST("/admin/tenants", handler.Create)
	router.GET("/admin/tenants", handler.List)
}
