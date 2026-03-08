package middleware

import (
	"github.com/gin-gonic/gin"
	"jobmaster/pkg/response"
)

// ImpersonationMiddleware intercepts write operations in impersonation mode
// When IsImpersonated is true, all non-GET requests are blocked with 403 Forbidden
func ImpersonationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if request is in impersonation mode
		if IsImpersonated(c) {
			// Block all non-GET/HEAD/OPTIONS requests
			method := c.Request.Method
			if method != "GET" && method != "HEAD" && method != "OPTIONS" {
				response.Forbidden(c, "read-only mode: write operations are not allowed in impersonation mode")
				c.Abort()
				return
			}
		}

		c.Next()
	}
}
