package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"jobmaster/internal/data"
)

var (
	// sessions stores demo mode user sessions
	// key: session ID, value: username
	sessions sync.Map
	// sessionMutex for thread-safe session operations
	sessionMutex sync.Mutex
	// createdWorkOrders stores newly created work orders in memory
	// key: work order ID, value: work order map
	createdWorkOrders sync.Map
)

func contains(s string, substr string) bool {
	return strings.Contains(s, substr)
}

// generateSessionID creates a unique session ID
func generateSessionID(username string) string {
	return "demo_session_" + username + "_" + os.Getenv("DEMO_MODE")
}

// persistDemoState saves current memory state to file
func persistDemoState() {
	state := &data.DemoState{
		Sessions:          make(map[string]string),
		CreatedWorkOrders: make([]map[string]interface{}, 0),
	}

	// Export sessions
	sessions.Range(func(key, value interface{}) bool {
		state.Sessions[key.(string)] = value.(string)
		return true
	})

	// Export created work orders
	createdWorkOrders.Range(func(key, value interface{}) bool {
		state.CreatedWorkOrders = append(state.CreatedWorkOrders, value.(map[string]interface{}))
		return true
	})

	// Save to file
	if err := data.SaveDemoState(state); err != nil {
		fmt.Printf("[WARN] Failed to save demo state: %v\n", err)
	}
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

	// Load persistent demo state from file
	if state, err := data.LoadDemoState(); err == nil {
		// Restore sessions
		for sessionID, username := range state.Sessions {
			sessions.Store(sessionID, username)
		}
		// Restore created work orders
		for _, wo := range state.CreatedWorkOrders {
			if id, ok := wo["id"].(string); ok {
				createdWorkOrders.Store(id, wo)
			}
		}
	}

	demo := r.Group("/api/demo")

	// WorkOrder endpoints
	demo.GET("/workorders", handlers.GetWorkOrders)
	demo.GET("/workorders/:id", handlers.GetWorkOrder)
	demo.POST("/workorders", handlers.CreateWorkOrder)
	demo.POST("/workorders/:id/dispatch", handlers.DispatchWorkOrder)
	demo.POST("/workorders/:id/assign", handlers.AssignWorkOrder)
	demo.POST("/workorders/:id/accept", handlers.AcceptWorkOrder)
	demo.POST("/workorders/:id/reserve", handlers.ReserveWorkOrder)
	demo.POST("/workorders/:id/arrive", handlers.ArriveWorkOrder)
	demo.POST("/workorders/:id/verify", handlers.VerifyWorkOrder)
	demo.POST("/workorders/:id/reject", handlers.RejectWorkOrder)
	demo.GET("/workorders/:id/records", handlers.GetWorkOrderRecords)
	demo.POST("/workorders/:id/records", handlers.CreateWorkOrderRecord)
	demo.POST("/workorders/:id/finish", handlers.FinishWorkOrder)

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
	demo.GET("/regions/:region/categories", handlers.GetRegionCategories)

	// Categories endpoint
	demo.GET("/categories", handlers.GetCategories)

	// Dispatchable targets endpoint
	demo.GET("/dispatchable-targets", handlers.GetDispatchableTargets)

	// Organization engineers endpoint
	demo.GET("/organizations/:id/engineers", handlers.GetOrganizationEngineers)
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

	username := h.getUsernameFromSession(c)
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing session"})
		return
	}

	userRole := h.parseRoleFromUsername(username)

	createdWorkOrders.Range(func(key, value interface{}) bool {
		workOrders = append(workOrders, value.(map[string]interface{}))
		return true
	})

	orgId, _ := getOrgFromUsername(username)

	filtered := workOrders

	// Organization-based filtering for Branch roles
	if strings.Contains(userRole, "BRANCH") || userRole == "EMPLOYEE" {
		var orgFiltered []map[string]interface{}
		for _, wo := range workOrders {
			if storeID, exists := wo["store_id"]; exists && storeID == orgId {
				orgFiltered = append(orgFiltered, wo)
			}
		}
		filtered = orgFiltered
	}

	// Organization-based filtering for Contractor and Vendor roles
	if strings.Contains(userRole, "CONTRACTOR") || strings.Contains(userRole, "VENDOR") {
		var orgFiltered []map[string]interface{}
		for _, wo := range workOrders {
			if ownerOrgID, exists := wo["owner_org_id"]; exists {
				if ownerOrgID == orgId {
					orgFiltered = append(orgFiltered, wo)
				}
			} else {
				orgFiltered = append(orgFiltered, wo)
			}
		}
		filtered = orgFiltered
	}

	if strings.Contains(userRole, "ENGINEER") {
		var engineerFiltered []map[string]interface{}
		for _, wo := range workOrders {
			engineerId, hasEngineerId := wo["engineerId"].(string)
			if hasEngineerId && strings.Contains(engineerId, username) {
				engineerFiltered = append(engineerFiltered, wo)
			} else if !hasEngineerId {
				engineerFiltered = append(engineerFiltered, wo)
			}
		}
		filtered = engineerFiltered
	}

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

	if value, ok := createdWorkOrders.Load(id); ok {
		c.JSON(http.StatusOK, value.(map[string]interface{}))
		return
	}

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
	var req struct {
		Title         string   `json:"title" binding:"required"`
		Description   string   `json:"description" binding:"required"`
		PhotoURLs     []string `json:"photo_urls"`
		Priority      int      `json:"priority"`
		IsUrgent      bool     `json:"is_urgent"`
		AddressDetail string   `json:"address_detail"`
		CategoryID    string   `json:"category_id"`
		Coordinates   *struct {
			Lat float64 `json:"lat"`
			Lng float64 `json:"lng"`
		} `json:"coordinates"`
		DivisionID string `json:"division_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create new work order object
	newOrder := map[string]interface{}{
		"id":             "demo-wo-" + fmt.Sprint(time.Now().Unix()),
		"order_no":       "WO-" + fmt.Sprint(time.Now().Unix()),
		"title":          req.Title,
		"description":    req.Description,
		"status":         "PENDING",
		"photo_urls":     req.PhotoURLs,
		"priority":       req.Priority,
		"is_urgent":      req.IsUrgent,
		"address_detail": req.AddressDetail,
		"category_id":    req.CategoryID,
		"created_at":     time.Now().Format(time.RFC3339),
		"store_id":       "jm-branch1",
		"store_name":     "Branch 001",
		"brand_name":     "Unknown",
		"category_path":  req.CategoryID,
	}

	// Save to memory
	createdWorkOrders.Store(newOrder["id"].(string), newOrder)

	// Persist state to file
	persistDemoState()

	c.JSON(http.StatusOK, newOrder)
}

// findWorkOrder looks up a work order by ID.
// It checks createdWorkOrders first, then falls back to demo data.
// If found in demo data, it copies the work order into createdWorkOrders for mutation.
func findWorkOrder(id string) (map[string]interface{}, bool) {
	if value, ok := createdWorkOrders.Load(id); ok {
		return value.(map[string]interface{}), true
	}

	demoData, err := data.LoadDemoData()
	if err != nil {
		return nil, false
	}

	var workOrders []map[string]interface{}
	if err := json.Unmarshal(demoData.WorkOrders, &workOrders); err != nil {
		return nil, false
	}

	for _, wo := range workOrders {
		if woID, ok := wo["id"].(string); ok && woID == id {
			clone := make(map[string]interface{})
			for k, v := range wo {
				clone[k] = v
			}
			createdWorkOrders.Store(id, clone)
			return clone, true
		}
	}

	return nil, false
}

// findOrgName looks up an organization name by ID from demo data.
func findOrgName(orgID string) string {
	demoData, err := data.LoadDemoData()
	if err != nil {
		return orgID
	}
	var orgs []map[string]interface{}
	if err := json.Unmarshal(demoData.Organizations, &orgs); err != nil {
		return orgID
	}
	for _, org := range orgs {
		if id, ok := org["id"].(string); ok && id == orgID {
			if name, ok := org["name"].(string); ok {
				return name
			}
		}
	}
	return orgID
}

// findEngineerName looks up an engineer's display name by ID from demo data.
func findEngineerName(engineerID string) string {
	demoData, err := data.LoadDemoData()
	if err != nil {
		return engineerID
	}
	var users []map[string]interface{}
	if err := json.Unmarshal(demoData.Users, &users); err != nil {
		return engineerID
	}
	for _, u := range users {
		if id, ok := u["id"].(string); ok && id == engineerID {
			if name, ok := u["display_name"].(string); ok {
				return name
			}
		}
	}
	return engineerID
}

// DispatchWorkOrder dispatches a work order to a vendor/contractor
func (h *DemoHandlers) DispatchWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		TargetOrgID string `json:"target_org_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username := h.getUsernameFromSession(c)

	workOrder, found := findWorkOrder(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	orgName := findOrgName(req.TargetOrgID)

	workOrder["status"] = "DISPATCHED"
	workOrder["owner_org_id"] = req.TargetOrgID
	workOrder["owner_org_name"] = orgName
	workOrder["handler_id"] = username
	workOrder["handler_name"] = username
	createdWorkOrders.Store(id, workOrder)
	persistDemoState()
	c.JSON(http.StatusOK, workOrder)
}

// AssignWorkOrder assigns a work order to an engineer
func (h *DemoHandlers) AssignWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		EngineerID string `json:"engineer_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username := h.getUsernameFromSession(c)

	workOrder, found := findWorkOrder(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	engineerName := findEngineerName(req.EngineerID)

	workOrder["engineer_id"] = req.EngineerID
	workOrder["engineer_name"] = engineerName
	workOrder["handler_id"] = username
	workOrder["handler_name"] = username
	createdWorkOrders.Store(id, workOrder)
	persistDemoState()
	c.JSON(http.StatusOK, workOrder)
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
	// Order matters: check domain-specific keywords before generic "admin"
	role := "EMPLOYEE" // default
	username := req.Username
	if contains(username, "engineer") {
		role = "ENGINEER"
	} else if contains(username, "contractor") && contains(username, "admin") {
		role = "CONTRACTOR_ADMIN"
	} else if contains(username, "contractor") {
		role = "CONTRACTOR_EMPLOYEE"
	} else if contains(username, "vendor") && contains(username, "admin") {
		role = "VENDOR_ADMIN"
	} else if contains(username, "vendor") {
		role = "VENDOR_EMPLOYEE"
	} else if contains(username, "admin") || contains(username, "@branch") {
		role = "BRANCH_ADMIN"
	}

	// Get org from username
	orgId, orgName := getOrgFromUsername(username)

	// Create session for demo mode
	sessionID := generateSessionID(username)
	sessions.Store(sessionID, username)

	// Persist state to file
	persistDemoState()

	// Return user with parsed role
	c.JSON(http.StatusOK, gin.H{
		"session": sessionID, // Return session ID instead of token
		"user": map[string]interface{}{
			"id":          "jm-user-" + username,
			"username":    username,
			"displayName": username,
			"role":        role,
			"orgId":       orgId,
			"orgName":     orgName,
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
	if contains(username, "engineer") {
		role = "ENGINEER"
	} else if contains(username, "contractor") && contains(username, "admin") {
		role = "CONTRACTOR_ADMIN"
	} else if contains(username, "contractor") {
		role = "CONTRACTOR_EMPLOYEE"
	} else if contains(username, "vendor") && contains(username, "admin") {
		role = "VENDOR_ADMIN"
	} else if contains(username, "vendor") {
		role = "VENDOR_EMPLOYEE"
	} else if contains(username, "admin") || contains(username, "@branch") {
		role = "BRANCH_ADMIN"
	}

	return role
}

// getOrgFromUsername determines orgId and orgName from username pattern
func getOrgFromUsername(username string) (orgId string, orgName string) {
	// Default fallback
	orgId = "jm-branch1"
	orgName = "Branch 001"

	if contains(username, "@branch1") {
		orgId = "jm-branch1"
		orgName = "Branch 001"
	} else if contains(username, "@branch2") {
		orgId = "jm-branch2"
		orgName = "Branch 002"
	} else if contains(username, "@contractor1") {
		orgId = "jm-contractor1"
		orgName = "Contractor A"
	} else if contains(username, "@contractor2") {
		orgId = "jm-contractor2"
		orgName = "Contractor B"
	} else if contains(username, "@vendor1") {
		orgId = "jm-vendor1"
		orgName = "Vendor X"
	} else if contains(username, "@vendor2") {
		orgId = "jm-vendor2"
		orgName = "Vendor Y"
	}

	return orgId, orgName
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

// GetDispatchableTargets returns dispatchable targets based on user's organization
func (h *DemoHandlers) GetDispatchableTargets(c *gin.Context) {
	username := h.getUsernameFromSession(c)
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing session"})
		return
	}

	userRole := h.parseRoleFromUsername(username)
	orgId, _ := getOrgFromUsername(username)

	demoData, err := data.LoadDemoData()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var organizations []map[string]interface{}
	if err := json.Unmarshal(demoData.Organizations, &organizations); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse organizations"})
		return
	}

	var targets []map[string]interface{}

	// BRANCH_ADMIN or EMPLOYEE can dispatch to MAIN_CONTRACTOR
	if strings.Contains(userRole, "BRANCH") || userRole == "EMPLOYEE" {
		for _, org := range organizations {
			if org["type"] == "MAIN_CONTRACTOR" {
				targets = append(targets, org)
			}
		}
	}
	// CONTRACTOR_EMPLOYEE or CONTRACTOR_ADMIN can dispatch to VENDOR
	if strings.Contains(userRole, "CONTRACTOR") {
		for _, org := range organizations {
			if org["type"] == "VENDOR" && org["parent_id"] == orgId {
				targets = append(targets, org)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  targets,
		"total": len(targets),
	})
}

// GetOrganizationEngineers returns engineers for a specific organization
func (h *DemoHandlers) GetOrganizationEngineers(c *gin.Context) {
	orgID := c.Param("id")
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID is required"})
		return
	}

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

	var engineers []map[string]interface{}
	for _, user := range users {
		// Check if user belongs to the org and has ENGINEER role
		if user["org_id"] == orgID && strings.Contains(user["role"].(string), "ENGINEER") {
			engineers = append(engineers, user)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  engineers,
		"total": len(engineers),
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

// FinishWorkOrder completes the work for a work order (ENGINEER only)
func (h *DemoHandlers) FinishWorkOrder(c *gin.Context) {
	workOrderID := c.Param("id")

	var req struct {
		Description string   `json:"description"`
		PhotoURLs   []string `json:"photo_urls"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Demo mode - just return success with status change to OBSERVING
	c.JSON(http.StatusOK, gin.H{
		"id":          workOrderID,
		"status":      "observing",
		"description": req.Description,
		"photo_urls":  req.PhotoURLs,
		"finished_at": time.Now().Format(time.RFC3339),
	})
}

// ReserveWorkOrder sets the appointment time for a work order
func (h *DemoHandlers) ReserveWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		AppointedAt string `json:"appointed_at" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workOrder, found := findWorkOrder(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	workOrder["appointed_at"] = req.AppointedAt
	workOrder["status"] = "RESERVED"
	createdWorkOrders.Store(id, workOrder)
	persistDemoState()

	c.JSON(http.StatusOK, workOrder)
}

// AcceptWorkOrder accepts a work order (engineer accepts the job)
func (h *DemoHandlers) AcceptWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		ScheduledAt string `json:"scheduled_at"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workOrder, found := findWorkOrder(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	if status, ok := workOrder["status"].(string); !ok || status != "DISPATCHED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Work order must be in DISPATCHED status to accept"})
		return
	}

	workOrder["status"] = "ACCEPTED"
	if req.ScheduledAt != "" {
		workOrder["scheduled_at"] = req.ScheduledAt
	}
	createdWorkOrders.Store(id, workOrder)
	persistDemoState()

	c.JSON(http.StatusOK, workOrder)
}

// ArriveWorkOrder marks engineer arrival at the work site
func (h *DemoHandlers) ArriveWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workOrder, found := findWorkOrder(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	if status, ok := workOrder["status"].(string); !ok || status != "RESERVED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Work order must be in RESERVED status to arrive"})
		return
	}

	workOrder["status"] = "WORKING"
	workOrder["started_at"] = time.Now().Format(time.RFC3339)
	createdWorkOrders.Store(id, workOrder)
	persistDemoState()

	c.JSON(http.StatusOK, workOrder)
}

// VerifyWorkOrder verifies/complete a work order
func (h *DemoHandlers) VerifyWorkOrder(c *gin.Context) {
	id := c.Param("id")

	workOrder, found := findWorkOrder(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	if status, ok := workOrder["status"].(string); !ok || status != "WORKING" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Work order must be in WORKING status to verify"})
		return
	}

	workOrder["status"] = "FINISHED"
	workOrder["finished_at"] = time.Now().Format(time.RFC3339)
	createdWorkOrders.Store(id, workOrder)
	persistDemoState()

	c.JSON(http.StatusOK, workOrder)
}

// RejectWorkOrder rejects a work order
func (h *DemoHandlers) RejectWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Reason string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workOrder, found := findWorkOrder(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	workOrder["status"] = "PENDING"
	workOrder["rejection_reason"] = req.Reason
	createdWorkOrders.Store(id, workOrder)
	persistDemoState()

	c.JSON(http.StatusOK, workOrder)
}
