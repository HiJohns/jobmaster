package api

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/middleware"
	"jobmaster/internal/model"
	"jobmaster/internal/service"
	"jobmaster/pkg/database"
	"jobmaster/pkg/permissions"
	"jobmaster/pkg/response"
	"jobmaster/pkg/utils"
)

// OrderNoGenerator is the global order number generator
var OrderNoGenerator = utils.NewOrderNoGenerator()

// OrderService is the global order service instance
var OrderService = service.NewOrderService()

// getCurrentUserName retrieves the current user's display name from database
// Returns user ID string as fallback if database lookup fails
func getCurrentUserName(c *gin.Context, userID uuid.UUID) string {
	db, err := database.GetDB()
	if err != nil {
		return userID.String()[:8] // Fallback to user ID prefix
	}

	var user model.User
	if err := db.Select("display_name", "username").First(&user, "id = ?", userID).Error; err != nil {
		return userID.String()[:8] // Fallback to user ID prefix
	}

	// Prefer display name, fallback to username
	if user.DisplayName != "" {
		return user.DisplayName
	}
	return user.Username
}

// CreateWorkOrderRequest represents the request to create a work order
type CreateWorkOrderRequest struct {
	Description   string             `json:"description" binding:"required"`
	EquipmentInfo string             `json:"equipment_info"`
	ContactName   string             `json:"contact_name"`
	ContactPhone  string             `json:"contact_phone"`
	IsUrgent      bool               `json:"is_urgent"`
	PhotoURLs     []string           `json:"photo_urls"`
	Location      *model.GPSLocation `json:"location"`
}

// WorkOrderResponse represents the work order response
type WorkOrderResponse struct {
	ID        uuid.UUID           `json:"id"`
	OrderNo   string              `json:"order_no"`
	Status    string              `json:"status"`
	StoreID   uuid.UUID           `json:"store_id"`
	CreatedBy uuid.UUID           `json:"created_by"`
	Info      model.WorkOrderInfo `json:"info"`
	Logs      model.WorkOrderLogs `json:"logs"`
	CreatedAt time.Time           `json:"created_at"`
	UpdatedAt time.Time           `json:"updated_at"`
}

// ListWorkOrdersRequest represents the request to list work orders
type ListWorkOrdersRequest struct {
	Status    *model.WorkOrderStatus `form:"status"`
	StartDate *time.Time             `form:"start_date"`
	EndDate   *time.Time             `form:"end_date"`
	Page      int                    `form:"page,default=1"`
	PageSize  int                    `form:"page_size,default=20"`
}

// DispatchWorkOrderRequest represents the request to dispatch a work order
type DispatchWorkOrderRequest struct {
	VendorID   *uuid.UUID `json:"vendor_id"`
	EngineerID *uuid.UUID `json:"engineer_id"`
}

// AcceptWorkOrderRequest represents the request to accept a work order
type AcceptWorkOrderRequest struct {
	ScheduledAt time.Time `json:"scheduled_at" binding:"required"`
}

// RejectWorkOrderRequest represents the request to reject a work order
type RejectWorkOrderRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// ReserveWorkOrderRequest represents the request to reserve appointment time
type ReserveWorkOrderRequest struct {
	AppointedAt time.Time `json:"appointed_at" binding:"required"`
}

// ArriveWorkOrderRequest represents the request to check in at work site
type ArriveWorkOrderRequest struct {
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
}

// FinishWorkOrderRequest represents the request to finish work
type FinishWorkOrderRequest struct {
	Description string   `json:"description" binding:"required"`
	PhotoURLs   []string `json:"photo_urls"`
	LaborFee    float64  `json:"labor_fee"`
	MaterialFee float64  `json:"material_fee"`
	OtherFee    float64  `json:"other_fee"`
}

// ListMyTasksRequest represents the request to list engineer/vendor tasks
type ListMyTasksRequest struct {
	StartDate *time.Time `form:"start_date"`
	EndDate   *time.Time `form:"end_date"`
	Keyword   string     `form:"keyword"`
	Status    *int       `form:"status"`
	Page      int        `form:"page,default=1"`
	PageSize  int        `form:"page_size,default=20"`
}

// TaskStatisticsResponse represents the task statistics by status
type TaskStatisticsResponse struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

// MyTaskResponse represents a task in the engineer/vendor task list
type MyTaskResponse struct {
	ID            uuid.UUID           `json:"id"`
	OrderNo       string              `json:"order_no"`
	Status        string              `json:"status"`
	AppointedAt   *time.Time          `json:"appointed_at,omitempty"`
	AddressDetail string              `json:"address_detail,omitempty"`
	StoreName     string              `json:"store_name,omitempty"`
	Info          model.WorkOrderInfo `json:"info"`
	CreatedAt     time.Time           `json:"created_at"`
}

// OrganizationBrief represents brief organization info in detail response
type OrganizationBrief struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Type string    `json:"type"`
}

// UserBrief represents brief user info in detail response
type UserBrief struct {
	ID          uuid.UUID `json:"id"`
	DisplayName string    `json:"display_name"`
	Phone       string    `json:"phone,omitempty"`
}

// WorkOrderDetailResponse represents the detailed work order response
type WorkOrderDetailResponse struct {
	ID        uuid.UUID `json:"id"`
	OrderNo   string    `json:"order_no"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Organization info
	Store          OrganizationBrief  `json:"store"`
	Vendor         *OrganizationBrief `json:"vendor,omitempty"`
	MainContractor *OrganizationBrief `json:"main_contractor,omitempty"`

	// People info
	Creator  UserBrief  `json:"creator"`
	Engineer *UserBrief `json:"engineer,omitempty"`

	// Contact info (from info JSONB)
	ContactName  string `json:"contact_name,omitempty"`
	ContactPhone string `json:"contact_phone,omitempty"`

	// Location
	AddressDetail string             `json:"address_detail,omitempty"`
	Coordinates   *model.GPSLocation `json:"coordinates,omitempty"`

	// Equipment & description
	Description   string   `json:"description"`
	EquipmentInfo string   `json:"equipment_info,omitempty"`
	CategoryPath  []string `json:"category_path,omitempty"`
	BrandName     string   `json:"brand_name,omitempty"`
	PhotoURLs     []string `json:"photo_urls,omitempty"`
	IsUrgent      bool     `json:"is_urgent"`

	// Scheduling
	AppointedAt       *time.Time `json:"appointed_at,omitempty"`
	ScheduledAt       *time.Time `json:"scheduled_at,omitempty"`
	ArrivedAt         *time.Time `json:"arrived_at,omitempty"`
	StartedAt         *time.Time `json:"started_at,omitempty"`
	FinishedAt        *time.Time `json:"finished_at,omitempty"`
	ClosedAt          *time.Time `json:"closed_at,omitempty"`
	ObservingDeadline *time.Time `json:"observing_deadline,omitempty"`

	// Settlement (hidden for STORE role)
	LaborFee         float64  `json:"labor_fee,omitempty"`
	MaterialFee      float64  `json:"material_fee,omitempty"`
	OtherFee         float64  `json:"other_fee,omitempty"`
	TotalFee         float64  `json:"total_fee,omitempty"`
	SettlementAmount *float64 `json:"settlement_amount,omitempty"`
	SettlementNote   string   `json:"settlement_note,omitempty"`

	// Work records & logs
	WorkRecords []WorkRecordResponse `json:"work_records,omitempty"`
	Logs        model.WorkOrderLogs  `json:"logs"`
}

// WorkRecordResponse represents a work record entry
type WorkRecordResponse struct {
	Timestamp   time.Time `json:"timestamp"`
	Type        string    `json:"type"`
	Description string    `json:"description"`
	PhotoURLs   []string  `json:"photo_urls,omitempty"`
}

// CreateWorkOrder creates a new work order (STORE role only)
func CreateWorkOrder(c *gin.Context) {
	// Check permission - only STORE can create work orders
	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	if model.UserRole(userRole) != model.UserRoleStore {
		response.Forbidden(c, "only store can create work orders")
		return
	}

	var req CreateWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	// Get user info from context
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}
	tenantID, ok := middleware.GetTenantID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: tenant not found")
		return
	}

	// Generate order number
	orderNo, err := OrderNoGenerator.Generate(tenantID, orgID)
	if err != nil {
		response.InternalServerError(c, "failed to generate order number")
		return
	}

	// Build work order info
	info := model.WorkOrderInfo{
		Description:   req.Description,
		EquipmentInfo: req.EquipmentInfo,
		ContactName:   req.ContactName,
		ContactPhone:  req.ContactPhone,
		IsUrgent:      req.IsUrgent,
		PhotoURLs:     req.PhotoURLs,
		Location:      req.Location,
	}

	workOrder := model.WorkOrder{
		OrderNo:   orderNo,
		TenantID:  tenantID,
		StoreID:   orgID,
		CreatedBy: userID,
		Status:    model.WorkOrderStatusPending,
		Info:      info,
		Logs:      make(model.WorkOrderLogs, 0),
	}

	// Get user name for audit log
	userName := getCurrentUserName(c, userID)

	// Add creation log
	workOrder.Logs.AddLog(userID, userName, model.LogActionCreate, "Work order created", 0, model.WorkOrderStatusPending)

	if err := db.Create(&workOrder).Error; err != nil {
		response.InternalServerError(c, fmt.Errorf("failed to create work order: %w", err).Error())
		return
	}

	response.Success(c, toWorkOrderResponse(&workOrder))
}

// ListWorkOrders returns a paginated list of work orders based on role
func ListWorkOrders(c *gin.Context) {
	var req ListWorkOrdersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "invalid query parameters: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	tenantID, ok := middleware.GetTenantID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: tenant not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}

	// Build query based on role
	query := db.Model(&model.WorkOrder{})

	switch model.UserRole(userRole) {
	case model.UserRoleStore:
		// Store can only see their own store's work orders
		query = query.Scopes(model.TenantScope(tenantID), model.StoreScope(orgID))

	case model.UserRoleBrandHQ, model.UserRoleMainContractor:
		// HQ and MainContractor can see all work orders in tenant
		query = query.Scopes(model.TenantScope(tenantID))

	case model.UserRoleVendor, model.UserRoleEngineer:
		// Vendor and Engineer return empty list in this version
		response.Success(c, gin.H{
			"total": 0,
			"page":  req.Page,
			"data":  []WorkOrderResponse{},
		})
		return

	default:
		response.Forbidden(c, "invalid role")
		return
	}

	// Apply filters
	if req.Status != nil {
		query = query.Scopes(model.StatusScope(*req.Status))
	}
	if req.StartDate != nil && req.EndDate != nil {
		query = query.Scopes(model.CreatedAtScope(*req.StartDate, *req.EndDate))
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.InternalServerError(c, fmt.Errorf("failed to count work orders: %w", err).Error())
		return
	}

	// Paginate
	var workOrders []model.WorkOrder
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&workOrders).Error; err != nil {
		response.InternalServerError(c, fmt.Errorf("failed to fetch work orders: %w", err).Error())
		return
	}

	// Convert to response
	var responseData []WorkOrderResponse
	for _, wo := range workOrders {
		responseData = append(responseData, toWorkOrderResponse(&wo))
	}

	response.Success(c, gin.H{
		"total": total,
		"page":  req.Page,
		"data":  responseData,
	})
}

// GetWorkOrder retrieves a single work order by ID
func GetWorkOrder(c *gin.Context) {
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	tenantID, ok := middleware.GetTenantID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: tenant not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}

	var workOrder model.WorkOrder
	query := db.Where("id = ? AND tenant_id = ?", orderID, tenantID)

	// Apply role-based scope
	if model.UserRole(userRole) == model.UserRoleStore {
		query = query.Where("store_id = ?", orgID)
	}

	if err := query.First(&workOrder).Error; err != nil {
		response.NotFound(c, "work order not found")
		return
	}

	response.Success(c, toWorkOrderResponse(&workOrder))
}

// DispatchWorkOrder dispatches a work order to vendor/engineer (MAIN_CONTRACTOR only)
func DispatchWorkOrder(c *gin.Context) {
	// Check permission
	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	if !permissions.HasPermission(&model.User{Role: model.UserRole(userRole)}, permissions.ActionOrderDispatch) {
		response.Forbidden(c, "insufficient permissions")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	var req DispatchWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	if req.VendorID == nil && req.EngineerID == nil {
		response.BadRequest(c, "must specify either vendor_id or engineer_id")
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	userName := getCurrentUserName(c, userID)

	order, err := OrderService.Dispatch(c, orderID, userID, userName, req.VendorID, req.EngineerID)
	if err != nil {
		if err == model.ErrInvalidStateTransition {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalServerError(c, fmt.Errorf("failed to dispatch work order: %w", err).Error())
		return
	}

	response.Success(c, toWorkOrderResponse(order))
}

// AcceptWorkOrder accepts a dispatched work order (VENDOR/ENGINEER only)
func AcceptWorkOrder(c *gin.Context) {
	// Check permission
	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	if !permissions.HasPermission(&model.User{Role: model.UserRole(userRole)}, permissions.ActionOrderExecute) {
		response.Forbidden(c, "insufficient permissions")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	var req AcceptWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	userName := getCurrentUserName(c, userID)

	order, err := OrderService.Accept(c, orderID, userID, userName, req.ScheduledAt)
	if err != nil {
		if err == model.ErrInvalidStateTransition {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalServerError(c, fmt.Errorf("failed to accept work order: %w", err).Error())
		return
	}

	response.Success(c, toWorkOrderResponse(order))
}

// RejectWorkOrder rejects a dispatched work order (VENDOR/ENGINEER only)
func RejectWorkOrder(c *gin.Context) {
	// Check permission
	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	if !permissions.HasPermission(&model.User{Role: model.UserRole(userRole)}, permissions.ActionOrderExecute) {
		response.Forbidden(c, "insufficient permissions")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	var req RejectWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	userName := getCurrentUserName(c, userID)

	order, err := OrderService.Reject(c, orderID, userID, userName, req.Reason)
	if err != nil {
		if err == model.ErrInvalidStateTransition {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalServerError(c, fmt.Errorf("failed to reject work order: %w", err).Error())
		return
	}

	response.Success(c, toWorkOrderResponse(order))
}

// toWorkOrderResponse converts model to response
func toWorkOrderResponse(wo *model.WorkOrder) WorkOrderResponse {
	return WorkOrderResponse{
		ID:        wo.ID,
		OrderNo:   wo.OrderNo,
		Status:    wo.Status.String(),
		StoreID:   wo.StoreID,
		CreatedBy: wo.CreatedBy,
		Info:      wo.Info,
		Logs:      wo.Logs,
		CreatedAt: wo.CreatedAt,
		UpdatedAt: wo.UpdatedAt,
	}
}

// ListMyTasks returns tasks for engineer/vendor with calendar filtering and fuzzy search
func ListMyTasks(c *gin.Context) {
	var req ListMyTasksRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "invalid query parameters: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}
	tenantID, ok := middleware.GetTenantID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: tenant not found")
		return
	}

	// Only VENDOR and ENGINEER can use this endpoint
	role := model.UserRole(userRole)
	if role != model.UserRoleVendor && role != model.UserRoleEngineer {
		response.Forbidden(c, "only vendor and engineer can access task list")
		return
	}

	// Validate and limit keyword length
	if len(req.Keyword) > 50 {
		req.Keyword = req.Keyword[:50]
	}

	query := db.Model(&model.WorkOrder{}).Scopes(model.TenantScope(tenantID))

	// Apply role-based filtering
	if role == model.UserRoleEngineer {
		query = query.Scopes(model.EngineerScope(userID))
	} else if role == model.UserRoleVendor {
		query = query.Scopes(model.VendorScope(orgID))
	}

	// Apply calendar date range filter on appointed_at
	if req.StartDate != nil && req.EndDate != nil {
		query = query.Scopes(model.AppointedAtScope(*req.StartDate, *req.EndDate))
	}

	// Apply status filter
	if req.Status != nil {
		query = query.Where("status = ?", *req.Status)
	}

	// Apply fuzzy search on order_no and store name
	if req.Keyword != "" {
		// Join with organizations table to search store name
		query = query.Joins("LEFT JOIN organizations ON organizations.id = workorders.store_id").
			Where("workorders.order_no ILIKE ? OR organizations.name ILIKE ?",
				"%"+req.Keyword+"%", "%"+req.Keyword+"%")
	}

	// Preload store information
	query = query.Preload("Store")

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.InternalServerError(c, fmt.Errorf("failed to count tasks: %w", err).Error())
		return
	}

	// Paginate
	var workOrders []model.WorkOrder
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("appointed_at ASC NULLS LAST, created_at DESC").
		Offset(offset).Limit(req.PageSize).Find(&workOrders).Error; err != nil {
		response.InternalServerError(c, fmt.Errorf("failed to fetch tasks: %w", err).Error())
		return
	}

	// Convert to response
	var responseData []MyTaskResponse
	for _, wo := range workOrders {
		resp := MyTaskResponse{
			ID:            wo.ID,
			OrderNo:       wo.OrderNo,
			Status:        wo.Status.String(),
			AppointedAt:   wo.AppointedAt,
			AddressDetail: wo.AddressDetail,
			Info:          wo.Info,
			CreatedAt:     wo.CreatedAt,
		}
		if wo.Store.ID != uuid.Nil {
			resp.StoreName = wo.Store.Name
		}
		responseData = append(responseData, resp)
	}

	response.Success(c, gin.H{
		"total": total,
		"page":  req.Page,
		"data":  responseData,
	})
}

// GetTaskStatistics returns the count of tasks grouped by status for current user
func GetTaskStatistics(c *gin.Context) {
	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}
	tenantID, ok := middleware.GetTenantID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: tenant not found")
		return
	}

	// Only VENDOR and ENGINEER can use this endpoint
	role := model.UserRole(userRole)
	if role != model.UserRoleVendor && role != model.UserRoleEngineer {
		response.Forbidden(c, "only vendor and engineer can access task statistics")
		return
	}

	query := db.Model(&model.WorkOrder{}).
		Select("status, COUNT(*) as count").
		Scopes(model.TenantScope(tenantID))

	// Apply role-based filtering
	if role == model.UserRoleEngineer {
		query = query.Where("engineer_id = ?", userID)
	} else if role == model.UserRoleVendor {
		query = query.Where("vendor_id = ?", orgID)
	}

	// Group by status
	var results []struct {
		Status int   `json:"status"`
		Count  int64 `json:"count"`
	}
	if err := query.Group("status").Scan(&results).Error; err != nil {
		response.InternalServerError(c, fmt.Errorf("failed to get task statistics: %w", err).Error())
		return
	}

	// Convert to response format
	statistics := make([]TaskStatisticsResponse, 0, len(results))
	for _, r := range results {
		status := model.WorkOrderStatus(r.Status)
		statistics = append(statistics, TaskStatisticsResponse{
			Status: status.String(),
			Count:  r.Count,
		})
	}

	response.Success(c, statistics)
}

// ReserveWorkOrder sets the appointment time for a dispatched work order (VENDOR/ENGINEER only)
func ReserveWorkOrder(c *gin.Context) {
	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	if !permissions.HasPermission(&model.User{Role: model.UserRole(userRole)}, permissions.ActionOrderExecute) {
		response.Forbidden(c, "insufficient permissions")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	var req ReserveWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}
	userName := getCurrentUserName(c, userID)

	order, err := OrderService.Reserve(c, orderID, userID, orgID, userName, req.AppointedAt)
	if err != nil {
		if err == model.ErrInvalidStateTransition {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalServerError(c, fmt.Errorf("failed to reserve work order: %w", err).Error())
		return
	}

	response.Success(c, toWorkOrderResponse(order))
}

// ArriveWorkOrder checks in at the work site (ENGINEER only)
func ArriveWorkOrder(c *gin.Context) {
	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	if model.UserRole(userRole) != model.UserRoleEngineer {
		response.Forbidden(c, "only engineer can check in")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	var req ArriveWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}
	userName := getCurrentUserName(c, userID)

	order, err := OrderService.Arrive(c, orderID, userID, orgID, userName, req.Latitude, req.Longitude)
	if err != nil {
		if err == model.ErrInvalidStateTransition {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalServerError(c, fmt.Errorf("failed to check in: %w", err).Error())
		return
	}

	response.Success(c, toWorkOrderResponse(order))
}

// FinishWorkOrder completes the work and uploads completion info (ENGINEER only)
func FinishWorkOrder(c *gin.Context) {
	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	if model.UserRole(userRole) != model.UserRoleEngineer {
		response.Forbidden(c, "only engineer can finish work")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	var req FinishWorkOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}
	userName := getCurrentUserName(c, userID)

	order, err := OrderService.Finish(c, orderID, userID, orgID, userName, req.Description, req.PhotoURLs, req.LaborFee, req.MaterialFee, req.OtherFee)
	if err != nil {
		if err == model.ErrInvalidStateTransition {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalServerError(c, fmt.Errorf("failed to finish work order: %w", err).Error())
		return
	}

	response.Success(c, toWorkOrderResponse(order))
}

// GetWorkOrderDetail retrieves detailed work order information with role-based data masking
func GetWorkOrderDetail(c *gin.Context) {
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid order id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	userRole, ok := middleware.GetRole(c)
	if !ok {
		response.Unauthorized(c, "invalid token: role not found")
		return
	}
	tenantID, ok := middleware.GetTenantID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: tenant not found")
		return
	}
	orgID, ok := middleware.GetOrgID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: organization not found")
		return
	}
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Unauthorized(c, "invalid token: user id not found")
		return
	}

	role := model.UserRole(userRole)

	var workOrder model.WorkOrder
	query := db.Preload("Store").Preload("Vendor").Preload("Engineer").Preload("Creator")

	// Apply tenant scope
	query = query.Where("tenant_id = ? AND id = ?", tenantID, orderID)

	// Apply role-based access control
	switch role {
	case model.UserRoleStore:
		// Store can only see their own orders
		query = query.Where("store_id = ?", orgID)
	case model.UserRoleVendor:
		// Vendor can only see orders assigned to them
		query = query.Where("vendor_id = ?", orgID)
	case model.UserRoleEngineer:
		// Engineer can only see orders assigned to them
		query = query.Where("engineer_id = ?", userID)
	case model.UserRoleBrandHQ, model.UserRoleMainContractor:
		// HQ and MainContractor can see all orders in tenant
		// No additional filter needed
	default:
		response.Forbidden(c, "invalid role")
		return
	}

	if err := query.First(&workOrder).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "work order not found")
			return
		}
		response.InternalServerError(c, fmt.Errorf("failed to fetch work order: %w", err).Error())
		return
	}

	// Build detailed response with role-based masking
	detail := buildWorkOrderDetail(&workOrder, role)

	response.Success(c, detail)
}

// buildWorkOrderDetail constructs the detailed response with role-based masking
func buildWorkOrderDetail(wo *model.WorkOrder, role model.UserRole) WorkOrderDetailResponse {
	detail := WorkOrderDetailResponse{
		ID:        wo.ID,
		OrderNo:   wo.OrderNo,
		Status:    wo.Status.String(),
		CreatedAt: wo.CreatedAt,
		UpdatedAt: wo.UpdatedAt,

		// Store info
		Store: OrganizationBrief{
			ID:   wo.Store.ID,
			Name: wo.Store.Name,
			Type: string(wo.Store.Type),
		},

		// Creator info
		Creator: UserBrief{
			ID:          wo.Creator.ID,
			DisplayName: wo.Creator.DisplayName,
			Phone:       wo.Creator.Phone,
		},

		// Contact info
		ContactName:  wo.Info.ContactName,
		ContactPhone: wo.Info.ContactPhone,

		// Location
		AddressDetail: wo.AddressDetail,
		Coordinates:   wo.Coordinates,

		// Equipment & description
		Description:   wo.Info.Description,
		EquipmentInfo: wo.Info.EquipmentInfo,
		CategoryPath:  wo.Info.CategoryPath,
		BrandName:     wo.Info.BrandName,
		PhotoURLs:     wo.Info.PhotoURLs,
		IsUrgent:      wo.Info.IsUrgent,

		// Scheduling
		AppointedAt:       wo.AppointedAt,
		ScheduledAt:       wo.ScheduledAt,
		ArrivedAt:         wo.ArrivedAt,
		StartedAt:         wo.StartedAt,
		FinishedAt:        wo.FinishedAt,
		ClosedAt:          wo.ClosedAt,
		ObservingDeadline: wo.ObservingDeadline,

		// Logs
		Logs: wo.Logs,
	}

	// Vendor info (if assigned)
	if wo.Vendor != nil {
		detail.Vendor = &OrganizationBrief{
			ID:   wo.Vendor.ID,
			Name: wo.Vendor.Name,
			Type: string(wo.Vendor.Type),
		}
	}

	// Engineer info (if assigned)
	if wo.Engineer != nil {
		detail.Engineer = &UserBrief{
			ID:          wo.Engineer.ID,
			DisplayName: wo.Engineer.DisplayName,
			Phone:       wo.Engineer.Phone,
		}
	}

	// Fee information - MASKED for STORE role
	// Only VENDOR, ENGINEER, MAIN_CONTRACTOR, and BRAND_HQ can see fees
	if role != model.UserRoleStore {
		detail.LaborFee = wo.LaborFee
		detail.MaterialFee = wo.MaterialFee
		detail.OtherFee = wo.OtherFee
		detail.TotalFee = wo.LaborFee + wo.MaterialFee + wo.OtherFee
		detail.SettlementAmount = wo.SettlementAmount
		detail.SettlementNote = wo.SettlementNote
	}

	// Build work records from logs
	detail.WorkRecords = extractWorkRecords(wo.Logs)

	return detail
}

// extractWorkRecords extracts work-related records from audit logs
func extractWorkRecords(logs model.WorkOrderLogs) []WorkRecordResponse {
	var records []WorkRecordResponse

	for _, log := range logs {
		record := WorkRecordResponse{
			Timestamp: log.Timestamp,
		}

		// Map action types to work record types using model constants
		switch log.Action {
		case model.LogActionStatusChangeToWorking:
			record.Type = "start_work"
			record.Description = "Started working"
		case model.LogActionStatusChangeToFinished:
			record.Type = "finish_work"
			record.Description = log.Details
		case model.LogActionArrive:
			record.Type = "arrival"
			record.Description = "Arrived at site"
		case model.LogActionAccept:
			record.Type = "appointment"
			record.Description = log.Details
		default:
			continue // Skip non-work records
		}

		records = append(records, record)
	}

	return records
}
