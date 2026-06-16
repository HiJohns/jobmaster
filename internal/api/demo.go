package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"jobmaster/internal/data"
	"jobmaster/internal/model"
	"jobmaster/internal/service"
	"jobmaster/pkg/database"
)

// demo UUIDs (must match seed.go)
var (
	demoTenantUUID   = uuid.MustParse("d0000000-0000-0000-0000-000000000001")
	demoBranch1UUID  = uuid.MustParse("d0000000-0000-0000-0000-000000000010")
	demoContractor1  = uuid.MustParse("d0000000-0000-0000-0000-000000000020")
	demoContractor2  = uuid.MustParse("d0000000-0000-0000-0000-000000000021")
	demoVendor1      = uuid.MustParse("d0000000-0000-0000-0000-000000000030")
)

// demoOrgIDMap maps legacy string IDs to UUIDs for dispatch target resolution
var demoOrgIDMap = map[string]uuid.UUID{
	"jm-branch1":     demoBranch1UUID,
	"jm-contractor1": demoContractor1,
	"jm-contractor2": demoContractor2,
	"jm-vendor1":     demoVendor1,
}

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

// resolveTargetOrgID converts a legacy demo org ID (e.g. "jm-contractor1")
// to the corresponding UUID stored in the database. Falls back to UUID parse.
func resolveTargetOrgID(id string) (uuid.UUID, error) {
	if uid, ok := demoOrgIDMap[id]; ok {
		return uid, nil
	}
	uid, err := uuid.Parse(id)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid org ID: %s", id)
	}
	return uid, nil
}

// getDemoUserFromDB looks up the demo user by username in the database
func getDemoUserFromDB(username string) (*model.User, error) {
	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("database connection failed: %w", err)
	}
	var user model.User
	if err := db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, fmt.Errorf("user %s not found: %w", username, err)
	}
	return &user, nil
}

// getDemoUserID looks up the user UUID from DB by username, returns string
func getDemoUserID(username string) string {
	user, err := getDemoUserFromDB(username)
	if err != nil {
		return username
	}
	return user.ID.String()
}

// DemoHandlers handles demo mode API endpoints
type DemoHandlers struct{}

// NewDemoHandlers creates a new DemoHandlers instance
func NewDemoHandlers() *DemoHandlers {
	return &DemoHandlers{}
}

// toDemoWorkOrderMap converts a model.WorkOrder to the flat map format expected by the demo frontend
func toDemoWorkOrderMap(wo *model.WorkOrder) map[string]interface{} {
	result := map[string]interface{}{
		"id":               wo.ID.String(),
		"order_no":         wo.OrderNo,
		"title":            wo.Info.Title,
		"description":      wo.Info.Description,
		"status":           wo.Status.String(),
		"photo_urls":       wo.Info.PhotoURLs,
		"is_urgent":        wo.Info.IsUrgent,
		"address_detail":   wo.AddressDetail,
		"appointment_type": wo.AppointmentType,
		"created_at":       wo.CreatedAt.Format(time.RFC3339),
		"store_id":         wo.StoreID.String(),
		"category_path":    wo.Info.CategoryPath,
	}

	if wo.Info.Title == "" {
		result["title"] = wo.Info.Description
	}
	if wo.Info.EquipmentInfo != "" {
		result["equipment_info"] = wo.Info.EquipmentInfo
	}
	if len(wo.Info.CategoryPath) > 0 {
		result["category_id"] = wo.Info.CategoryPath[0]
		result["category_path"] = wo.Info.CategoryPath
	}
	// Look up store name from DB
	if wo.StoreID != uuid.Nil {
		if db, dbErr := database.GetDB(); dbErr == nil {
			var storeOrg model.Organization
			if db.Where("id = ?", wo.StoreID).First(&storeOrg).Error == nil {
				result["store_name"] = storeOrg.Name
			}
		}
	}
	if wo.EngineerID != nil {
		result["engineer_id"] = wo.EngineerID.String()
		if db, dbErr := database.GetDB(); dbErr == nil {
			var eng model.User
			if db.Where("id = ?", *wo.EngineerID).First(&eng).Error == nil {
				result["engineer_name"] = eng.DisplayName
			}
		}
	}
	if wo.OwnerOrgID != nil {
		result["owner_org_id"] = wo.OwnerOrgID.String()
		// Look up owner org name from DB
		if db, dbErr := database.GetDB(); dbErr == nil {
			var ownerOrg model.Organization
			if db.Where("id = ?", *wo.OwnerOrgID).First(&ownerOrg).Error == nil {
				result["owner_org_name"] = ownerOrg.Name
			}
		}
	}

	if len(wo.Info.TimeSlots) > 0 {
		result["time_slots"] = wo.Info.TimeSlots
	}

	return result
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

	// Image upload & serve endpoints
	demo.POST("/workorders/:id/images", handlers.UploadImage)
	demo.GET("/files/*filekey", handlers.ServeLogImage)
}

// GetWorkOrders returns work orders from database with user-based filtering
func (h *DemoHandlers) GetWorkOrders(c *gin.Context) {
	username := h.getUsernameFromSession(c)
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing session"})
		return
	}

	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}

	// Look up user from database, fallback to username parsing
	user, err := getDemoUserFromDB(username)
	var userOrgID uuid.UUID
	var userUUID uuid.UUID
	if err != nil {
		// Fallback: use old demo username parsing for org ID
		orgStr, _ := getOrgFromUsername(username)
		userOrgID, _ = resolveTargetOrgID(orgStr)
		userUUID = uuid.Nil
	} else {
		userOrgID = user.OrganizationID
		userUUID = user.ID
	}

	userRole := h.parseRoleFromUsername(username)
	query := db.Model(&model.WorkOrder{}).Where("tenant_id = ?", demoTenantUUID)

	// Apply role-based filtering
	switch {
	case strings.Contains(userRole, "BRANCH") || userRole == "EMPLOYEE":
		query = query.Where("store_id = ? OR dispatch_path @> ?",
			userOrgID, fmt.Sprintf(`"%s"`, userOrgID.String()))

	case strings.Contains(userRole, "CONTRACTOR") || strings.Contains(userRole, "VENDOR"):
		query = query.Where("owner_org_id = ? OR dispatch_path @> ?",
			userOrgID, fmt.Sprintf(`"%s"`, userOrgID.String()))

	case strings.Contains(userRole, "ENGINEER"):
		if userUUID != uuid.Nil {
			query = query.Where("engineer_id = ?", userUUID)
		}
	}

	// Apply status filter
	statusParam := c.Query("status")
	if statusParam != "" {
		allowedStatuses := strings.Split(statusParam, ",")
		var statusInts []int
		for _, s := range allowedStatuses {
			s = strings.TrimSpace(s)
			var st model.WorkOrderStatus
			if err := st.UnmarshalJSON([]byte(`"` + s + `"`)); err == nil {
				statusInts = append(statusInts, int(st))
			}
		}
		if len(statusInts) > 0 {
			query = query.Where("status IN ?", statusInts)
		}
	}

	// Execute query
	var workOrders []model.WorkOrder
	if err := query.Order("created_at DESC").Find(&workOrders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch work orders"})
		return
	}

	// Convert to demo format
	var list []map[string]interface{}
	for i := range workOrders {
		list = append(list, toDemoWorkOrderMap(&workOrders[i]))
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  list,
		"total": len(list),
	})
}

// GetWorkOrder returns a single work order by ID from database
func (h *DemoHandlers) GetWorkOrder(c *gin.Context) {
	id := c.Param("id")

	woID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}

	var wo model.WorkOrder
	if err := db.Where("id = ? AND tenant_id = ?", woID, demoTenantUUID).First(&wo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(&wo))
}

// CreateWorkOrder creates a new work order in demo mode (persisted to DB)
func (h *DemoHandlers) CreateWorkOrder(c *gin.Context) {
	var req struct {
		Title           string   `json:"title" binding:"required"`
		Description     string   `json:"description" binding:"required"`
		PhotoURLs       []string `json:"photo_urls"`
		Priority        int      `json:"priority"`
		IsUrgent        bool     `json:"is_urgent"`
		AddressDetail   string   `json:"address_detail"`
		CategoryID      string   `json:"category_id"`
		Coordinates     *struct {
			Lat float64 `json:"lat"`
			Lng float64 `json:"lng"`
		} `json:"coordinates"`
		DivisionID      string             `json:"division_id"`
		AppointmentType int                `json:"appointment_type"`
		TimeSlots      []model.TimeSlot   `json:"time_slots,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get session info and look up user from DB
	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}

	appointmentType := req.AppointmentType
	if appointmentType == 0 {
		appointmentType = 1
	}

	// Build order info
	var location *model.GPSLocation
	if req.Coordinates != nil {
		location = &model.GPSLocation{
			Latitude:  req.Coordinates.Lat,
			Longitude: req.Coordinates.Lng,
		}
	}

	var categoryPath []string
	if req.CategoryID != "" {
		categoryPath = []string{req.CategoryID}
	}

	info := model.WorkOrderInfo{
		Title:         req.Title,
		Description:   req.Description,
		PhotoURLs:     req.PhotoURLs,
		IsUrgent:      req.IsUrgent,
		Location:      location,
		CategoryPath:  categoryPath,
		TimeSlots:     req.TimeSlots,
	}

	orderNo, err := OrderNoGenerator.Generate(demoTenantUUID, user.OrganizationID)
	if err != nil {
		orderNo = "DEMO-" + fmt.Sprintf("%010d", time.Now().UnixMilli()%10000000000)
	}

	wo := &model.WorkOrder{
		ID:              uuid.New(),
		OrderNo:         orderNo,
		TenantID:        demoTenantUUID,
		StoreID:         user.OrganizationID,
		CreatedBy:       user.ID,
		Status:          model.WorkOrderStatusPending,
		AddressDetail:   req.AddressDetail,
		AppointmentType: appointmentType,
		Info:            info,
		Logs:            make(model.WorkOrderLogs, 0),
	}

	wo.Logs.AddLog(user.ID, user.DisplayName, model.LogActionCreate, "Work order created", 0, model.WorkOrderStatusPending)

	if err := db.Create(wo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create work order: %v", err)})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(wo))
}

// findWorkOrder looks up a work order by UUID from the database.
func findWorkOrder(id string) (*model.WorkOrder, bool) {
	woID, err := uuid.Parse(id)
	if err != nil {
		return nil, false
	}

	db, err := database.GetDB()
	if err != nil {
		return nil, false
	}

	var wo model.WorkOrder
	if err := db.Where("id = ? AND tenant_id = ?", woID, demoTenantUUID).First(&wo).Error; err != nil {
		return nil, false
	}

	return &wo, true
}

// DispatchWorkOrder dispatches a work order to a vendor/contractor (uses OrderService)
func (h *DemoHandlers) DispatchWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		TargetOrgID string `json:"target_org_id"`
		EngineerID  string `json:"engineer_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.TargetOrgID == "" && req.EngineerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "must specify target_org_id or engineer_id"})
		return
	}

	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	woID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	var targetOrg *uuid.UUID
	var engineerID *uuid.UUID

	if req.TargetOrgID != "" {
		resolved, err := resolveTargetOrgID(req.TargetOrgID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid target org: " + req.TargetOrgID})
			return
		}
		targetOrg = &resolved
	}
	if req.EngineerID != "" {
		eid, err := uuid.Parse(req.EngineerID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid engineer ID"})
			return
		}
		engineerID = &eid
	}

	order, err := OrderService.Dispatch(c.Request.Context(), woID, user.ID, user.DisplayName, targetOrg, engineerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(order))
}

// AssignWorkOrder assigns a work order to an engineer (direct DB update)
func (h *DemoHandlers) AssignWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		EngineerID string `json:"engineer_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	wo, found := findWorkOrder(id)
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	engineerUUID, err := uuid.Parse(req.EngineerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid engineer ID"})
		return
	}

	wo.EngineerID = &engineerUUID
	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}
	if err := db.Save(wo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to assign engineer"})
		return
	}

	// Refresh from DB to get updated model
	db.First(&wo, "id = ?", wo.ID)

	c.JSON(http.StatusOK, toDemoWorkOrderMap(wo))
}

// AcceptWorkOrder accepts a work order (uses OrderService, transitions DISPATCHED → RESERVED)
func (h *DemoHandlers) AcceptWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		ScheduledAt *time.Time `json:"scheduled_at"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	woID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	scheduledAt := time.Now()
	if req.ScheduledAt != nil {
		scheduledAt = *req.ScheduledAt
	}

	order, err := OrderService.Accept(c.Request.Context(), woID, user.ID, user.DisplayName, scheduledAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(order))
}

// ReserveWorkOrder sets the appointment time (uses OrderService)
func (h *DemoHandlers) ReserveWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		AppointedAt string `json:"appointed_at" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	appointedAt, err := time.Parse(time.RFC3339, req.AppointedAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid appointed_at format"})
		return
	}

	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	// Fallback: try other common formats
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	woID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	order, err := OrderService.Reserve(c.Request.Context(), woID, user.ID, user.OrganizationID, user.DisplayName, appointedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(order))
}

// ArriveWorkOrder marks engineer arrival (uses OrderService)
func (h *DemoHandlers) ArriveWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		PhotoURLs []string `json:"photo_urls"`
		Comment   string   `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	woID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	order, err := OrderService.Arrive(c.Request.Context(), woID, user.ID, user.OrganizationID, user.DisplayName, req.PhotoURLs, req.Comment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(order))
}

// FinishWorkOrder completes the work (uses OrderService)
func (h *DemoHandlers) FinishWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Description string   `json:"description" binding:"required"`
		PhotoURLs   []string `json:"photo_urls"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	woID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	order, err := OrderService.Finish(c.Request.Context(), woID, user.ID, user.OrganizationID, user.DisplayName, req.Description, req.PhotoURLs, 0, 0, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(order))
}

// VerifyWorkOrder verifies a finished work order (uses OrderService)
func (h *DemoHandlers) VerifyWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Action  string `json:"action"`  // "approve" or "reject"
		Comment string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Action == "" {
		req.Action = "approve" // default to approve for backward compatibility
	}

	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	woID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	order, err := OrderService.Verify(c.Request.Context(), woID, user.ID, user.OrganizationID, user.DisplayName, req.Action, req.Comment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(order))
}

// RejectWorkOrder rejects a work order (uses OrderService)
func (h *DemoHandlers) RejectWorkOrder(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	woID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	order, err := OrderService.Reject(c.Request.Context(), woID, user.ID, user.DisplayName, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, toDemoWorkOrderMap(order))
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

	// Look up user ID and org from database, fallback to username parsing
	userID := "jm-user-" + username
	orgId, orgName := getOrgFromUsername(username)
	orgAddress := ""
	user, err := getDemoUserFromDB(username)
	if err == nil {
		userID = user.ID.String()
		orgId = user.OrganizationID.String()
		// Look up org address from DB
		db, dbErr := database.GetDB()
		if dbErr == nil {
			var org model.Organization
			if db.Where("id = ?", user.OrganizationID).First(&org).Error == nil {
				orgAddress = org.Address
			}
		}
	}

	// Create session for demo mode
	sessionID := generateSessionID(username)
	sessions.Store(sessionID, username)

	// Return user with parsed role
	c.JSON(http.StatusOK, gin.H{
		"session": sessionID,
		"user": map[string]interface{}{
			"id":          userID,
			"username":    username,
			"displayName": username,
			"role":        role,
			"orgId":       orgId,
			"orgName":     orgName,
			"orgAddress":  orgAddress,
			"tenantId":    demoTenantUUID.String(),
		},
	})
}

// getUserIDFromUsername looks up user ID by username from demo data
func getUserIDFromUsername(username string) string {
	demoData, err := data.LoadDemoData()
	if err != nil {
		return ""
	}
	var users []map[string]interface{}
	if err := json.Unmarshal(demoData.Users, &users); err != nil {
		return ""
	}
	for _, u := range users {
		if u["username"] == username {
			if id, ok := u["id"].(string); ok {
				return id
			}
		}
	}
	return ""
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
	orgName = "寿司郎太阳宫店"

	if contains(username, "@branch1") {
		orgId = "jm-branch1"
		orgName = "寿司郎太阳宫店"
	} else if contains(username, "@branch2") {
		orgId = "jm-branch2"
		orgName = "Branch 002"
	} else if contains(username, "@contractor1") {
		orgId = "jm-contractor1"
		orgName = "建王"
	} else if contains(username, "@contractor2") {
		orgId = "jm-contractor2"
		orgName = "希望"
	} else if contains(username, "@vendor1") {
		orgId = "jm-vendor1"
		orgName = "森泉"
	} else if contains(username, "@vendor2") {
		orgId = "jm-vendor2"
		orgName = "相川"
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

// GetWorkOrderRecords returns work order records from DB logs
func (h *DemoHandlers) GetWorkOrderRecords(c *gin.Context) {
	workOrderID := c.Param("id")
	woID, err := uuid.Parse(workOrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}

	var wo model.WorkOrder
	if err := db.Where("id = ?", woID).First(&wo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	// Get arrive and work_record logs
	var list []map[string]interface{}
	for _, log := range wo.Logs {
		if log.Action != model.LogActionArrive && log.Action != model.LogActionWorkRecord && log.Action != model.LogActionStatusChangeToWorking && log.Action != model.LogActionFinish {
			continue
		}
		entry := map[string]interface{}{
			"timestamp":  log.Timestamp,
			"user_name":  log.UserName,
			"action":     log.Action,
			"details":    log.Details,
			"photo_urls": log.PhotoURLs,
		}
		if log.Action == model.LogActionArrive {
			entry["type"] = "arrive"
		} else if log.Action == model.LogActionStatusChangeToWorking {
			entry["type"] = "start"
		} else if log.Action == model.LogActionFinish {
			entry["type"] = "finish"
		} else {
			entry["type"] = "record"
		}
		list = append(list, entry)
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  list,
		"total": len(list),
	})
}

// CreateWorkOrderRecord creates a new work order record (message + photo) - saves to DB logs
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

	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}

	woID, err := uuid.Parse(workOrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	var wo model.WorkOrder
	if err := db.Where("id = ?", woID).First(&wo).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Work order not found"})
		return
	}

	username := h.getUsernameFromSession(c)
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid session"})
		return
	}
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	wo.Logs.AddWorkLog(user.ID, user.DisplayName, req.Message, req.PhotoURLs)
	if err := db.Save(&wo).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save work record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":         uuid.New().String(),
		"work_order_id": workOrderID,
		"user_name":  user.DisplayName,
		"message":    req.Message,
		"photo_urls": req.PhotoURLs,
		"created_at": time.Now().Format(time.RFC3339),
		"type":       "record",
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

// UploadImage handles image upload for work order logs
func (h *DemoHandlers) UploadImage(c *gin.Context) {
	workOrderID := c.Param("id")
	woID, err := uuid.Parse(workOrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid work order ID"})
		return
	}

	username := h.getUsernameFromSession(c)
	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	defer file.Close()

	if header.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file too large (max 5MB)"})
		return
	}

	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}

	storage := service.NewImageStorage(db)
	result, err := storage.SaveImage(woID, user.ID, file, header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ServeLogImage serves uploaded log images with optional thumbnail
func (h *DemoHandlers) ServeLogImage(c *gin.Context) {
	fileKey := c.Param("filekey")
	if fileKey == "" {
		c.String(http.StatusBadRequest, "file key required")
		return
	}

	serveThumb := c.Query("thumb") == "1"
	basePath := os.Getenv("LOG_STORAGE_PATH")
	if basePath == "" {
		basePath = "./data/logs"
	}

	if serveThumb {
		// Try thumbnail path directly (consistent with GetThumbnailPath logic)
		ext := filepath.Ext(fileKey)
		withoutExt := fileKey[:len(fileKey)-len(ext)]
		thumbKey := withoutExt + "_thumb" + ext
		thumbPath := filepath.Join(basePath, thumbKey)
		if _, err := os.Stat(thumbPath); err == nil {
			c.File(thumbPath)
			return
		}
	}

	fullPath := filepath.Join(basePath, fileKey)
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		// Try archive path
		parts := strings.SplitN(fileKey, "/", 2)
		if len(parts) == 2 {
			archiveKey := parts[0] + "_archive/" + parts[1]
			archivePath := filepath.Join(basePath, archiveKey)
			if _, err := os.Stat(archivePath); err == nil {
				c.File(archivePath)
				return
			}
		}
		c.String(http.StatusNotFound, "file not found")
		return
	}

	c.File(fullPath)
}

// GetDispatchableTargets returns dispatchable targets based on user's organization (from DB)
func (h *DemoHandlers) GetDispatchableTargets(c *gin.Context) {
	username := h.getUsernameFromSession(c)
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or missing session"})
		return
	}

	userRole := h.parseRoleFromUsername(username)

	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}

	user, err := getDemoUserFromDB(username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	var orgs []map[string]interface{}
	var engineers []map[string]interface{}

	switch {
	case strings.Contains(userRole, "BRANCH") || userRole == "EMPLOYEE":
		// Branch sees all MAIN_CONTRACTOR orgs
		var targets []model.Organization
		db.Where("type = ? AND tenant_id = ?", model.OrgTypeMainContractor, demoTenantUUID).Find(&targets)
		for _, org := range targets {
			orgs = append(orgs, map[string]interface{}{
				"id":   org.ID.String(),
				"name": org.Name,
				"type": string(org.Type),
			})
		}

	case strings.Contains(userRole, "CONTRACTOR"):
		// Contractor sees VENDOR orgs under them + own engineers
		var targets []model.Organization
		db.Where("type = ? AND parent_id = ? AND tenant_id = ?", model.OrgTypeVendor, user.OrganizationID, demoTenantUUID).Find(&targets)
		for _, org := range targets {
			orgs = append(orgs, map[string]interface{}{
				"id":   org.ID.String(),
				"name": org.Name,
				"type": string(org.Type),
			})
		}
		var engs []model.User
		db.Where("organization_id = ? AND role = ?", user.OrganizationID, model.UserRoleEngineer).Find(&engs)
		for _, eng := range engs {
			engineers = append(engineers, map[string]interface{}{
				"id":           eng.ID.String(),
				"username":     eng.Username,
				"display_name": eng.DisplayName,
				"role":         string(eng.Role),
			})
		}

	case strings.Contains(userRole, "VENDOR"):
		// Vendor sees only own engineers
		var engs []model.User
		db.Where("organization_id = ? AND role = ?", user.OrganizationID, model.UserRoleEngineer).Find(&engs)
		for _, eng := range engs {
			engineers = append(engineers, map[string]interface{}{
				"id":           eng.ID.String(),
				"username":     eng.Username,
				"display_name": eng.DisplayName,
				"role":         string(eng.Role),
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"organizations": orgs,
		"engineers":     engineers,
	})
}

// GetOrganizationEngineers returns engineers for a specific organization (from DB)
func (h *DemoHandlers) GetOrganizationEngineers(c *gin.Context) {
	orgID := c.Param("id")
	if orgID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID is required"})
		return
	}

	db, err := database.GetDB()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
		return
	}

	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		// Try resolving as legacy demo ID
		resolved, ok := demoOrgIDMap[orgID]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid organization ID"})
			return
		}
		orgUUID = resolved
	}

	var engineers []model.User
	db.Where("organization_id = ? AND role = ?", orgUUID, model.UserRoleEngineer).Find(&engineers)

	var list []map[string]interface{}
	for _, eng := range engineers {
		list = append(list, map[string]interface{}{
			"id":           eng.ID.String(),
			"username":     eng.Username,
			"display_name": eng.DisplayName,
			"role":         string(eng.Role),
			"org_id":       orgID,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"list":  list,
		"total": len(list),
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


