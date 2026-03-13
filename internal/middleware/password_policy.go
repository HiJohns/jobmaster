package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobmaster/internal/model"
)

// MustChangePasswordInterceptor returns a middleware that enforces password change for new users
func MustChangePasswordInterceptor() gin.HandlerFunc {
	// Whitelisted paths that are accessible even when must_change_password is true
	whitelist := []string{
		"/auth/change-password",
		"/auth/logout",
		"/auth/login",
		"/auth/refresh",
		"/health",
	}

	return func(c *gin.Context) {
		// Check if user is authenticated
		userIDVal, exists := c.Get("userId")
		if !exists {
			c.Next()
			return
		}

		userID, ok := userIDVal.(uuid.UUID)
		if !ok || userID == uuid.Nil {
			c.Next()
			return
		}

		// Check if current path is in whitelist
		path := c.Request.URL.Path
		for _, whitelisted := range whitelist {
			if strings.HasPrefix(path, whitelisted) {
				c.Next()
				return
			}
		}

		// Get user from context (assuming it's already loaded by auth middleware)
		userVal, userExists := c.Get("user")
		if !userExists {
			// User not loaded, check database (this would require DB access)
			// For now, assume if userId exists but user doesn't, it's an error
			// In production, you might want to load the user here
			c.Next()
			return
		}

		user, userOk := userVal.(*model.User)
		if !userOk {
			c.Next()
			return
		}

		// Check if user must change password
		if user.MustChangePassword {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"error":   "PASSWORD_EXPIRED",
				"message": "请先修改初始密码",
				"data": gin.H{
					"redirect": "/auth/change-password",
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
