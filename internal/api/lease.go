package api

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/middleware"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/response"
)

// GetLeaseProgressRequest represents the request to get lease progress
type GetLeaseProgressRequest struct {
	UserID   string `form:"user_id"`
	DeviceID string `form:"device_id"`
}

// LeaseProgressResponse represents the lease progress response
type LeaseProgressResponse struct {
	UserID          uuid.UUID  `json:"user_id"`
	DeviceID        uuid.UUID  `json:"device_id"`
	PaidMonths      int        `json:"paid_months"`
	RemainingMonths int        `json:"remaining_months"`
	IsCompleted     bool       `json:"is_completed"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
}

// UpdateLeaseProgressRequest represents the request to update lease progress
type UpdateLeaseProgressRequest struct {
	UserID     string `json:"user_id" binding:"required"`
	DeviceID   string `json:"device_id" binding:"required"`
	PaidMonths int    `json:"paid_months" binding:"required,min=1"` // Number of months to add
}

// GetLeaseProgress returns the lease progress for a user and device
func GetLeaseProgress(c *gin.Context) {
	var req GetLeaseProgressRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	// Use current user if user_id is not provided
	userID := req.UserID
	if userID == "" {
		currentUserID, exists := middleware.GetUserID(c)
		if !exists {
			response.Unauthorized(c, "user not authenticated")
			return
		}
		userID = currentUserID.String()
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.BadRequest(c, "invalid user_id format")
		return
	}

	deviceUUID, err := uuid.Parse(req.DeviceID)
	if err != nil {
		response.BadRequest(c, "invalid device_id format")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	// Find or create progress record
	var progress model.UserAssetProgress
	result := db.Where("user_id = ? AND device_id = ?", userUUID, deviceUUID).First(&progress)

	if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
		response.InternalServerError(c, "failed to query progress")
		return
	}

	// If not found, create a new record with 0 months
	if result.Error == gorm.ErrRecordNotFound {
		progress = model.UserAssetProgress{
			UserID:     userUUID,
			DeviceID:   deviceUUID,
			PaidMonths: 0,
		}
		if err := db.Create(&progress).Error; err != nil {
			response.InternalServerError(c, "failed to create progress record")
			return
		}
	}

	remaining := 12 - progress.PaidMonths
	if remaining < 0 {
		remaining = 0
	}

	response.Success(c, LeaseProgressResponse{
		UserID:          progress.UserID,
		DeviceID:        progress.DeviceID,
		PaidMonths:      progress.PaidMonths,
		RemainingMonths: remaining,
		IsCompleted:     progress.CompletedAt != nil,
		StartedAt:       progress.StartedAt,
		CompletedAt:     progress.CompletedAt,
	})
}

// UpdateLeaseProgress updates the lease progress for a user and device
func UpdateLeaseProgress(c *gin.Context) {
	var req UpdateLeaseProgressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	userUUID, err := uuid.Parse(req.UserID)
	if err != nil {
		response.BadRequest(c, "invalid user_id format")
		return
	}

	deviceUUID, err := uuid.Parse(req.DeviceID)
	if err != nil {
		response.BadRequest(c, "invalid device_id format")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	// Use transaction for atomicity
	tx := db.Begin()
	if tx.Error != nil {
		response.InternalServerError(c, "failed to start transaction")
		return
	}

	// Find or create progress record
	var progress model.UserAssetProgress
	result := tx.Where("user_id = ? AND device_id = ?", userUUID, deviceUUID).First(&progress)

	if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
		tx.Rollback()
		response.InternalServerError(c, "failed to query progress")
		return
	}

	// If not found, create a new record
	if result.Error == gorm.ErrRecordNotFound {
		progress = model.UserAssetProgress{
			UserID:     userUUID,
			DeviceID:   deviceUUID,
			PaidMonths: 0,
		}
		now := time.Now()
		progress.StartedAt = &now
		if err := tx.Create(&progress).Error; err != nil {
			tx.Rollback()
			response.InternalServerError(c, "failed to create progress record")
			return
		}
	}

	// Update paid months
	oldMonths := progress.PaidMonths
	progress.PaidMonths = oldMonths + req.PaidMonths

	// Check if threshold reached (12 months)
	thresholdReached := false
	if oldMonths < 12 && progress.PaidMonths >= 12 {
		thresholdReached = true
		now := time.Now()
		progress.CompletedAt = &now
	}

	if err := tx.Save(&progress).Error; err != nil {
		tx.Rollback()
		response.InternalServerError(c, "failed to update progress")
		return
	}

	// Handle threshold if reached
	if thresholdReached {
		// 1. Update device status to SOLD
		if err := tx.Model(&model.Device{}).Where("id = ?", deviceUUID).Update("status", model.DeviceStatusRepairing).Error; err != nil {
			tx.Rollback()
			response.InternalServerError(c, "failed to update device status")
			return
		}

		// 2. Generate ownership transfer work order
		workOrderID, workOrderNo, err := generateOwnershipTransferWorkOrder(tx, userUUID, deviceUUID)
		if err != nil {
			tx.Rollback()
			response.InternalServerError(c, fmt.Sprintf("failed to generate ownership transfer order: %v", err))
			return
		}
		tx.Commit()

		response.Success(c, gin.H{
			"message":              "progress updated, threshold reached",
			"user_id":              userUUID,
			"device_id":            deviceUUID,
			"paid_months":          progress.PaidMonths,
			"is_threshold_reached": true,
			"ownership_order_id":   workOrderID,
			"ownership_order_no":   workOrderNo,
		})
		return
	}

	if err := tx.Commit().Error; err != nil {
		response.InternalServerError(c, "failed to commit transaction")
		return
	}

	remaining := 12 - progress.PaidMonths
	if remaining < 0 {
		remaining = 0
	}

	response.Success(c, gin.H{
		"message":              "progress updated",
		"user_id":              userUUID,
		"device_id":            deviceUUID,
		"paid_months":          progress.PaidMonths,
		"remaining_months":     remaining,
		"is_threshold_reached": false,
	})
}

// generateOwnershipTransferWorkOrder generates a special work order for ownership transfer
func generateOwnershipTransferWorkOrder(tx *gorm.DB, userID, deviceID uuid.UUID) (uuid.UUID, string, error) {
	now := time.Now()

	var device model.Device
	if err := tx.First(&device, "id = ?", deviceID).Error; err != nil {
		return uuid.Nil, "", fmt.Errorf("device not found: %w", err)
	}

	var user model.User
	if err := tx.First(&user, "id = ?", userID).Error; err != nil {
		return uuid.Nil, "", fmt.Errorf("user not found: %w", err)
	}

	orderID := uuid.New()
	orderNo := fmt.Sprintf("TRANS-%s-%s", now.Format("20060102"), orderID.String()[:8])

	workOrder := model.WorkOrder{
		ID:         orderID,
		OrderNo:    orderNo,
		TenantID:   user.TenantID,
		StoreID:    device.OrgID,
		CreatedBy:  userID,
		Status:     model.WorkOrderStatusClosed,
		EngineerID: &userID,
		ClosedAt:   &now,
		Info: model.WorkOrderInfo{
			Description:   "所有权转移 - 租满12个月赠送",
			EquipmentInfo: fmt.Sprintf("DeviceID: %s, SN: %s", deviceID.String(), device.SN),
			CategoryPath:  []string{"所有权转移"},
			BrandName:     device.Brand,
		},
		Logs: model.WorkOrderLogs{
			{
				Timestamp: now,
				UserID:    userID,
				UserName:  user.DisplayName,
				Action:    "ownership_transfer",
				Details:   fmt.Sprintf("租满12个月，设备 %s (%s) 所有权转移给用户 %s", device.Name, device.SN, user.DisplayName),
			},
		},
	}

	if err := tx.Create(&workOrder).Error; err != nil {
		return uuid.Nil, "", fmt.Errorf("failed to create ownership transfer work order: %w", err)
	}

	return orderID, orderNo, nil
}

// RegisterLeaseRoutes registers lease progress routes
func RegisterLeaseRoutes(router *gin.RouterGroup) {
	leases := router.Group("/leases")
	{
		leases.GET("/progress", GetLeaseProgress)
		leases.POST("/progress/update", UpdateLeaseProgress)
	}
}
