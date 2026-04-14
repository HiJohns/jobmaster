package model

import (
	"time"

	"github.com/google/uuid"
)

type BranchQuota struct {
	ID          uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	BranchID    uuid.UUID `gorm:"type:uuid;not null;index" json:"branch_id"`
	Month       string    `gorm:"size:7;not null;index" json:"month"`
	UrgentQuota int       `gorm:"default:5" json:"urgent_quota"`
	UrgentUsed  int       `gorm:"default:0" json:"urgent_used"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (q *BranchQuota) TableName() string {
	return "branch_quotas"
}

func (q *BranchQuota) HasQuota() bool {
	return q.UrgentUsed < q.UrgentQuota
}

func (q *BranchQuota) UseQuota() {
	q.UrgentUsed++
}
