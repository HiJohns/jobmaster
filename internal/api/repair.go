package api

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/response"
)

// SubmitRepairRequest represents the repair submission request
type SubmitRepairRequest struct {
	DeviceSN         string   `json:"device_sn" binding:"required"`
	FaultDescription string   `json:"fault_description" binding:"required"`
	PhotoURLs        []string `json:"photo_urls"`
	ContactPhone     string   `json:"contact_phone"`
}

// SubmitRepairResponse represents the response after submitting repair
type SubmitRepairResponse struct {
	WorkOrderID uuid.UUID `json:"work_order_id"`
	OrderNo     string    `json:"order_no"`
}

// generateWorkOrderNo generates order number in format: WO-YYYYMMDD-XXXX
func generateWorkOrderNo(db *gorm.DB, tenantID uuid.UUID) (string, error) {
	prefix := fmt.Sprintf("WO-%s-", time.Now().Format("20060102"))

	// Query max sequence number for today
	var count int64
	dbErr := db.Model(&model.WorkOrder{}).
		Where("tenant_id = ? AND order_no LIKE ?", tenantID, prefix+"%").
		Count(&count)

	if dbErr.Error != nil {
		return "", dbErr.Error
	}

	// Generate new sequence number
	sequence := count + 1
	return fmt.Sprintf("%s%04d", prefix, sequence), nil
}

// SubmitRepair creates a work order from device repair request
func SubmitRepair(c *gin.Context) {
	// 验证输入
	var req SubmitRepairRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid request: "+err.Error())
		return
	}

	// 获取数据库连接
	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "Database connection failed")
		return
	}

	// 从 JWT 获取当前用户
	userVal, exists := c.Get("user_id")
	if !exists {
		response.Unauthorized(c, "User not authenticated")
		return
	}
	userID, ok := userVal.(uuid.UUID)
	if !ok {
		response.InternalServerError(c, "Invalid user ID format")
		return
	}

	// 查询用户完整信息
	var user model.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		response.NotFound(c, "User not found")
		return
	}

	// 1. 资产校验 - 查询设备
	var device model.Device
	if err := db.Where("sn = ?", req.DeviceSN).First(&device).Error; err != nil {
		response.NotFound(c, "Device not found with SN: "+req.DeviceSN)
		return
	}

	// 2. 检查设备状态（只有 ACTIVE 或 BROKEN 才能报修）
	if device.Status != model.DeviceStatusActive && device.Status != model.DeviceStatusBroken {
		response.BadRequest(c, "Device cannot be repaired, status: "+string(device.Status))
		return
	}

	// 3. 事务处理：创建工单 + 更新设备状态
	var workOrder model.WorkOrder
	errFunc := db.Transaction(func(tx *gorm.DB) error {
		// 生成工单编号
		orderNo, err := generateWorkOrderNo(tx, user.TenantID)
		if err != nil {
			return fmt.Errorf("failed to generate order number: %w", err)
		}

		// 创建工单信息
		workOrderInfo := model.WorkOrderInfo{
			Description:   req.FaultDescription,
			PhotoURLs:     req.PhotoURLs,
			ContactName:   user.DisplayName,
			ContactPhone:  req.ContactPhone,
			EquipmentInfo: fmt.Sprintf("%s %s (SN: %s)", device.Name, device.Model, device.SN),
			BrandName:     device.Brand,
		}

		// 创建工单
		workOrder = model.WorkOrder{
			OrderNo:   orderNo,
			TenantID:  user.TenantID,
			StoreID:   device.OrgID, // use device org as store_id
			CreatedBy: userID,
			Status:    model.WorkOrderStatusPending,
			Info:      workOrderInfo,
		}

		if err := tx.Create(&workOrder).Error; err != nil {
			return fmt.Errorf("failed to create work order: %w", err)
		}

		// 更新设备状态为 REPAIRING
		if err := tx.Model(&device).Update("status", model.DeviceStatusRepairing).Error; err != nil {
			return fmt.Errorf("failed to update device status: %w", err)
		}

		return nil
	})

	if errFunc != nil {
		response.InternalServerError(c, "Transaction failed: "+errFunc.Error())
		return
	}

	// 返回结果
	response.Success(c, SubmitRepairResponse{
		WorkOrderID: workOrder.ID,
		OrderNo:     workOrder.OrderNo,
	})
}
