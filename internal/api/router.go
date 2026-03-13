package api

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"jobmaster/internal/api/admin"
	"jobmaster/internal/middleware"
	"jobmaster/internal/repository"
	"jobmaster/pkg/database"
)

// SetupRouter configures the API routes with middleware pipeline
// Middleware execution order: Recovery -> Logger -> Auth -> Impersonation -> Tenant
func SetupRouter() *gin.Engine {
	r := gin.New()

	// Global middleware - system level
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// Health check endpoint (no auth required)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Public routes (no authentication required)
		public := v1.Group("/auth")
		{
			public.POST("/login", Login)
		}

		// Protected routes (authentication required)
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware())
		protected.Use(middleware.ImpersonationMiddleware())
		protected.Use(middleware.TenantMiddleware())
		protected.Use(middleware.MustChangePasswordInterceptor())
		{
			// Auth routes (require authentication)
			protected.POST("/auth/refresh", RefreshToken)
			protected.POST("/auth/change-password", ChangePassword)

			// Organization routes (require authentication)
			protected.GET("/organizations", ListOrganizations)
			protected.POST("/organizations", CreateOrganization)
			protected.GET("/organizations/tree", GetOrganizationTree)

			// User routes (require authentication)
			protected.GET("/users", ListUsers)
			protected.POST("/users", CreateUser)
			protected.GET("/users/:id", GetUser)
			protected.PUT("/users/:id", UpdateUser)
			protected.DELETE("/users/:id", DeleteUser)

			// WorkOrder routes (require authentication)
			protected.GET("/workorders", ListWorkOrders)
			protected.POST("/workorders", CreateWorkOrder)
			protected.GET("/workorders/:id", GetWorkOrder)
			protected.POST("/workorders/:id/dispatch", DispatchWorkOrder)
			protected.POST("/workorders/:id/accept", AcceptWorkOrder)
			protected.POST("/workorders/:id/reject", RejectWorkOrder)
			protected.POST("/workorders/:id/reserve", ReserveWorkOrder)
			protected.POST("/workorders/:id/arrive", ArriveWorkOrder)
			protected.POST("/workorders/:id/finish", FinishWorkOrder)

			// Admin routes (require SYSTEM_ADMIN role)
			db, err := database.GetDB()
			if err != nil {
				panic("failed to get database connection: " + err.Error())
			}
			tenantRepo := repository.NewTenantRepository(db)
			admin.RegisterRoutes(protected, tenantRepo, db)
		}
	}

	// Serve frontend static files
	frontendDist := "./frontend/dist"
	if _, err := os.Stat(frontendDist); err == nil {
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path

			// If it's an API route that's not found, return 404 JSON
			if strings.HasPrefix(path, "/api/") {
				c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
				return
			}

			// Try to serve static files from the dist directory
			fullPath := filepath.Join(frontendDist, path)
			if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
				c.File(fullPath)
				return
			}

			// For all other routes (client-side routing), serve index.html
			c.File(filepath.Join(frontendDist, "index.html"))
		})
	} else {
		// Fallback if frontend is not built
		r.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "JobMaster API is running (Frontend not built. Please run 'cd frontend && npm run build')",
			})
		})
		r.NoRoute(func(c *gin.Context) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Route not found"})
		})
	}

	return r
}
