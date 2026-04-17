package api

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"jobmaster/internal/data"
)

func contains(s string, substr string) bool {
	return strings.Contains(s, substr)
}

// DemoHandlers handles demo mode API endpoints
type DemoHandlers struct{}

// NewDemoHandlers creates a new DemoHandlers instance
func NewDemoHandlers() *DemoHandlers {
	return &DemoHandlers{}
}

// RegisterDemoRoutes registers demo API routes
func RegisterDemoRoutes(r *gin.Engine) {
	if !data.IsDemoMode() {
		return
	}

	demo := r.Group("/api/demo")
	{
		handlers := NewDemoHandlers()

		// WorkOrder endpoints
		demo.GET("/workorders", handlers.GetWorkOrders)
		demo.GET("/workorders/:id", handlers.GetWorkOrder)
		demo.POST("/workorders", handlers.CreateWorkOrder)

		// Organization endpoints
		demo.GET("/organizations", handlers.GetOrganizations)

		// User endpoints
		demo.GET("/users", handlers.GetUsers)

		// Auth endpoints
		demo.POST("/auth/login", handlers.Login)
	}
}

// GetWorkOrders returns all work orders from demo data
func (h *DemoHandlers) GetWorkOrders(c *gin.Context) {
	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var workOrders []map[string]interface{}
	if err := json.Unmarshal(demoData.WorkOrders, &workOrders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse work orders: " + err.Error()})
		return
	}

	// Filter by status query param (comma-separated)
	statusParam := c.Query("status")
	if statusParam != "" {
		allowedStatuses := strings.Split(statusParam, ",")
		var filtered []map[string]interface{}
		for _, wo := range workOrders {
			status, _ := wo["status"].(string)
			for _, s := range allowedStatuses {
				if strings.TrimSpace(s) == status {
					filtered = append(filtered, wo)
					break
				}
			}
		}
		workOrders = filtered
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  workOrders,
		"total": len(workOrders),
	})
}

// GetWorkOrder returns a single work order by ID
func (h *DemoHandlers) GetWorkOrder(c *gin.Context) {
	id := c.Param("id")

	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var workOrders []map[string]interface{}
	if err := json.Unmarshal(demoData.WorkOrders, &workOrders); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse work orders"})
		return
	}

	for _, wo := range workOrders {
		if wo["id"] == id {
			c.JSON(http.StatusOK, wo)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
}

// CreateWorkOrder creates a new work order in demo mode
func (h *DemoHandlers) CreateWorkOrder(c *gin.Context) {
	// For demo mode, we would need to save to file or memory
	// This is a simplified implementation
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Create not implemented in demo mode"})
}

// GetOrganizations returns all organizations from demo data
func (h *DemoHandlers) GetOrganizations(c *gin.Context) {
	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var orgs []map[string]interface{}
	if err := json.Unmarshal(demoData.Organizations, &orgs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse organizations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  orgs,
		"total": len(orgs),
	})
}

// GetUsers returns all users from demo data
func (h *DemoHandlers) GetUsers(c *gin.Context) {
	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var users []map[string]interface{}
	if err := json.Unmarshal(demoData.Users, &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  users,
		"total": len(users),
	})
}

// Login handles demo mode login
func (h *DemoHandlers) Login(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Demo mode - accept any credentials
	// Parse role from username (always use this logic)
	role := "EMPLOYEE" // default
	username := req.Username
	if contains(username, "admin") {
		role = "BRANCH_ADMIN"
	} else if contains(username, "engineer") {
		role = "ENGINEER"
	} else if contains(username, "contractor") {
		role = "CONTRACTOR_EMPLOYEE"
	} else if contains(username, "vendor") {
		role = "VENDOR_EMPLOYEE"
	}
	// Return user with parsed role
	c.JSON(http.StatusOK, gin.H{
		"token": "demo_token_" + os.Getenv("DEMO_MODE"),
		"user": map[string]interface{}{
			"id":          "jm-user-" + username,
			"username":    username,
			"displayName": username,
			"role":        role,
			"orgId":       "jm-branch1",
			"orgName":     "Branch 001",
			"tenantId":    "jm-tenant1",
		},
	})
}
