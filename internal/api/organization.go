package api

import (
	"encoding/json"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobmaster/internal/middleware"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/permissions"
	"jobmaster/pkg/redis"
	"jobmaster/pkg/response"
)

// CreateOrganizationRequest represents the request to create an organization
type CreateOrganizationRequest struct {
	Name         string        `json:"name" binding:"required"`
	Type         model.OrgType `json:"type" binding:"required"`
	Code         string        `json:"code" binding:"required"`
	ParentID     *uuid.UUID    `json:"parent_id,omitempty"`
	Address      string        `json:"address"`
	ContactName  string        `json:"contact_name"`
	ContactPhone string        `json:"contact_phone"`
}

// OrganizationResponse represents the organization response
type OrganizationResponse struct {
	ID           uuid.UUID              `json:"id"`
	Name         string                 `json:"name"`
	Type         model.OrgType          `json:"type"`
	Code         string                 `json:"code"`
	ParentID     *uuid.UUID             `json:"parent_id,omitempty"`
	Level        int                    `json:"level"`
	Address      string                 `json:"address"`
	ContactName  string                 `json:"contact_name"`
	ContactPhone string                 `json:"contact_phone"`
	Children     []OrganizationResponse `json:"children,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

// CreateOrganization creates a new organization (BrandHQ or MainContractor only)
func CreateOrganization(c *gin.Context) {
	// Check permission
	userRole, _ := middleware.GetRole(c)
	if !permissions.HasPermission(&model.User{Role: model.UserRole(userRole), Status: model.UserStatusActive}, permissions.ActionOrgManage) {
		response.Forbidden(c, "insufficient permissions to create organization")
		return
	}

	var req CreateOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	// Validate organization type based on role
	if userRole == string(model.UserRoleBrandHQ) {
		// BrandHQ can create Store, MainContractor
		if req.Type != model.OrgTypeStore && req.Type != model.OrgTypeMainContractor {
			response.BadRequest(c, "brand hq can only create store or main contractor organizations")
			return
		}
	} else if userRole == string(model.UserRoleMainContractor) {
		// MainContractor can create Vendor
		if req.Type != model.OrgTypeVendor {
			response.BadRequest(c, "main contractor can only create vendor organizations")
			return
		}
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	// Get tenant ID from context
	tenantID, _ := middleware.GetTenantID(c)

	// Calculate level based on parent
	level := 0
	if req.ParentID != nil {
		var parent model.Organization
		if err := db.Where("id = ? AND tenant_id = ?", req.ParentID, tenantID).First(&parent).Error; err != nil {
			response.BadRequest(c, "parent organization not found")
			return
		}
		level = parent.Level + 1
	}

	org := model.Organization{
		TenantID:     tenantID,
		Name:         req.Name,
		Type:         req.Type,
		Code:         req.Code,
		ParentID:     req.ParentID,
		Level:        level,
		Address:      req.Address,
		ContactName:  req.ContactName,
		ContactPhone: req.ContactPhone,
	}

	if err := db.Create(&org).Error; err != nil {
		response.InternalServerError(c, "failed to create organization")
		return
	}

	// Invalidate Redis cache after creating organization
	if redisClient := redis.GetDefaultClient(); redisClient != nil {
		redisClient.InvalidateOrgTreeCache(tenantID)
	}

	response.Success(c, OrganizationResponse{
		ID:           org.ID,
		Name:         org.Name,
		Type:         org.Type,
		Code:         org.Code,
		ParentID:     org.ParentID,
		Level:        org.Level,
		Address:      org.Address,
		ContactName:  org.ContactName,
		ContactPhone: org.ContactPhone,
		CreatedAt:    org.CreatedAt,
		UpdatedAt:    org.UpdatedAt,
	})
}

// UpdateOrganizationRequest represents the request to update an organization
type UpdateOrganizationRequest struct {
	Name         string `json:"name"`
	Address      string `json:"address"`
	ContactName  string `json:"contact_name"`
	ContactPhone string `json:"contact_phone"`
}

// UpdateOrganization updates an existing organization
func UpdateOrganization(c *gin.Context) {
	userRole, _ := middleware.GetRole(c)
	if !permissions.HasPermission(&model.User{Role: model.UserRole(userRole), Status: model.UserStatusActive}, permissions.ActionOrgManage) {
		response.Forbidden(c, "insufficient permissions to update organization")
		return
	}

	orgID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid organization id")
		return
	}

	var req UpdateOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	var org model.Organization
	if err := db.Where("id = ? AND tenant_id = ?", orgID, tenantID).First(&org).Error; err != nil {
		response.NotFound(c, "organization not found")
		return
	}

	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Address != "" {
		updates["address"] = req.Address
	}
	if req.ContactName != "" {
		updates["contact_name"] = req.ContactName
	}
	if req.ContactPhone != "" {
		updates["contact_phone"] = req.ContactPhone
	}

	if len(updates) > 0 {
		if err := db.Model(&org).Updates(updates).Error; err != nil {
			response.InternalServerError(c, "failed to update organization")
			return
		}
	}

	if redisClient := redis.GetDefaultClient(); redisClient != nil {
		redisClient.InvalidateOrgTreeCache(tenantID)
	}

	response.Success(c, OrganizationResponse{
		ID:           org.ID,
		Name:         org.Name,
		Type:         org.Type,
		Code:         org.Code,
		ParentID:     org.ParentID,
		Level:        org.Level,
		Address:      org.Address,
		ContactName:  org.ContactName,
		ContactPhone: org.ContactPhone,
		CreatedAt:    org.CreatedAt,
		UpdatedAt:    org.UpdatedAt,
	})
}

// ListOrganizations returns a list of organizations for the current tenant
func ListOrganizations(c *gin.Context) {
	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	var organizations []model.Organization
	if err := db.Where("tenant_id = ?", tenantID).Find(&organizations).Error; err != nil {
		response.InternalServerError(c, "failed to fetch organizations")
		return
	}

	var responseData []OrganizationResponse
	for _, org := range organizations {
		responseData = append(responseData, OrganizationResponse{
			ID:           org.ID,
			Name:         org.Name,
			Type:         org.Type,
			Code:         org.Code,
			ParentID:     org.ParentID,
			Level:        org.Level,
			Address:      org.Address,
			ContactName:  org.ContactName,
			ContactPhone: org.ContactPhone,
			CreatedAt:    org.CreatedAt,
		})
	}

	response.Success(c, responseData)
}

// GetOrganizationTree returns the organization tree structure
func GetOrganizationTree(c *gin.Context) {
	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	// 1. Try to get from Redis cache first
	if redisClient := redis.GetDefaultClient(); redisClient != nil {
		cached, err := redisClient.GetOrgTreeCache(tenantID)
		if err == nil && cached != "" {
			// Hit cache, return cached data
			c.Header("X-Cache", "HIT")
			var cachedData []OrganizationResponse
			if err := json.Unmarshal([]byte(cached), &cachedData); err == nil {
				response.Success(c, cachedData)
				return
			}
		}
		c.Header("X-Cache", "MISS")
	}

	var organizations []model.Organization
	if err := db.Where("tenant_id = ?", tenantID).Find(&organizations).Error; err != nil {
		response.InternalServerError(c, "failed to fetch organizations")
		return
	}

	// Build tree structure
	orgMap := make(map[uuid.UUID]*OrganizationResponse)
	var rootOrgs []OrganizationResponse

	// First pass: create response objects
	for i := range organizations {
		org := &organizations[i]
		orgMap[org.ID] = &OrganizationResponse{
			ID:           org.ID,
			Name:         org.Name,
			Type:         org.Type,
			Code:         org.Code,
			ParentID:     org.ParentID,
			Level:        org.Level,
			Address:      org.Address,
			ContactName:  org.ContactName,
			ContactPhone: org.ContactPhone,
			CreatedAt:    org.CreatedAt,
			Children:     []OrganizationResponse{},
		}
	}

	// Second pass: build tree
	for i := range organizations {
		org := &organizations[i]
		node := orgMap[org.ID]
		if org.ParentID == nil {
			rootOrgs = append(rootOrgs, *node)
		} else {
			if parent, exists := orgMap[*org.ParentID]; exists {
				parent.Children = append(parent.Children, *node)
			}
		}
	}

	// Cache the result
	if redisClient := redis.GetDefaultClient(); redisClient != nil {
		if jsonData, err := json.Marshal(rootOrgs); err == nil {
			redisClient.SetOrgTreeCache(tenantID, string(jsonData), 10*time.Minute)
		}
	}

	response.Success(c, rootOrgs)
}
