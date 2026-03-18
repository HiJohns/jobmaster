package api

import (
	"encoding/json"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/response"
)

// CreateLocationRequest represents the request to create a location
type CreateLocationRequest struct {
	Name        string             `json:"name" binding:"required"`
	Address     string             `json:"address"`
	Coordinates *model.GPSLocation `json:"coordinates,omitempty"`
	OrgID       string             `json:"org_id" binding:"required"`
	ParentID    *string            `json:"parent_id,omitempty"`
	Level       int                `json:"level"`
	Info        json.RawMessage    `json:"info,omitempty"`
}

// LocationResponse represents the location response
type LocationResponse struct {
	ID          uuid.UUID          `json:"id"`
	Name        string             `json:"name"`
	Address     string             `json:"address"`
	Coordinates *model.GPSLocation `json:"coordinates,omitempty"`
	OrgID       uuid.UUID          `json:"org_id"`
	ParentID    *uuid.UUID         `json:"parent_id,omitempty"`
	Level       int                `json:"level"`
	Info        json.RawMessage    `json:"info,omitempty"`
	CreatedAt   string             `json:"created_at"`
}

// CreateLocation creates a new location
func CreateLocation(c *gin.Context) {
	var req CreateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	orgID, err := uuid.Parse(req.OrgID)
	if err != nil {
		response.BadRequest(c, "invalid org_id format")
		return
	}

	var parentID *uuid.UUID
	if req.ParentID != nil {
		parsedParentID, err := uuid.Parse(*req.ParentID)
		if err != nil {
			response.BadRequest(c, "invalid parent_id format")
			return
		}
		parentID = &parsedParentID
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	location := model.Location{
		Name:        req.Name,
		Address:     req.Address,
		Coordinates: req.Coordinates,
		OrgID:       orgID,
		ParentID:    parentID,
		Level:       req.Level,
	}

	if req.Info != nil {
		location.Info = datatypes.JSON(req.Info)
	}

	if err := db.Create(&location).Error; err != nil {
		response.InternalServerError(c, "failed to create location: "+err.Error())
		return
	}

	response.Success(c, LocationResponse{
		ID:          location.ID,
		Name:        location.Name,
		Address:     location.Address,
		Coordinates: location.Coordinates,
		OrgID:       location.OrgID,
		ParentID:    location.ParentID,
		Level:       location.Level,
		Info:        json.RawMessage(location.Info),
		CreatedAt:   location.CreatedAt.Format(time.RFC3339),
	})
}

// ListLocations returns a list of locations
type ListLocationsRequest struct {
	OrgID string `form:"org_id"`
}

func ListLocations(c *gin.Context) {
	var req ListLocationsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "invalid query parameters")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	query := db.Model(&model.Location{})

	if req.OrgID != "" {
		if orgID, err := uuid.Parse(req.OrgID); err == nil {
			query = query.Where("org_id = ?", orgID)
		}
	}

	var locations []model.Location
	if err := query.Find(&locations).Error; err != nil {
		response.InternalServerError(c, "failed to fetch locations")
		return
	}

	var responseData []LocationResponse
	for _, location := range locations {
		responseData = append(responseData, LocationResponse{
			ID:          location.ID,
			Name:        location.Name,
			Address:     location.Address,
			Coordinates: location.Coordinates,
			OrgID:       location.OrgID,
			ParentID:    location.ParentID,
			Level:       location.Level,
			Info:        json.RawMessage(location.Info),
			CreatedAt:   location.CreatedAt.Format(time.RFC3339),
		})
	}

	response.Success(c, responseData)
}

// GetLocation returns a single location by ID
func GetLocation(c *gin.Context) {
	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid location id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var location model.Location
	if err := db.Where("id = ?", locationID).First(&location).Error; err != nil {
		response.NotFound(c, "location not found")
		return
	}

	response.Success(c, LocationResponse{
		ID:          location.ID,
		Name:        location.Name,
		Address:     location.Address,
		Coordinates: location.Coordinates,
		OrgID:       location.OrgID,
		ParentID:    location.ParentID,
		Level:       location.Level,
		Info:        json.RawMessage(location.Info),
		CreatedAt:   location.CreatedAt.Format(time.RFC3339),
	})
}

// UpdateLocationRequest represents the request to update a location
type UpdateLocationRequest struct {
	Name        string             `json:"name"`
	Address     string             `json:"address"`
	Coordinates *model.GPSLocation `json:"coordinates,omitempty"`
	ParentID    *string            `json:"parent_id,omitempty"`
	Info        json.RawMessage    `json:"info,omitempty"`
}

// UpdateLocation updates a location
func UpdateLocation(c *gin.Context) {
	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid location id")
		return
	}

	var req UpdateLocationRequest
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
		"name":    req.Name,
		"address": req.Address,
	}

	if req.Coordinates != nil {
		updates["coordinates"] = req.Coordinates
	}

	if req.ParentID != nil {
		if parentID, err := uuid.Parse(*req.ParentID); err == nil {
			updates["parent_id"] = parentID
		}
	}

	if req.Info != nil {
		updates["info"] = datatypes.JSON(req.Info)
	}

	if err := db.Model(&model.Location{}).Where("id = ?", locationID).Updates(updates).Error; err != nil {
		response.InternalServerError(c, "failed to update location")
		return
	}

	response.Success(c, gin.H{"message": "location updated successfully"})
}

// DeleteLocation deletes a location
func DeleteLocation(c *gin.Context) {
	locationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.BadRequest(c, "invalid location id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	if err := db.Delete(&model.Location{}, "id = ?", locationID).Error; err != nil {
		response.InternalServerError(c, "failed to delete location")
		return
	}

	response.Success(c, gin.H{"message": "location deleted successfully"})
}
