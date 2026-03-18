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
	// This is a placeholder implementation
	// In real implementation, you would:
	// 1. Create a work order with special type
	// 2. Link to device and user
	// 3. Set status to CLOSED
	// 4. Store transfer details in info JSONB

	return uuid.New(), fmt.Sprintf("TRANS-%s", time.Now().Format("20060102")), nil
}

// RegisterLeaseRoutes registers lease progress routes
func RegisterLeaseRoutes(router *gin.RouterGroup) {
	leases := router.Group("/leases")
	{
		leases.GET("/progress", GetLeaseProgress)
		leases.POST("/progress/update", UpdateLeaseProgress)
	}
}
