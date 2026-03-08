package api

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/response"
	"jobmaster/pkg/utils"
)

// LoginRequest represents the login request payload
type LoginRequest struct {
	Username string `json:"username" binding:"required,min=3,max=100"`
	Password string `json:"password" binding:"required,min=6,max=128"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token          string    `json:"token"`
	UserID         uuid.UUID `json:"user_id"`
	Username       string    `json:"username"`
	Role           string    `json:"role"`
	OrgID          uuid.UUID `json:"org_id"`
	TenantID       uuid.UUID `json:"tenant_id"`
	DisplayName    string    `json:"display_name"`
	IsImpersonated bool      `json:"is_impersonated"`
}

// Login handles user authentication and returns JWT token
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var user model.User
	if err := db.Where("username = ? AND status = ?", req.Username, model.UserStatusActive).First(&user).Error; err != nil {
		response.Unauthorized(c, "invalid username or password")
		return
	}

	if !user.CheckPassword(req.Password) {
		response.Unauthorized(c, "invalid username or password")
		return
	}

	// Update last login time
	now := time.Now()
	user.LastLoginAt = &now
	if err := db.Save(&user).Error; err != nil {
		// Log error but don't fail login
		c.Error(fmt.Errorf("failed to update last login time for user %s: %w", user.ID, err))
	}

	// Generate JWT token
	token, err := utils.GenerateToken(
		user.ID,
		user.OrganizationID,
		user.TenantID,
		string(user.Role),
		false, // isImpersonated - normal login
		nil,
	)
	if err != nil {
		response.InternalServerError(c, "failed to generate token")
		return
	}

	response.Success(c, LoginResponse{
		Token:          token,
		UserID:         user.ID,
		Username:       user.Username,
		Role:           string(user.Role),
		OrgID:          user.OrganizationID,
		TenantID:       user.TenantID,
		DisplayName:    user.DisplayName,
		IsImpersonated: false,
	})
}

// RefreshToken generates a new token for the authenticated user
func RefreshToken(c *gin.Context) {
	// Get user info from context (set by auth middleware)
	userID, exists := c.Get(utils.ContextKeyUserID)
	if !exists {
		response.Unauthorized(c, "user not authenticated")
		return
	}

	orgID, _ := c.Get(utils.ContextKeyOrgID)
	tenantID, _ := c.Get(utils.ContextKeyTenantID)
	role, _ := c.Get(utils.ContextKeyRole)
	isImpersonated, _ := c.Get(utils.ContextKeyIsImpersonated)

	uid, ok := userID.(uuid.UUID)
	if !ok {
		response.InternalServerError(c, "invalid user id format")
		return
	}

	oid, _ := orgID.(uuid.UUID)
	tid, _ := tenantID.(uuid.UUID)
	r, _ := role.(string)
	imp, _ := isImpersonated.(bool)

	token, err := utils.GenerateToken(uid, oid, tid, r, imp, nil)
	if err != nil {
		response.InternalServerError(c, "failed to generate token")
		return
	}

	response.Success(c, gin.H{
		"token": token,
	})
}
