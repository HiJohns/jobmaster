package api

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/middleware"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/permissions"
	"jobmaster/pkg/response"
)

// CreateUserRequest represents the request to create a user
type CreateUserRequest struct {
	Username       string         `json:"username" binding:"required"`
	Email          string         `json:"email"`
	Phone          string         `json:"phone"`
	Password       string         `json:"password" binding:"required,min=6"`
	Role           model.UserRole `json:"role" binding:"required"`
	OrganizationID uuid.UUID      `json:"organization_id" binding:"required"`
	DisplayName    string         `json:"display_name"`
}

// UpdateUserRequest represents the request to update a user
type UpdateUserRequest struct {
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	DisplayName string `json:"display_name"`
	Status      string `json:"status"`
}

// UserResponse represents the user response
type UserResponse struct {
	ID             uuid.UUID      `json:"id"`
	Username       string         `json:"username"`
	Email          string         `json:"email"`
	Phone          string         `json:"phone"`
	Role           model.UserRole `json:"role"`
	Status         string         `json:"status"`
	OrganizationID uuid.UUID      `json:"organization_id"`
	DisplayName    string         `json:"display_name"`
	AvatarURL      string         `json:"avatar_url"`
	LastLoginAt    *time.Time     `json:"last_login_at,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
}

// ListUsersRequest represents the request to list users
type ListUsersRequest struct {
	OrganizationID *uuid.UUID     `form:"organization_id"`
	Role           model.UserRole `form:"role"`
	Page           int            `form:"page,default=1"`
	PageSize       int            `form:"page_size,default=20"`
}

// CreateUser creates a new user (BrandHQ or MainContractor only)
func CreateUser(c *gin.Context) {
	// Check permission
	userRole, _ := middleware.GetRole(c)
	if !permissions.HasPermission(&model.User{Role: model.UserRole(userRole)}, permissions.ActionUserCreate) {
		response.Forbidden(c, "insufficient permissions to create user")
		return
	}

	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	// Verify organization exists and belongs to tenant
	tenantID, _ := middleware.GetTenantID(c)
	var org model.Organization
	if err := db.Where("id = ? AND tenant_id = ?", req.OrganizationID, tenantID).First(&org).Error; err != nil {
		response.BadRequest(c, "organization not found")
		return
	}

	// Validate role based on creator's role
	if userRole == string(model.UserRoleMainContractor) {
		// MainContractor can only create Vendor or Engineer users
		if req.Role != model.UserRoleVendor && req.Role != model.UserRoleEngineer {
			response.BadRequest(c, "main contractor can only create vendor or engineer users")
			return
		}
		// MainContractor can only create users under Vendor organizations
		if org.Type != model.OrgTypeVendor {
			response.BadRequest(c, "main contractor can only create users for vendor organizations")
			return
		}
	}

	// Check if username already exists in tenant
	var existingUser model.User
	err = db.Where("username = ? AND tenant_id = ?", req.Username, tenantID).First(&existingUser).Error
	if err == nil {
		response.BadRequest(c, "username already exists")
		return
	}
	if err != gorm.ErrRecordNotFound {
		response.InternalServerError(c, fmt.Errorf("failed to check username existence: %w", err).Error())
		return
	}

	user := model.User{
		TenantID:       tenantID,
		OrganizationID: req.OrganizationID,
		Username:       req.Username,
		Email:          req.Email,
		Phone:          req.Phone,
		Role:           req.Role,
		Status:         model.UserStatusActive,
		DisplayName:    req.DisplayName,
	}

	// Hash password
	if err := user.HashPassword(req.Password); err != nil {
		response.InternalServerError(c, "failed to hash password")
		return
	}

	if err := db.Create(&user).Error; err != nil {
		response.InternalServerError(c, "failed to create user")
		return
	}

	response.Success(c, UserResponse{
		ID:             user.ID,
		Username:       user.Username,
		Email:          user.Email,
		Phone:          user.Phone,
		Role:           user.Role,
		Status:         string(user.Status),
		OrganizationID: user.OrganizationID,
		DisplayName:    user.DisplayName,
		AvatarURL:      user.AvatarURL,
		LastLoginAt:    user.LastLoginAt,
		CreatedAt:      user.CreatedAt,
	})
}

// GetUser retrieves a user by ID
func GetUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid user id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	var user model.User
	if err := db.Where("id = ? AND tenant_id = ?", userID, tenantID).First(&user).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	response.Success(c, UserResponse{
		ID:             user.ID,
		Username:       user.Username,
		Email:          user.Email,
		Phone:          user.Phone,
		Role:           user.Role,
		Status:         string(user.Status),
		OrganizationID: user.OrganizationID,
		DisplayName:    user.DisplayName,
		AvatarURL:      user.AvatarURL,
		LastLoginAt:    user.LastLoginAt,
		CreatedAt:      user.CreatedAt,
	})
}

// ListUsers returns a paginated list of users
func ListUsers(c *gin.Context) {
	var req ListUsersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "invalid query parameters: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	query := db.Where("tenant_id = ?", tenantID)

	// Filter by organization if provided
	if req.OrganizationID != nil {
		query = query.Where("organization_id = ?", *req.OrganizationID)
	}

	// Filter by role if provided
	if req.Role != "" {
		query = query.Where("role = ?", req.Role)
	}

	var total int64
	if err := query.Model(&model.User{}).Count(&total).Error; err != nil {
		response.InternalServerError(c, "failed to count users")
		return
	}

	var users []model.User
	offset := (req.Page - 1) * req.PageSize
	if err := query.Offset(offset).Limit(req.PageSize).Find(&users).Error; err != nil {
		response.InternalServerError(c, "failed to fetch users")
		return
	}

	var responseData []UserResponse
	for _, user := range users {
		responseData = append(responseData, UserResponse{
			ID:             user.ID,
			Username:       user.Username,
			Email:          user.Email,
			Phone:          user.Phone,
			Role:           user.Role,
			Status:         string(user.Status),
			OrganizationID: user.OrganizationID,
			DisplayName:    user.DisplayName,
			AvatarURL:      user.AvatarURL,
			LastLoginAt:    user.LastLoginAt,
			CreatedAt:      user.CreatedAt,
		})
	}

	response.Success(c, gin.H{
		"total": total,
		"page":  req.Page,
		"data":  responseData,
	})
}

// UpdateUser updates a user's information
func UpdateUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid user id")
		return
	}

	var req UpdateUserRequest
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

	var user model.User
	if err := db.Where("id = ? AND tenant_id = ?", userID, tenantID).First(&user).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.DisplayName != "" {
		updates["display_name"] = req.DisplayName
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	if len(updates) > 0 {
		if err := db.Model(&user).Updates(updates).Error; err != nil {
			response.InternalServerError(c, "failed to update user")
			return
		}
	}

	response.Success(c, UserResponse{
		ID:             user.ID,
		Username:       user.Username,
		Email:          req.Email,
		Phone:          req.Phone,
		Role:           user.Role,
		Status:         req.Status,
		OrganizationID: user.OrganizationID,
		DisplayName:    req.DisplayName,
		AvatarURL:      user.AvatarURL,
		LastLoginAt:    user.LastLoginAt,
		CreatedAt:      user.CreatedAt,
	})
}

// DeleteUser soft deletes a user
func DeleteUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid user id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	var user model.User
	if err := db.Where("id = ? AND tenant_id = ?", userID, tenantID).First(&user).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	// Check if this is the last owner/admin in the organization
	canDelete, reason, err := user.CanDeleteUser(db)
	if err != nil {
		response.InternalServerError(c, "failed to check user deletion permission")
		return
	}
	if !canDelete {
		response.Forbidden(c, reason)
		return
	}

	// Soft delete
	if err := db.Delete(&user).Error; err != nil {
		response.InternalServerError(c, "failed to delete user")
		return
	}

	response.Success(c, gin.H{
		"message": "user deleted successfully",
	})
}
