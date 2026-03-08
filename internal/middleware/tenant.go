package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobmaster/pkg/response"
	"jobmaster/pkg/utils"
)

// TenantMiddleware ensures TenantID is available in context for database filtering
// This middleware should be placed after AuthMiddleware
func TenantMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get tenant ID from context (injected by AuthMiddleware)
		tenantID, exists := GetTenantID(c)
		if !exists || tenantID == uuid.Nil {
			response.Forbidden(c, "tenant context not found")
			c.Abort()
			return
		}

		// Set tenant ID in context for downstream use
		// This ensures all DB operations can access the tenant ID
		c.Set(utils.ContextKeyTenantID, tenantID)

		c.Next()
	}
}

// GetCurrentTenantID retrieves the current tenant ID from context
// Returns uuid.Nil if not found
func GetCurrentTenantID(c *gin.Context) uuid.UUID {
	tid, _ := GetTenantID(c)
	return tid
}
