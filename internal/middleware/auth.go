package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobmaster/pkg/response"
	"jobmaster/pkg/utils"
)

// AuthMiddleware validates JWT token and injects user info into context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "missing authorization header")
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>" format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			response.Unauthorized(c, "invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Parse token using IAM public key (RS256)
		claims, err := utils.ParseTokenWithPublicKey(tokenString, nil)
		if err != nil {
			// Fallback to legacy HS256 for backward compatibility (optional)
			fallbackClaims, fallbackErr := utils.ParseToken(tokenString, nil)
			if fallbackErr != nil {
				response.Unauthorized(c, "invalid or expired token")
				c.Abort()
				return
			}
			// Inject using legacy claims
			c.Set(utils.ContextKeyUserID, fallbackClaims.UserID)
			c.Set(utils.ContextKeyOrgID, fallbackClaims.OrgID)
			c.Set(utils.ContextKeyTenantID, fallbackClaims.TenantID)
			c.Set(utils.ContextKeyRole, fallbackClaims.Role)
			c.Set(utils.ContextKeyIsImpersonated, fallbackClaims.IsImpersonated)
			c.Next()
			return
		}

		// Convert IAM string UUIDs to uuid.UUID
		userID, err := utils.ConvertIAMClaimUUID(claims.Sub)
		if err != nil {
			response.Unauthorized(c, "invalid user id in token")
			c.Abort()
			return
		}

		tenantID, err := utils.ConvertIAMClaimUUID(claims.Tid)
		if err != nil {
			response.Unauthorized(c, "invalid tenant id in token")
			c.Abort()
			return
		}

		orgID, err := utils.ConvertIAMClaimUUID(claims.Oid)
		if err != nil {
			response.Unauthorized(c, "invalid organization id in token")
			c.Abort()
			return
		}

		// Inject user info into context using constants from utils package
		c.Set(utils.ContextKeyUserID, userID)
		c.Set(utils.ContextKeyOrgID, orgID)
		c.Set(utils.ContextKeyTenantID, tenantID)
		c.Set(utils.ContextKeyRole, claims.Role)
		c.Set(utils.ContextKeyIsImpersonated, false) // IAM tokens don't support impersonation
		c.Set(utils.ContextKeyIsOwner, claims.IsOwner)
		c.Set(utils.ContextKeyEmail, claims.Email)
		c.Set(utils.ContextKeyPhone, claims.Phone)
		c.Set(utils.ContextKeyName, claims.Name)
		c.Set(utils.ContextKeyAvatar, claims.Avatar)

		c.Next()
	}
}

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

// IsImpersonated checks if the request is in impersonation mode
func IsImpersonated(c *gin.Context) bool {
	val, exists := c.Get(utils.ContextKeyIsImpersonated)
	if !exists {
		return false
	}
	imp, ok := val.(bool)
	return ok && imp
}

// GetIsOwner checks if the user is an organization owner
func GetIsOwner(c *gin.Context) (bool, bool) {
	val, exists := c.Get(utils.ContextKeyIsOwner)
	if !exists {
		return false, false
	}
	isOwner, ok := val.(bool)
	return isOwner, ok
}

// GetEmail retrieves user email from context
func GetEmail(c *gin.Context) (string, bool) {
	val, exists := c.Get(utils.ContextKeyEmail)
	if !exists {
		return "", false
	}
	email, ok := val.(string)
	return email, ok
}

// GetPhone retrieves user phone from context
func GetPhone(c *gin.Context) (string, bool) {
	val, exists := c.Get(utils.ContextKeyPhone)
	if !exists {
		return "", false
	}
	phone, ok := val.(string)
	return phone, ok
}

// GetDisplayName retrieves user display name from context
func GetDisplayName(c *gin.Context) (string, bool) {
	val, exists := c.Get(utils.ContextKeyName)
	if !exists {
		return "", false
	}
	name, ok := val.(string)
	return name, ok
}

// GetAvatar retrieves user avatar URL from context
func GetAvatar(c *gin.Context) (string, bool) {
	val, exists := c.Get(utils.ContextKeyAvatar)
	if !exists {
		return "", false
	}
	avatar, ok := val.(string)
	return avatar, ok
}
