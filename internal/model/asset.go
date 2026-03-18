package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// DeviceStatus defines device status
type DeviceStatus string

const (
	DeviceStatusActive    DeviceStatus = "ACTIVE"
	DeviceStatusInactive  DeviceStatus = "INACTIVE"
	DeviceStatusBroken    DeviceStatus = "BROKEN"
	DeviceStatusRepairing DeviceStatus = "REPAIRING"
)

// Device represents an equipment/device
type Device struct {
	ID         uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	SN         string         `gorm:"size:100;uniqueIndex" json:"sn"`     // 序列号
	Name       string         `gorm:"size:255" json:"name"`               // 设备名称
	Model      string         `gorm:"size:100" json:"model"`              // 型号
	Brand      string         `gorm:"size:100" json:"brand"`              // 品牌
	OrgID      uuid.UUID      `gorm:"type:uuid;index" json:"org_id"`      // 所属组织
	LocationID *uuid.UUID     `gorm:"type:uuid;index" json:"location_id"` // 所在位置
	Status     DeviceStatus   `gorm:"type:varchar(20)" json:"status"`     // 设备状态
	Info       datatypes.JSON `gorm:"type:jsonb" json:"info"`             // 扩展信息(JSONB)
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for Device
func (Device) TableName() string {
	return "devices"
}

// BeforeCreate hook to generate UUID
func (d *Device) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

// Location represents a physical location/site
type Location struct {
	ID          uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	Name        string         `gorm:"size:255" json:"name"`             // 位置名称
	Address     string         `gorm:"size:500" json:"address"`          // 详细地址
	Coordinates *GPSLocation   `gorm:"type:jsonb" json:"coordinates"`    // 经纬度坐标
	OrgID       uuid.UUID      `gorm:"type:uuid;index" json:"org_id"`    // 所属组织
	ParentID    *uuid.UUID     `gorm:"type:uuid;index" json:"parent_id"` // 父级位置
	Level       int            `json:"level"`                            // 层级深度
	Info        datatypes.JSON `gorm:"type:jsonb" json:"info"`           // 扩展信息
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for Location
func (Location) TableName() string {
	return "locations"
}

// BeforeCreate hook to generate UUID
func (l *Location) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}
