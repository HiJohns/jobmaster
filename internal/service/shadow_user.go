package service

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
	"jobmaster/pkg/utils"
)

// ShadowUserService handles synchronization between IAM and local user database
type ShadowUserService struct {
	db    *gorm.DB
	redis interface{} // Redis client interface (placeholder)
}

// NewShadowUserService creates a new shadow user service instance
func NewShadowUserService(db *gorm.DB) *ShadowUserService {
	return &ShadowUserService{
		db: db,
	}
}

// SyncShadowUser ensures local database has a shadow copy of IAM user
// Returns the local User model and whether it was newly created
func (s *ShadowUserService) SyncShadowUser(claims *utils.IAMClaims) (*model.User, bool, error) {
	if claims.Sub == "" {
		return nil, false, fmt.Errorf("IAM sub claim is empty")
	}

	var user model.User

	// 1. Try to find existing shadow user by iam_sub
	result := s.db.Where("iam_sub = ?", claims.Sub).First(&user)

	if result.Error == nil {
		// User exists, update its information
		updates := map[string]interface{}{
			"email":        claims.Email,
			"phone":        claims.Phone,
			"display_name": claims.Name,
			"role":         mapIAMRoleToJobMaster(claims.Role),
			"is_org_owner": claims.IsOwner,
		}

		if claims.Oid != "" {
			if orgID, err := uuid.Parse(claims.Oid); err == nil {
				updates["organization_id"] = orgID
			}
		}

		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			return nil, false, fmt.Errorf("failed to update shadow user: %w", err)
		}

		return &user, false, nil
	}

	if result.Error != gorm.ErrRecordNotFound {
		return nil, false, fmt.Errorf("failed to query user: %w", result.Error)
	}

	// 2. Create new shadow user
	user = model.User{
		TenantID:    parseUUIDOrNew(claims.Tid),
		IAMSub:      claims.Sub,
		Email:       claims.Email,
		Phone:       claims.Phone,
		DisplayName: claims.Name,
		Username:    generateUsernameFromSub(claims.Sub),
		Role:        mapIAMRoleToJobMaster(claims.Role),
		IsOrgOwner:  claims.IsOwner,
		Status:      model.UserStatusActive,
		IsShadow:    true,
	}

	// Set organization ID if available
	if claims.Oid != "" {
		if orgID, err := uuid.Parse(claims.Oid); err == nil {
			user.OrganizationID = orgID
		}
	} else {
		// Fallback: use tenant ID as organization ID for shadow users
		user.OrganizationID = user.TenantID
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, false, fmt.Errorf("failed to create shadow user: %w", err)
	}

	return &user, true, nil
}

// GetUserFromCacheOrDB retrieves user from Redis cache or local database
func (s *ShadowUserService) GetUserFromCacheOrDB(sub string) (*model.User, error) {
	if sub == "" {
		return nil, fmt.Errorf("sub cannot be empty")
	}

	// 1. Try to find user in local DB by iam_sub
	var user model.User
	if err := s.db.Where("iam_sub = ?", sub).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // User not found in DB
		}
		return nil, fmt.Errorf("failed to query database: %w", err)
	}

	return &user, nil
}

// Map functions

// mapIAMRoleToJobMaster maps IAM role to JobMaster role
func mapIAMRoleToJobMaster(iamRole string) model.UserRole {
	// IAM roles: OWNER, ADMIN, MANAGER, STAFF, WORKER
	mapping := map[string]model.UserRole{
		"OWNER":   model.UserRoleBrandHQ,
		"ADMIN":   model.UserRoleBrandHQ,
		"MANAGER": model.UserRoleStore,
		"STAFF":   model.UserRoleEngineer,
		"WORKER":  model.UserRoleEngineer,
	}

	if role, ok := mapping[iamRole]; ok {
		return role
	}

	// Default to STAFF role if mapping not found
	return model.UserRoleStaff
}

// parseUUIDOrNew parses a UUID string or generates a new UUID
func parseUUIDOrNew(uuidStr string) uuid.UUID {
	if uuidStr == "" {
		return uuid.New()
	}
	if uid, err := uuid.Parse(uuidStr); err == nil {
		return uid
	}
	return uuid.New()
}

// generateUsernameFromSub generates a username from IAM sub
func generateUsernameFromSub(sub string) string {
	// Use sub as username, but ensure it's not too long
	if len(sub) > 50 {
		return sub[:50]
	}
	return sub
}

// UserInfo structure for caching
type UserInfo struct {
	ID             uuid.UUID        `json:"id"`
	TenantID       uuid.UUID        `json:"tenant_id"`
	OrganizationID uuid.UUID        `json:"organization_id"`
	IAMSub         string           `json:"iam_sub"`
	Username       string           `json:"username"`
	Email          string           `json:"email"`
	Phone          string           `json:"phone"`
	Role           model.UserRole   `json:"role"`
	IsOrgOwner     bool             `json:"is_org_owner"`
	DisplayName    string           `json:"display_name"`
	Status         model.UserStatus `json:"status"`
}

// CacheUserInfo stores user info in Redis cache
func (s *ShadowUserService) CacheUserInfo(user *model.User, ttl time.Duration) error {
	if s.redis == nil {
		return nil // No Redis configured
	}

	info := UserInfo{
		ID:             user.ID,
		TenantID:       user.TenantID,
		OrganizationID: user.OrganizationID,
		IAMSub:         user.IAMSub,
		Username:       user.Username,
		Email:          user.Email,
		Phone:          user.Phone,
		Role:           user.Role,
		IsOrgOwner:     user.IsOrgOwner,
		DisplayName:    user.DisplayName,
		Status:         user.Status,
	}

	data, err := json.Marshal(info)
	if err != nil {
		return fmt.Errorf("failed to marshal user info: %w", err)
	}

	// TODO: Implement Redis SET with TTL
	_ = data
	_ = ttl

	return nil
}

// GetCachedUserInfo retrieves user info from Redis cache
func (s *ShadowUserService) GetCachedUserInfo(sub string) (*UserInfo, error) {
	if s.redis == nil || sub == "" {
		return nil, nil
	}

	// TODO: Implement Redis GET

	return nil, nil
}
