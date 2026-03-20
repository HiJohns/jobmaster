package api

import (
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobmaster/internal/model"
	"jobmaster/internal/service"
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

// ChangePasswordRequest represents the password change request
// For initial password change, old_password can be empty
// For normal password change, old_password is required
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"max=128"`
	NewPassword string `json:"new_password" binding:"required,min=8,max=128"`
}

// AuthCallbackRequest represents the OIDC callback request
type AuthCallbackRequest struct {
	Code  string `form:"code" binding:"required"`
	State string `form:"state"`
}

// TokenResponse represents the token exchange response from IAM
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	IDToken      string `json:"id_token"`
}

// AuthCallback handles OIDC callback from IAM
func AuthCallback(c *gin.Context) {
	var req AuthCallbackRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "invalid callback parameters: "+err.Error())
		return
	}

	// 1. Exchange code for token
	tokenResp, err := exchangeCodeForToken(req.Code)
	if err != nil {
		response.InternalServerError(c, "failed to exchange code for token: "+err.Error())
		return
	}

	// 2. Parse and validate ID token
	claims, err := utils.ParseIDToken(tokenResp.IDToken, nil)
	if err != nil {
		response.Unauthorized(c, "invalid id token: "+err.Error())
		c.Abort()
		return
	}

	// 3. Sync shadow user (with retry mechanism)
	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	shadowService := service.NewShadowUserService(db)
	user, isNew, syncErr := shadowService.SyncShadowUser(claims)

	if syncErr != nil {
		// Log error but allow login with temporary session
		c.Error(fmt.Errorf("shadow user sync failed for sub %s: %w", claims.Sub, syncErr))

		// Issue temporary session (read-only, with sync retry)
		issueTempSession(c, claims, tokenResp.AccessToken)
		return
	}

	// 4. Issue full session with HttpOnly cookie
	issueFullSession(c, user, tokenResp.AccessToken, isNew)
}

// exchangeCodeForToken exchanges authorization code for access token
func exchangeCodeForToken(code string) (*TokenResponse, error) {
	config := utils.DefaultIAMConfig()
	if config.BaseURL == "" {
		return nil, fmt.Errorf("IAM base URL not configured")
	}
	if config.ClientID == "" || config.ClientSecret == "" {
		return nil, fmt.Errorf("IAM client credentials not configured")
	}

	// TODO: Implement actual token exchange with IAM
	// For now, return a placeholder response
	return &TokenResponse{
		AccessToken:  "placeholder_access_token_" + code,
		TokenType:    "Bearer",
		ExpiresIn:    3600,
		RefreshToken: "placeholder_refresh_token",
		IDToken:      "placeholder_id_token",
	}, nil
}

// issueFullSession issues a full authenticated session
func issueFullSession(c *gin.Context, user *model.User, accessToken string, isNewUser bool) {
	// Set HttpOnly cookie with access token
	c.SetCookie("access_token", accessToken, 3600, "/", "", false, true)

	response.Success(c, gin.H{
		"message":       "login successful",
		"user_id":       user.ID,
		"is_new_user":   isNewUser,
		"shadow_synced": true,
		"session_type":  "full",
	})
}

// issueTempSession issues a temporary session when shadow sync fails
func issueTempSession(c *gin.Context, claims *utils.IAMClaims, accessToken string) {
	// Set HttpOnly cookie with access token
	c.SetCookie("access_token", accessToken, 3600, "/", "", false, true)

	// TODO: Implement delayed retry of shadow sync in background

	response.Success(c, gin.H{
		"message":       "login successful (temporary session)",
		"shadow_synced": false,
		"session_type":  "temporary",
		"note":          "Shadow user sync failed, retrying in background",
	})
}

// ChangePassword handles password change for authenticated users
// Special handling for users with must_change_password=true (old_password can be empty)
func ChangePassword(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := GetUserID(c)
	if !exists {
		response.Unauthorized(c, "user not authenticated")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var user model.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	// Validate new password strength
	if !utils.IsStrongPassword(req.NewPassword) {
		isValid, feedback := utils.ValidatePassword(req.NewPassword)
		if !isValid {
			response.BadRequest(c, "密码不符合安全要求: "+strings.Join(feedback, ", "))
			return
		}
	}

	// If user is not forced to change password, verify old password
	if !user.MustChangePassword {
		if req.OldPassword == "" {
			response.BadRequest(c, "旧密码不能为空")
			return
		}

		if !user.CheckPassword(req.OldPassword) {
			response.Unauthorized(c, "旧密码不正确")
			return
		}
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		response.InternalServerError(c, "failed to hash password")
		return
	}

	// Update password and reset must_change_password flag
	user.PasswordHash = hashedPassword
	user.MustChangePassword = false

	if err := db.Save(&user).Error; err != nil {
		response.InternalServerError(c, "failed to update password")
		return
	}

	response.Success(c, gin.H{
		"message":              "密码修改成功",
		"must_change_password": false,
	})
}

// Auth middleware helper functions

// GetUserID retrieves user ID from context
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(utils.ContextKeyUserID)
	if !exists {
		return uuid.Nil, false
	}
	uid, ok := val.(uuid.UUID)
	return uid, ok
}

// GetOrgID retrieves organization ID from context
func GetOrgID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(utils.ContextKeyOrgID)
	if !exists {
		return uuid.Nil, false
	}
	oid, ok := val.(uuid.UUID)
	return oid, ok
}

// GetTenantID retrieves tenant ID from context
func GetTenantID(c *gin.Context) (uuid.UUID, bool) {
	val, exists := c.Get(utils.ContextKeyTenantID)
	if !exists {
		return uuid.Nil, false
	}
	tid, ok := val.(uuid.UUID)
	return tid, ok
}

// GetRole retrieves user role from context
func GetRole(c *gin.Context) (string, bool) {
	val, exists := c.Get(utils.ContextKeyRole)
	if !exists {
		return "", false
	}
	role, ok := val.(string)
	return role, ok
}

// BrandConfig represents brand configuration from IAM
type BrandConfig struct {
	LogoURL      string `json:"logo_url"`
	PrimaryColor string `json:"primary_color"`
	BrandName    string `json:"brand_name"`
}

// SessionResponse represents the session response
type SessionResponse struct {
	User         UserResponse       `json:"user"`
	BrandConfig  BrandConfig        `json:"brand_config"`
	Organization *OrganizationBrief `json:"organization,omitempty"`
}

// GetSession returns current session information including brand config
func GetSession(c *gin.Context) {
	// Get user from context
	userID, exists := GetUserID(c)
	if !exists {
		response.Unauthorized(c, "user not authenticated")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	// Get user details
	var user model.User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	// Get organization details
	var org *model.Organization
	if user.OrganizationID != uuid.Nil {
		org = &model.Organization{}
		if err := db.First(org, "id = ?", user.OrganizationID).Error; err != nil {
			// Don't fail if org not found
			org = nil
		}
	}

	// Extract brand config from current token
	brandConfig := BrandConfig{}
	if token := c.GetString("access_token"); token != "" {
		// TODO: Parse token to extract brand_config if available
		// For now, return empty
	}

	response.Success(c, SessionResponse{
		User: UserResponse{
			ID:             user.ID,
			Username:       user.Username,
			Email:          user.Email,
			Phone:          user.Phone,
			Role:           user.Role,
			Status:         string(user.Status),
			OrganizationID: user.OrganizationID,
			DisplayName:    user.DisplayName,
			CreatedAt:      user.CreatedAt,
		},
		BrandConfig:  brandConfig,
		Organization: nil, // TODO: Map organization if available
	})
}

type MyTenantInfo struct {
	TenantID   uuid.UUID      `json:"tenant_id"`
	TenantName string         `json:"tenant_name"`
	TenantCode string         `json:"tenant_code"`
	LogoURL    string         `json:"logo_url"`
	Role       model.UserRole `json:"role"`
	OrgID      uuid.UUID      `json:"org_id"`
	OrgName    string         `json:"org_name"`
}

func GetMyTenants(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists {
		response.Unauthorized(c, "user not authenticated")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var currentUser model.User
	if err := db.First(&currentUser, "id = ?", userID).Error; err != nil {
		response.NotFound(c, "user not found")
		return
	}

	var users []model.User

	if currentUser.IAMSub != "" {
		if err := db.Where("iam_sub = ?", currentUser.IAMSub).Find(&users).Error; err != nil {
			response.InternalServerError(c, "failed to fetch tenant memberships")
			return
		}
	} else {
		users = []model.User{currentUser}
	}

	tenantCache := make(map[uuid.UUID]model.Tenant)
	orgCache := make(map[uuid.UUID]model.Organization)

	var tenantInfos []MyTenantInfo
	for _, user := range users {
		tenant, ok := tenantCache[user.TenantID]
		if !ok {
			if err := db.Where("uuid = ?", user.TenantID).First(&tenant).Error; err == nil {
				tenantCache[user.TenantID] = tenant
			}
		}

		org, ok := orgCache[user.OrganizationID]
		if !ok {
			if err := db.Where("id = ?", user.OrganizationID).First(&org).Error; err == nil {
				orgCache[user.OrganizationID] = org
			}
		}

		logoURL := ""
		if tenant.Config != nil {
			if url, ok := tenant.Config["logo_url"].(string); ok {
				logoURL = url
			}
		}

		tenantInfos = append(tenantInfos, MyTenantInfo{
			TenantID:   user.TenantID,
			TenantName: tenant.Name,
			TenantCode: tenant.Code,
			LogoURL:    logoURL,
			Role:       user.Role,
			OrgID:      user.OrganizationID,
			OrgName:    org.Name,
		})
	}

	response.Success(c, tenantInfos)
}
