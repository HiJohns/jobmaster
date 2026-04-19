package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Category represents a work order category (tree structure)
type Category struct {
	ID         uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID   uuid.UUID      `gorm:"type:uuid;not null;index:idx_category_tenant" json:"tenant_id"`
	ParentID   *uuid.UUID     `gorm:"type:uuid;index:idx_categories_parent" json:"parent_id,omitempty"`
	Parent     *Category      `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children   []Category     `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Name       string         `gorm:"size:100;not null" json:"name"`
	Code       string         `gorm:"size:50;not null;index" json:"code"`
	Level      int            `gorm:"not null;default:1;index:idx_categories_level" json:"level"`
	Path       string         `gorm:"size:500" json:"path,omitempty"`
	SortOrder  int            `gorm:"default:0" json:"sort_order"`
	Status     int            `gorm:"default:1;index:idx_categories_status" json:"status"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// CategoryStatus constants
const (
	CategoryStatusActive   int = 1
	CategoryStatusInactive int = 0
)

// ErrCannotDeleteCategoryWithChildren is returned when attempting to delete a category with children
var ErrCannotDeleteCategoryWithChildren = errors.New("cannot delete category with children")

// BeforeCreate hook to generate UUID and set default values
func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Status == 0 {
		c.Status = CategoryStatusActive
	}
	return nil
}

// Validate checks if the category is valid
func (c *Category) Validate() error {
	if c.TenantID == uuid.Nil {
		return errors.New("tenant_id is required")
	}
	if c.Name == "" {
		return errors.New("name is required")
	}
	if c.Code == "" {
		return errors.New("code is required")
	}
	if c.Level < 1 || c.Level > 10 {
		return errors.New("level must be between 1 and 10")
	}
	return nil
}

// BuildPath builds the full path from root to current category
func (c *Category) BuildPath(db *gorm.DB) error {
	if c.ParentID == nil {
		c.Path = c.Name
		c.Level = 1
		return nil
	}

	var parent Category
	if err := db.First(&parent, "id = ?", *c.ParentID).Error; err != nil {
		return fmt.Errorf("parent category not found: %w", err)
	}

	c.Path = fmt.Sprintf("%s/%s", parent.Path, c.Name)
	c.Level = parent.Level + 1
	return nil
}

// HasChildren checks if the category has children
func (c *Category) HasChildren(db *gorm.DB) (bool, error) {
	var count int64
	if err := db.Model(&Category{}).Where("parent_id = ? AND deleted_at IS NULL", c.ID).Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// GetFullPath returns the full path as an array
func (c *Category) GetFullPath() []string {
	if c.Path == "" {
		return []string{c.Name}
	}
	return strings.Split(c.Path, "/")
}

// SoftDelete performs soft delete on category and its descendants
func (c *Category) SoftDelete(tx *gorm.DB) error {
	// Check if has children
	hasChildren, err := c.HasChildren(tx)
	if err != nil {
		return err
	}
	if hasChildren {
		return ErrCannotDeleteCategoryWithChildren
	}

	return tx.Delete(c).Error
}
