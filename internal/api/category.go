package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/middleware"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
	"jobmaster/pkg/response"
)

// CreateCategoryRequest represents the request to create a category
type CreateCategoryRequest struct {
	Name      string `json:"name" binding:"required"`
	Code      string `json:"code" binding:"required"`
	ParentID  string `json:"parent_id,omitempty"`
	SortOrder int    `json:"sort_order,omitempty"`
}

// UpdateCategoryRequest represents the request to update a category
type UpdateCategoryRequest struct {
	Name      string `json:"name,omitempty"`
	Code      string `json:"code,omitempty"`
	ParentID  string `json:"parent_id,omitempty"`
	SortOrder int    `json:"sort_order,omitempty"`
	Status    int    `json:"status,omitempty"`
}

// CategoryResponse represents the category response
type CategoryResponse struct {
	ID        string              `json:"id"`
	Name      string              `json:"name"`
	Code      string              `json:"code"`
	Level     int                 `json:"level"`
	ParentID  *string             `json:"parent_id,omitempty"`
	Path      string              `json:"path,omitempty"`
	SortOrder int                 `json:"sort_order"`
	Status    int                 `json:"status"`
	Children  []CategoryResponse  `json:"children,omitempty"`
}

func toCategoryResponse(category *model.Category) CategoryResponse {
	resp := CategoryResponse{
		ID:        category.ID.String(),
		Name:      category.Name,
		Code:      category.Code,
		Level:     category.Level,
		Path:      category.Path,
		SortOrder: category.SortOrder,
		Status:    category.Status,
		Children:  []CategoryResponse{},
	}

	if category.ParentID != nil {
		parentID := category.ParentID.String()
		resp.ParentID = &parentID
	}

	return resp
}

// ListCategories returns categories (tree structure)
func ListCategories(c *gin.Context) {
	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)
	parentID := c.Query("parent_id")

	var categories []model.Category
	query := db.Where("tenant_id = ?", tenantID)

	if parentID != "" {
		// Get children of specific parent
		parentUUID, _ := uuid.Parse(parentID)
		query = query.Where("parent_id = ?", parentUUID)
	} else {
		// Get root level
		query = query.Where("parent_id IS NULL")
	}

	query = query.Where("deleted_at IS NULL").Order("sort_order ASC, name ASC")

	if err := query.Find(&categories).Error; err != nil {
		response.InternalServerError(c, "failed to fetch categories")
		return
	}

	// Build tree response
	categoryMap := make(map[uuid.UUID]*CategoryResponse)
	var roots []CategoryResponse

	// First pass: create all responses
	for i := range categories {
		category := &categories[i]
		resp := toCategoryResponse(category)
		categoryMap[category.ID] = &resp

		if category.ParentID == nil {
			roots = append(roots, resp)
		}
	}

	// Second pass: link children to parents
	for _, category := range categories {
		if category.ParentID != nil {
			if parent, exists := categoryMap[*category.ParentID]; exists {
				parent.Children = append(parent.Children, *categoryMap[category.ID])
			}
		}
	}

	response.Success(c, roots)
}

// GetCategory returns a specific category
func GetCategory(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "category id is required")
		return
	}

	categoryID, err := uuid.Parse(id)
	if err != nil {
		response.BadRequest(c, "invalid category id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	var category model.Category
	if err := db.Preload("Children").First(&category, "id = ?", categoryID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "category not found")
		} else {
			response.InternalServerError(c, "failed to fetch category")
		}
		return
	}

	response.Success(c, toCategoryResponse(&category))
}

// CreateCategory creates a new category
func CreateCategory(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	if req.Name == "" || req.Code == "" {
		response.BadRequest(c, "name and code are required")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	// Check if category with same code already exists
	var existing model.Category
	if err := db.Where("tenant_id = ? AND code = ? AND deleted_at IS NULL", tenantID, req.Code).First(&existing).Error; err == nil {
		response.Error(c, http.StatusConflict, "category with this code already exists")
		return
	}

	category := &model.Category{
		TenantID:  tenantID,
		Name:      req.Name,
		Code:      req.Code,
		SortOrder: req.SortOrder,
		Status:    model.CategoryStatusActive,
	}

	if req.ParentID != "" {
		parentID, _ := uuid.Parse(req.ParentID)
		category.ParentID = &parentID

		// Validate parent exists
		var parent model.Category
		if err := db.Where("id = ? AND tenant_id = ?", parentID, tenantID).First(&parent).Error; err != nil {
			response.BadRequest(c, "parent category not found")
			return
		}
		category.Level = parent.Level + 1
	}

	if err := category.BuildPath(db); err != nil {
		response.InternalServerError(c, "failed to build category path")
		return
	}

	if err := db.Create(category).Error; err != nil {
		response.InternalServerError(c, "failed to create category")
		return
	}

	response.Success(c, toCategoryResponse(category))
}

// UpdateCategory updates an existing category
func UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "category id is required")
		return
	}

	reqID, err := uuid.Parse(id)
	if err != nil {
		response.BadRequest(c, "invalid category id")
		return
	}

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "invalid request: "+err.Error())
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	var category model.Category
	if err := db.Where("id = ? AND tenant_id = ?", reqID, tenantID).First(&category).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "category not found")
		} else {
			response.InternalServerError(c, "failed to fetch category")
		}
		return
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	if req.SortOrder != 0 {
		category.SortOrder = req.SortOrder
	}
	if req.Status != 0 {
		category.Status = req.Status
	}

	if err := db.Save(&category).Error; err != nil {
		response.InternalServerError(c, "failed to update category")
		return
	}

	response.Success(c, toCategoryResponse(&category))
}

// DeleteCategory deletes a category
func DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		response.BadRequest(c, "category id is required")
		return
	}

	categoryID, err := uuid.Parse(id)
	if err != nil {
		response.BadRequest(c, "invalid category id")
		return
	}

	db, err := database.GetDB()
	if err != nil {
		response.InternalServerError(c, "database connection failed")
		return
	}

	tenantID, _ := middleware.GetTenantID(c)

	var category model.Category
	if err := db.Where("id = ? AND tenant_id = ?", categoryID, tenantID).First(&category).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			response.NotFound(c, "category not found")
		} else {
			response.InternalServerError(c, "failed to fetch category")
		}
		return
	}

	// Check if category has children
	hasChildren, err := category.HasChildren(db)
	if err != nil {
		response.InternalServerError(c, "failed to check children")
		return
	}
	if hasChildren {
		response.BadRequest(c, "cannot delete category with children")
		return
	}

	// Soft delete
	if err := db.Delete(&category).Error; err != nil {
		response.InternalServerError(c, "failed to delete category")
		return
	}

	response.Success(c, gin.H{"message": "category deleted successfully"})
}
