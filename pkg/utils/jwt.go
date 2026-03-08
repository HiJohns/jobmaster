package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Context keys for gin.Context - using constants to avoid hardcoded strings
const (
	ContextKeyUserID         = "user_id"
	ContextKeyOrgID          = "org_id"
	ContextKeyTenantID       = "tenant_id"
	ContextKeyRole           = "role"
	ContextKeyIsImpersonated = "is_impersonated"
)

// JWTClaims represents the JWT claims structure
type JWTClaims struct {
	UserID         uuid.UUID `json:"user_id"`
	OrgID          uuid.UUID `json:"org_id"`
	TenantID       uuid.UUID `json:"tenant_id"`
	Role           string    `json:"role"`
	IsImpersonated bool      `json:"is_impersonated"`
	jwt.RegisteredClaims
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret     string
	Expiration time.Duration
}

// DefaultJWTConfig returns default JWT configuration from environment
func DefaultJWTConfig() (*JWTConfig, error) {
	secret := GetEnv("JWT_SECRET", "")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is not set")
	}
	return &JWTConfig{
		Secret:     secret,
		Expiration: 24 * time.Hour,
	}, nil
}

// GenerateToken creates a new JWT token with the given claims
func GenerateToken(userID, orgID, tenantID uuid.UUID, role string, isImpersonated bool, config *JWTConfig) (string, error) {
	if config == nil {
		var err error
		config, err = DefaultJWTConfig()
		if err != nil {
			return "", fmt.Errorf("failed to load JWT config for user %s: %w", userID, err)
		}
	}

	claims := JWTClaims{
		UserID:         userID,
		OrgID:          orgID,
		TenantID:       tenantID,
		Role:           role,
		IsImpersonated: isImpersonated,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(config.Expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(config.Secret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ParseToken validates and parses a JWT token
func ParseToken(tokenString string, config *JWTConfig) (*JWTClaims, error) {
	if config == nil {
		var err error
		config, err = DefaultJWTConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to load JWT config: %w", err)
		}
	}

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(config.Secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}
