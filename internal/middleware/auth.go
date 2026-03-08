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
		claims, err := utils.ParseToken(tokenString, nil)
		if err != nil {
			response.Unauthorized(c, "invalid or expired token")
			c.Abort()
			return
		}

		// Inject user info into context using constants from utils package
		c.Set(utils.ContextKeyUserID, claims.UserID)
		c.Set(utils.ContextKeyOrgID, claims.OrgID)
		c.Set(utils.ContextKeyTenantID, claims.TenantID)
		c.Set(utils.ContextKeyRole, claims.Role)
		c.Set(utils.ContextKeyIsImpersonated, claims.IsImpersonated)

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
