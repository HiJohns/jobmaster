package service

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
	"jobmaster/pkg/utils"
)

type UserMembershipService struct {
	db *gorm.DB
}

func NewUserMembershipService(db *gorm.DB) *UserMembershipService {
	return &UserMembershipService{db: db}
}

type CreateUserRequest struct {
	TenantID       uuid.UUID
	OrganizationID uuid.UUID
	Username       string
	Email          string
	Phone          string
	Password       string
	Role           model.UserRole
	DisplayName    string
}

func (s *UserMembershipService) CreateUserWithMembership(req CreateUserRequest) (*model.User, error) {
	var existingUser model.User
	err := s.db.Where("username = ? AND tenant_id = ?", req.Username, req.TenantID).First(&existingUser).Error
	if err == nil {
		return nil, fmt.Errorf("username already exists in tenant")
	}
	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("failed to check username: %w", err)
	}

	iamClaims, err := utils.GetUserByEmail(req.Email, nil)

	var iamSub string
	var isShadow bool

	if err == nil && iamClaims != nil {
		iamSub = iamClaims.Sub
		isShadow = true

		var tenantUser model.User
		err = s.db.Where("tenant_id = ? AND iam_sub = ?", req.TenantID, iamSub).First(&tenantUser).Error
		if err == nil {
			return nil, fmt.Errorf("user already exists in this tenant")
		}
		if err != gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("failed to check tenant membership: %w", err)
		}

		return s.createLocalUser(req, iamSub, isShadow)
	}

	return s.createLocalUser(req, "", false)
}

func (s *UserMembershipService) createLocalUser(req CreateUserRequest, iamSub string, isShadow bool) (*model.User, error) {
	user := model.User{
		TenantID:       req.TenantID,
		OrganizationID: req.OrganizationID,
		Username:       req.Username,
		Email:          req.Email,
		Phone:          req.Phone,
		Role:           req.Role,
		Status:         model.UserStatusActive,
		DisplayName:    req.DisplayName,
		IAMSub:         iamSub,
		IsShadow:       isShadow,
	}

	if req.Password != "" {
		if err := user.HashPassword(req.Password); err != nil {
			return nil, fmt.Errorf("failed to hash password: %w", err)
		}
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, nil
}
