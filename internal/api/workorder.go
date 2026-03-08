package api

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

// CreateWorkOrder creates a new work order (STORE role only)
func CreateWorkOrder(c *gin.Context) {
	// Check permission - only STORE can create work orders
	userRole, _ := middleware.GetRole(c)
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
	userID, _ := middleware.GetUserID(c)
	orgID, _ := middleware.GetOrgID(c)
	tenantID, _ := middleware.GetTenantID(c)

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
	workOrder.Logs.AddLog(userID, userName, "create", "Work order created", 0, model.WorkOrderStatusPending)

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

	userRole, _ := middleware.GetRole(c)
	tenantID, _ := middleware.GetTenantID(c)
	orgID, _ := middleware.GetOrgID(c)

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

	userRole, _ := middleware.GetRole(c)
	tenantID, _ := middleware.GetTenantID(c)
	orgID, _ := middleware.GetOrgID(c)

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
	userRole, _ := middleware.GetRole(c)
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

	userID, _ := middleware.GetUserID(c)
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
	userRole, _ := middleware.GetRole(c)
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

	userID, _ := middleware.GetUserID(c)
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
	userRole, _ := middleware.GetRole(c)
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

	userID, _ := middleware.GetUserID(c)
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
