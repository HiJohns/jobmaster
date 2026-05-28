package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"jobmaster/internal/api/admin"
	"jobmaster/internal/middleware"
	"jobmaster/internal/repository"
	"jobmaster/pkg/database"
	"jobmaster/pkg/redis"
	"jobmaster/pkg/utils"
)

// SetupRouter configures the API routes with middleware pipeline
// Middleware execution order: Recovery -> Logger -> Auth -> Impersonation -> Tenant
func SetupRouter() *gin.Engine {
	return SetupRouterWithFrontend("./frontend/dist")
}

func init() {
	// Register demo routes when package is loaded
	// This is done in SetupRouterWithFrontend
}

// SetupRouterWithFrontend configures the API routes with custom frontend static files
func SetupRouterWithFrontend(frontendDist string) *gin.Engine {
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

	// Demo mode endpoints (no auth required)
	RegisterDemoRoutes(r)

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Public routes (no authentication required)
		public := v1.Group("/auth")
		{
			public.POST("/login", Login)
			public.GET("/callback", AuthCallback)
		}

		// Initialize Redis client for this route group
		redisHost := utils.GetEnv("REDIS_HOST", "")
		if redisHost != "" {
			redisPort := utils.GetEnv("REDIS_PORT", "6379")
			redisPassword := utils.GetEnv("REDIS_PASSWORD", "")
			redisDB := 0
			fmt.Sscanf(utils.GetEnv("REDIS_DB", "0"), "%d", &redisDB)
			client, err := redis.NewClient(
				fmt.Sprintf("%s:%s", redisHost, redisPort),
				redisPassword,
				redisDB,
			)
			if err != nil {
				fmt.Printf("Warning: failed to connect to redis: %v\n", err)
			} else {
				redis.SetDefaultClient(client) // Set global client
				fmt.Printf("Redis client initialized and set as default\n")
			}
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
			protected.GET("/auth/my-tenants", GetMyTenants)

			// Organization routes (require authentication)
			protected.GET("/organizations", ListOrganizations)
			protected.POST("/organizations", CreateOrganization)
			protected.GET("/admin-divisions", ListAdminDivisions)
			// Category routes (require authentication)
			protected.GET("/categories", ListCategories)
			protected.POST("/categories", CreateCategory)
			protected.GET("/categories/:id", GetCategory)
			protected.PUT("/categories/:id", UpdateCategory)
			protected.DELETE("/categories/:id", DeleteCategory)
			protected.GET("/admin-divisions/:id", GetAdminDivision)
			protected.PUT("/organizations/:id", UpdateOrganization)
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
			protected.POST("/workorders/:id/verify", VerifyWorkOrder)
			protected.POST("/workorders/:id/evaluate", EvaluateWorkOrder)
			protected.POST("/workorders/:id/validate-location", ValidateWorkOrderLocation)
			protected.POST("/workorders/:id/work-record", AddWorkRecord)
			protected.GET("/workorders/:id/detail", GetWorkOrderDetail)

			// Engineer/Vendor task routes
			protected.GET("/my-tasks", ListMyTasks)
			protected.GET("/my-tasks/statistics", GetTaskStatistics)

			// Device routes (require authentication)
			protected.GET("/devices", ListDevices)
			protected.POST("/devices", CreateDevice)
			protected.GET("/devices/:id", GetDevice)
			protected.GET("/devices/:id/qrcode", GenerateQRCode)
			protected.GET("/devices/sn/:sn", GetDeviceBySN)
			protected.PUT("/devices/:id", UpdateDevice)
			protected.DELETE("/devices/:id", DeleteDevice)

			// Location routes (require authentication)
			protected.GET("/locations", ListLocations)
			protected.POST("/locations", CreateLocation)
			protected.GET("/locations/:id", GetLocation)
			protected.PUT("/locations/:id", UpdateLocation)
			protected.DELETE("/locations/:id", DeleteLocation)

			// Repair routes (require authentication)
			protected.POST("/repair/submit", SubmitRepair)

			// Lease routes (require authentication)
			RegisterLeaseRoutes(protected)

			// Admin routes (require SYSTEM_ADMIN role)
			db, err := database.GetDB()
			if err != nil {
				panic("failed to get database connection: " + err.Error())
			}
			tenantRepo := repository.NewTenantRepository(db)

			admin.RegisterRoutes(protected, tenantRepo, db, nil)
		}
	}

	// Serve frontend static files
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
