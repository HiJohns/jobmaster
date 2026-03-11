package api

import (
	"github.com/gin-gonic/gin"
	"jobmaster/internal/middleware"
)

// SetupRouter configures the API routes with middleware pipeline
// Middleware execution order: Recovery -> Logger -> Auth -> Impersonation -> Tenant
func SetupRouter() *gin.Engine {
	r := gin.New()

	// Global middleware - system level
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// Root endpoint
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "JobMaster API is running",
		})
	})

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
		{
			// Auth routes (require authentication)
			protected.POST("/auth/refresh", RefreshToken)

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
		}
	}

	return r
}
