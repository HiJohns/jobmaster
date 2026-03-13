package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Tenant represents a multi-tenant organization in the system
type Tenant struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	UUID          uuid.UUID      `gorm:"type:uuid;uniqueIndex;not null" json:"uuid"`
	Name          string         `gorm:"size:255;not null;comment:租户全称" json:"name"`
	Code          string         `gorm:"size:100;uniqueIndex;not null;comment:唯一标识码" json:"code"`
	Slug          string         `gorm:"size:100;uniqueIndex;not null;comment:用于URL/子域名" json:"slug"`
	ContactPerson string         `gorm:"size:255;comment:联系人" json:"contact_person"`
	Status        int8           `gorm:"default:1;comment:租户状态 (0:禁用, 1:启用)" json:"status"`
	Config        JSONBMap       `gorm:"type:jsonb;default:'{}';comment:租户专属配置" json:"config"`
	CreatedAt     time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName returns the table name for Tenant model
func (Tenant) TableName() string {
	return "tenants"
}

// BeforeCreate hook to generate UUID
func (t *Tenant) BeforeCreate(tx *gorm.DB) error {
	if t.UUID == uuid.Nil {
		t.UUID = uuid.New()
	}
	return nil
}

// JSONBMap is a custom type for JSONB fields
type JSONBMap map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONBMap) Value() (driver.Value, error) {
	if len(j) == 0 {
		return "{}", nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONBMap) Scan(src interface{}) error {
	if src == nil {
		*j = make(JSONBMap)
		return nil
	}

	var data []byte
	switch v := src.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into JSONBMap", src)
	}

	if len(data) == 0 || string(data) == "{}" {
		*j = make(JSONBMap)
		return nil
	}

	return json.Unmarshal(data, j)
}
