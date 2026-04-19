package api

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/response"
)

// ListAdminDivisionsRequest represents the request for listing admin divisions
type ListAdminDivisionsRequest struct {
	ParentID *string `form:"parent_id"` // Optional parent ID for hierarchical query
	Level    *int    `form:"level"`     // Optional level filter (1: province, 2: city, 3: district)
}

// ListAdminDivisionsResponse represents the response for admin divisions
type ListAdminDivisionsResponse struct {
	ID        string `json:"id"`
	Code      string `json:"code"`
	Name      string `json:"name"`
	Level     int    `json:"level"`
	Pinyin    string `json:"pinyin,omitempty"`
	Latitude  float64 `json:"latitude,omitempty"`
	Longitude float64 `json:"longitude,omitempty"`
}

// ListAdminDivisions returns hierarchical administrative divisions
// GET /api/v1/admin-divisions
func ListAdminDivisions(c *gin.Context) {
	var req ListAdminDivisionsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	query := db.Model(&model.AdminDivision{})

	// Apply level filter if provided
	if req.Level != nil && *req.Level > 0 && *req.Level <= 3 {
		query = query.Where("level = ?", *req.Level)
	}

	// Apply parent filter if provided
	if req.ParentID != nil && *req.ParentID != "" {
		parentID, err := uuid.Parse(*req.ParentID)
		if err != nil {
			response.BadRequest(c, "invalid parent_id")
			return
		}
		query = query.Where("parent_id = ?", parentID)
	} else if req.ParentID == nil {
		// If no parent specified, return top-level (provinces only)
		query = query.Where("level = 1")
	}

	// Order by sort_order and name
	query = query.Order("sort_order ASC, name ASC")

	var divisions []model.AdminDivision
	if err := query.Find(&divisions).Error; err != nil {
		response.InternalServerError(c, "failed to fetch divisions: "+err.Error())
		return
	}

	// Convert to response format
	responseData := make([]ListAdminDivisionsResponse, 0, len(divisions))
	for _, div := range divisions {
		resp := ListAdminDivisionsResponse{
			ID:   div.ID.String(),
			Code: div.Code,
			Name: div.Name,
			Level: div.Level,
			Pinyin: div.Pinyin,
		}
		if div.Latitude != 0 {
			resp.Latitude = div.Latitude
		}
		if div.Longitude != 0 {
			resp.Longitude = div.Longitude
		}
		responseData = append(responseData, resp)
	}

	response.Success(c, responseData)
}

// GetAdminDivision returns a specific admin division by ID
// GET /api/v1/admin-divisions/:id
func GetAdminDivision(c *gin.Context) {
	divisionID := c.Param("id")
	if divisionID == "" {
		response.BadRequest(c, "division id is required")
		return
	}

	divisionUUID, err := uuid.Parse(divisionID)
	if err != nil {
		response.BadRequest(c, "invalid division id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var division model.AdminDivision
	if err := db.First(&division, "id = ?", divisionUUID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "admin division not found")
		} else {
			response.InternalServerError(c, "failed to fetch division")
		}
		return
	}

	responseData := ListAdminDivisionsResponse{
		ID:        division.ID.String(),
		Code:      division.Code,
		Name:      division.Name,
		Level:     division.Level,
		Pinyin:    division.Pinyin,
		Latitude:  division.Latitude,
		Longitude: division.Longitude,
	}

	response.Success(c, responseData)
}
