package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Organization represents a business entity (HQ or Store)
type Organization struct {
	ID              uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	TenantID        uuid.UUID      `gorm:"type:uuid;not null;index:idx_org_tenant" json:"tenant_id"`
	Name            string         `gorm:"size:255;not null" json:"name"`
	Type            OrgType        `gorm:"type:varchar(20);not null" json:"type"`
	Code            string         `gorm:"size:50;uniqueIndex:idx_org_code_tenant" json:"code"`
	ParentID        *uuid.UUID     `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Level           int            `gorm:"default:0" json:"level"`
	Address         string         `gorm:"size:500" json:"address"`
	ContactName     string         `gorm:"size:100" json:"contact_name"`
	ContactPhone    string         `gorm:"size:20" json:"contact_phone"`
	IAMOrgID        *string        `gorm:"size:100" json:"iam_org_id,omitempty"` // IAM 组织 ID
	ProvinceCode    string         `gorm:"size:20;index" json:"province_code,omitempty"`
	CityCode        string         `gorm:"size:20;index" json:"city_code,omitempty"`
	DistrictCode    string         `gorm:"size:20;index" json:"district_code,omitempty"`
	IsShadow        bool           `gorm:"default:false" json:"is_shadow"`       // 是否为影子组织
	MaxDispatchHops int            `gorm:"default:3" json:"max_dispatch_hops"`   // 最大流转跳数
	Path            string         `gorm:"size:500" json:"path,omitempty"`       // 组织路径
	Parent          *Organization  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children        []Organization `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// OrgType defines the organization type
type OrgType string

const (
	OrgTypeHQ             OrgType = "HQ"              // 总店
	OrgTypeStore          OrgType = "STORE"           // 分店
	OrgTypeMainContractor OrgType = "MAIN_CONTRACTOR" // 工程公司
	OrgTypeVendor         OrgType = "VENDOR"          // 供应商
)

// TableName specifies the table name for Organization
func (Organization) TableName() string {
	return "organizations"
}

// BeforeCreate hook to generate UUID
func (o *Organization) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}

// IsHQ returns true if the organization is a headquarters
func (o *Organization) IsHQ() bool {
	return o.Type == OrgTypeHQ
}

// IsStore returns true if the organization is a store
func (o *Organization) IsStore() bool {
	return o.Type == OrgTypeStore
}

// IsMainContractor returns true if the organization is a main contractor
func (o *Organization) IsMainContractor() bool {
	return o.Type == OrgTypeMainContractor
}

// IsVendor returns true if the organization is a vendor
func (o *Organization) IsVendor() bool {
	return o.Type == OrgTypeVendor
}
