package api

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/response"
	"jobmaster/pkg/utils"
)

// CreateDeviceRequest represents the request to create a device
type CreateDeviceRequest struct {
	SN         string             `json:"sn" binding:"required"`
	Name       string             `json:"name" binding:"required"`
	Model      string             `json:"model"`
	Brand      string             `json:"brand"`
	OrgID      string             `json:"org_id" binding:"required"`
	LocationID *string            `json:"location_id,omitempty"`
	Status     model.DeviceStatus `json:"status"`
	Info       json.RawMessage    `json:"info,omitempty"`
}

// DeviceResponse represents the device response
type DeviceResponse struct {
	ID         uuid.UUID          `json:"id"`
	SN         string             `json:"sn"`
	Name       string             `json:"name"`
	Model      string             `json:"model"`
	Brand      string             `json:"brand"`
	OrgID      uuid.UUID          `json:"org_id"`
	LocationID *uuid.UUID         `json:"location_id,omitempty"`
	Status     model.DeviceStatus `json:"status"`
	Info       json.RawMessage    `json:"info,omitempty"`
	CreatedAt  string             `json:"created_at"`
}

// CreateDevice creates a new device
func CreateDevice(c *gin.Context) {
	var req CreateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	// Parse UUIDs
	orgID, err := uuid.Parse(req.OrgID)
	if err != nil {
		response.BadRequest(c, "invalid org_id format")
		return
	}

	var locationID *uuid.UUID
	if req.LocationID != nil {
		parsedLocID, err := uuid.Parse(*req.LocationID)
		if err != nil {
			response.BadRequest(c, "invalid location_id format")
			return
		}
		locationID = &parsedLocID
	}

	// Set default status if not provided
	if req.Status == "" {
		req.Status = model.DeviceStatusActive
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	device := model.Device{
		SN:         req.SN,
		Name:       req.Name,
		Model:      req.Model,
		Brand:      req.Brand,
		OrgID:      orgID,
		LocationID: locationID,
		Status:     req.Status,
	}

	if req.Info != nil {
		device.Info = datatypes.JSON(req.Info)
	}

	if err := db.Create(&device).Error; err != nil {
		response.InternalServerError(c, "failed to create device: "+err.Error())
		return
	}

	response.Success(c, DeviceResponse{
		ID:         device.ID,
		SN:         device.SN,
		Name:       device.Name,
		Model:      device.Model,
		Brand:      device.Brand,
		OrgID:      device.OrgID,
		LocationID: device.LocationID,
		Status:     device.Status,
		Info:       json.RawMessage(device.Info),
		CreatedAt:  device.CreatedAt.Format(time.RFC3339),
	})
}

// ListDevices returns a list of devices with optional filtering
type ListDevicesRequest struct {
	OrgID      string             `form:"org_id"`
	LocationID string             `form:"location_id"`
	Status     model.DeviceStatus `form:"status"`
}

func ListDevices(c *gin.Context) {
	var req ListDevicesRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "invalid query parameters")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	query := db.Model(&model.Device{})

	// Apply filters
	if req.OrgID != "" {
		if orgID, err := uuid.Parse(req.OrgID); err == nil {
			query = query.Where("org_id = ?", orgID)
		}
	}

	if req.LocationID != "" {
		if locID, err := uuid.Parse(req.LocationID); err == nil {
			query = query.Where("location_id = ?", locID)
		}
	}

	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	var devices []model.Device
	if err := query.Find(&devices).Error; err != nil {
		response.InternalServerError(c, "failed to fetch devices")
		return
	}

	var responseData []DeviceResponse
	for _, device := range devices {
		responseData = append(responseData, DeviceResponse{
			ID:         device.ID,
			SN:         device.SN,
			Name:       device.Name,
			Model:      device.Model,
			Brand:      device.Brand,
			OrgID:      device.OrgID,
			LocationID: device.LocationID,
			Status:     device.Status,
			Info:       json.RawMessage(device.Info),
			CreatedAt:  device.CreatedAt.Format(time.RFC3339),
		})
	}

	response.Success(c, responseData)
}

// GetDevice returns a single device by ID
func GetDevice(c *gin.Context) {
	deviceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid device id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var device model.Device
	if err := db.Where("id = ?", deviceID).First(&device).Error; err != nil {
		response.NotFound(c, "device not found")
		return
	}

	response.Success(c, DeviceResponse{
		ID:         device.ID,
		SN:         device.SN,
		Name:       device.Name,
		Model:      device.Model,
		Brand:      device.Brand,
		OrgID:      device.OrgID,
		LocationID: device.LocationID,
		Status:     device.Status,
		Info:       json.RawMessage(device.Info),
		CreatedAt:  device.CreatedAt.Format(time.RFC3339),
	})
}

// GetDeviceBySN returns a device by serial number
func GetDeviceBySN(c *gin.Context) {
	sn := c.Param("sn")
	if sn == "" {
		response.BadRequest(c, "SN is required")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var device model.Device
	if err := db.Where("sn = ?", sn).First(&device).Error; err != nil {
		response.NotFound(c, "device not found")
		return
	}

	// Get organization details for the site
	var org model.Organization
	var siteName string
	if err := db.Where("id = ?", device.OrgID).First(&org).Error; err != nil {
		siteName = "Unknown Site"
	} else {
		siteName = org.Name
	}

	response.Success(c, gin.H{
		"id":          device.ID,
		"sn":          device.SN,
		"name":        device.Name,
		"model":       device.Model,
		"brand":       device.Brand,
		"org_id":      device.OrgID,
		"location_id": device.LocationID,
		"status":      device.Status,
		"site_name":   siteName,
		"info":        json.RawMessage(device.Info),
		"created_at":  device.CreatedAt.Format(time.RFC3339),
	})
}

// UpdateDeviceRequest represents the request to update a device
type UpdateDeviceRequest struct {
	Name       string             `json:"name"`
	Model      string             `json:"model"`
	Brand      string             `json:"brand"`
	LocationID *string            `json:"location_id,omitempty"`
	Status     model.DeviceStatus `json:"status"`
	Info       json.RawMessage    `json:"info,omitempty"`
}

// UpdateDevice updates a device
func UpdateDevice(c *gin.Context) {
	deviceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid device id")
		return
	}

	var req UpdateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	updates := map[string]interface{}{
		"name":   req.Name,
		"model":  req.Model,
		"brand":  req.Brand,
		"status": req.Status,
	}

	if req.LocationID != nil {
		if locID, err := uuid.Parse(*req.LocationID); err == nil {
			updates["location_id"] = locID
		}
	}

	if req.Info != nil {
		updates["info"] = req.Info
	}

	if err := db.Model(&model.Device{}).Where("id = ?", deviceID).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "failed to update device")
		return
	}

	response.Success(c, gin.H{"message": "device updated successfully"})
}

// DeleteDevice deletes a device
func DeleteDevice(c *gin.Context) {
	deviceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid device id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	if err := db.Delete(&model.Device{}, "id = ?", deviceID).Error; err != nil {
		response.InternalServerError(c, "failed to delete device")
		return
	}

	response.Success(c, gin.H{"message": "device deleted successfully"})
}

func GenerateQRCode(c *gin.Context) {
	deviceID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid device id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var device model.Device
	if err := db.Where("id = ?", deviceID).First(&device).Error; err != nil {
		response.NotFound(c, "device not found")
		return
	}

	secretKey := utils.GetEnv("QR_SECRET_KEY", "jobmaster-default-secret-key-32ch")
	generator := utils.NewQRCodeGenerator(secretKey)

	token, expiresAt, err := generator.GenerateToken(deviceID)
	if err != nil {
		response.InternalServerError(c, "failed to generate QR token: "+err.Error())
		return
	}

	qrURL := fmt.Sprintf("/scan?token=%s", token)

	response.Success(c, gin.H{
		"device_id":  deviceID,
		"sn":         device.SN,
		"qr_url":     qrURL,
		"expires_at": expiresAt.Format(time.RFC3339),
		"qr_token":   token,
	})
}
