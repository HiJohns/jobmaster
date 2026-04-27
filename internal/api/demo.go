package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"jobmaster/internal/data"
)

var (
	// sessions stores demo mode user sessions
	// key: session ID, value: username
	sessions sync.Map
	// sessionMutex for thread-safe session operations
	sessionMutex sync.Mutex
)

func contains(s string, substr string) bool {
	return strings.Contains(s, substr)
}

// generateSessionID creates a unique session ID
func generateSessionID(username string) string {
	return "demo_session_" + username + "_" + os.Getenv("DEMO_MODE")
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

	handlers := NewDemoHandlers()
	demo := r.Group("/api/demo")

	// WorkOrder endpoints
	demo.GET("/workorders", handlers.GetWorkOrders)
	demo.GET("/workorders/:id", handlers.GetWorkOrder)
	demo.POST("/workorders", handlers.CreateWorkOrder)
	demo.GET("/workorders/:id/records", handlers.GetWorkOrderRecords)
	demo.POST("/workorders/:id/records", handlers.CreateWorkOrderRecord)

	// Reservation endpoints
	demo.GET("/reservations", handlers.GetReservations)
	demo.GET("/reservations/:id", handlers.GetReservation)
	demo.POST("/reservations/:id/confirm", handlers.ConfirmReservation)
	demo.POST("/reservations/:id/reject", handlers.RejectReservation)

	// Organization endpoints
	demo.GET("/organizations", handlers.GetOrganizations)

	// User endpoints
	demo.GET("/users", handlers.GetUsers)

	// Auth endpoints
	demo.POST("/auth/login", handlers.Login)

	// Region endpoints (for demo mode - area/category mapping)
	demo.GET("/regions", handlers.GetRegions)

	// Categories endpoint
	demo.GET("/categories", handlers.GetCategories)
}

// GetWorkOrders returns work orders from demo data with user-based filtering
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

	// Get username from session header
	username := h.getUsernameFromSession(c)
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing session"})
		return
	}

	// Parse role from username
	userRole := h.parseRoleFromUsername(username)

	// Default filter: show all work orders
	filtered := workOrders

	// Apply role-based filtering for engineers
	// Engineers can only see work orders assigned to them (based on ID match for demo)
	if strings.Contains(userRole, "ENGINEER") {
		var engineerFiltered []map[string]interface{}
		for _, wo := range workOrders {
			// For demo: match engineer ID containing the username or engineerId field
			// If neither exists, skip this filter in demo mode
			engineerId, hasEngineerId := wo["engineerId"].(string)
			if hasEngineerId && strings.Contains(engineerId, username) {
				engineerFiltered = append(engineerFiltered, wo)
			} else {
				// Fallback: if no engineerId field, show all for demo purposes
				engineerFiltered = append(engineerFiltered, wo)
			}
		}
		filtered = engineerFiltered
	}

	// Apply status filter from query parameter (comma-separated)
	// Frontend determines which statuses to show based on user role
	statusParam := c.Query("status")
	if statusParam != "" {
		allowedStatuses := strings.Split(statusParam, ",")
		var statusFiltered []map[string]interface{}
		for _, wo := range filtered {
			status, _ := wo["status"].(string)
			for _, s := range allowedStatuses {
				if strings.TrimSpace(s) == status {
					statusFiltered = append(statusFiltered, wo)
					break
				}
			}
		}
		filtered = statusFiltered
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  filtered,
		"total": len(filtered),
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

// GetCategories returns categories from demo data
func (h *DemoHandlers) GetCategories(c *gin.Context) {
	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var categories []map[string]interface{}
	if err := json.Unmarshal(demoData.Categories, &categories); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse categories"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  categories,
		"total": len(categories),
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

	// Create session for demo mode
	sessionID := generateSessionID(username)
	sessions.Store(sessionID, username)

	// Return user with parsed role
	c.JSON(http.StatusOK, gin.H{
		"session": sessionID, // Return session ID instead of token
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

// getUsernameFromSession extracts username from session header
func (h *DemoHandlers) getUsernameFromSession(c *gin.Context) string {
	sessionID := c.GetHeader("X-Session-Id")
	if sessionID == "" {
		return ""
	}

	username, ok := sessions.Load(sessionID)
	if !ok {
		return ""
	}

	return username.(string)
}

// parseRoleFromUsername parses role from username pattern
func (h *DemoHandlers) parseRoleFromUsername(username string) string {
	if username == "" {
		return ""
	}

	role := "EMPLOYEE" // default
	if contains(username, "admin") {
		role = "BRANCH_ADMIN"
	} else if contains(username, "engineer") {
		role = "ENGINEER"
	} else if contains(username, "contractor") {
		role = "CONTRACTOR_EMPLOYEE"
	} else if contains(username, "vendor") {
		role = "VENDOR_EMPLOYEE"
	}

	return role
}

// GetReservations returns all reservations from demo data

// GetReservations returns all reservations from demo data
func (h *DemoHandlers) GetReservations(c *gin.Context) {
	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var reservations []map[string]interface{}
	if err := json.Unmarshal(demoData.Reservations, &reservations); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse reservations: " + err.Error()})
		return
	}

	filtered := reservations

	// Optional: Filter by work_order_id if provided
	workOrderID := c.Query("work_order_id")
	if workOrderID != "" {
		var workOrderFiltered []map[string]interface{}
		for _, r := range reservations {
			if woID, ok := r["work_order_id"].(string); ok && woID == workOrderID {
				workOrderFiltered = append(workOrderFiltered, r)
			}
		}
		filtered = workOrderFiltered
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  filtered,
		"total": len(filtered),
	})
}

// GetReservation returns a single reservation by ID
func (h *DemoHandlers) GetReservation(c *gin.Context) {
	id := c.Param("id")

	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var reservations []map[string]interface{}
	if err := json.Unmarshal(demoData.Reservations, &reservations); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse reservations"})
		return
	}

	for _, r := range reservations {
		if r["id"] == id {
			c.JSON(http.StatusOK, r)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Reservation not found"})
}

// ConfirmReservation confirms a reservation
func (h *DemoHandlers) ConfirmReservation(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Demo mode - just return success
	c.JSON(http.StatusOK, gin.H{
		"id":      id,
		"status":  "confirmed",
		"comment": req.Comment,
	})
}

// RejectReservation rejects a reservation
func (h *DemoHandlers) RejectReservation(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Demo mode - just return success
	c.JSON(http.StatusOK, gin.H{
		"id":     id,
		"status": "rejected",
		"reason": req.Reason,
	})
}

// GetWorkOrderRecords returns work order records (messages + photos) from demo data
func (h *DemoHandlers) GetWorkOrderRecords(c *gin.Context) {
	workOrderID := c.Param("id")

	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var workRecords []map[string]interface{}
	if err := json.Unmarshal(demoData.WorkRecords, &workRecords); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse work records: " + err.Error()})
		return
	}

	// Filter by work order ID
	var filtered []map[string]interface{}
	for _, record := range workRecords {
		if woID, ok := record["work_order_id"].(string); ok && woID == workOrderID {
			filtered = append(filtered, record)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  filtered,
		"total": len(filtered),
	})
}

// CreateWorkOrderRecord creates a new work order record (message + photo)
func (h *DemoHandlers) CreateWorkOrderRecord(c *gin.Context) {
	workOrderID := c.Param("id")

	var req struct {
		Message   string   `json:"message"`
		PhotoURLs []string `json:"photo_urls"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Demo mode - just return success
	username := h.getUsernameFromSession(c)

	c.JSON(http.StatusOK, gin.H{
		"id":            "record_" + workOrderID + "_" + fmt.Sprint(os.Getpid()),
		"work_order_id": workOrderID,
		"user_name":     username,
		"message":       req.Message,
		"photo_urls":    req.PhotoURLs,
		"created_at":    "2026-04-27T10:00:00Z",
	})
}


// GetRegions returns region list for demo mode
func (h *DemoHandlers) GetRegions(c *gin.Context) {
	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var regionsData map[string]interface{}
	if err := json.Unmarshal(demoData.Regions, &regionsData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse regions data: " + err.Error()})
		return
	}

	// Return only regions list, not categories
	if regions, ok := regionsData["regions"].([]interface{}); ok {
		c.JSON(http.StatusOK, gin.H{
			"regions": regions,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"regions": []string{},
	})
}

// GetRegionCategories returns categories for a specific region
func (h *DemoHandlers) GetRegionCategories(c *gin.Context) {
	region := c.Param("region")
	if region == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Region is required"})
		return
	}

	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var regionsData map[string]interface{}
	if err := json.Unmarshal(demoData.Regions, &regionsData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse regions data: " + err.Error()})
		return
	}

	// Get region_categories
	if regionCategories, ok := regionsData["region_categories"].(map[string]interface{}); ok {
		if categories, exists := regionCategories[region]; exists {
			if cats, ok := categories.([]interface{}); ok {
				c.JSON(http.StatusOK, gin.H{
					"categories": cats,
				})
				return
			}
		}
	}

	// Return empty array if region not found
	c.JSON(http.StatusOK, gin.H{
		"categories": []string{},
	})
}
