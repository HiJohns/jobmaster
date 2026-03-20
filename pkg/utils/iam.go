package utils

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// IAMClaims represents the JWT claims structure from Beacon-IAM
type IAMClaims struct {
	Sub     string `json:"sub"`      // 用户唯一标识 (User ID)
	Tid     string `json:"tid"`      // Tenant ID
	Oid     string `json:"oid"`      // Organization ID
	Role    string `json:"role"`     // 业务角色
	IsOwner bool   `json:"is_owner"` // 是否为组织所有者
	Name    string `json:"name"`     // 显示名称
	Avatar  string `json:"avatar"`   // 头像 URL
	Email   string `json:"email"`
	Phone   string `json:"phone"`
	// 新增：品牌配置
	BrandConfig struct {
		LogoURL      string `json:"logo_url"`
		PrimaryColor string `json:"primary_color"`
		BrandName    string `json:"brand_name"`
	} `json:"brand_config"`
	jwt.RegisteredClaims
}

// ParseTokenWithPublicKey validates and parses a JWT token using RS256 public key
func ParseTokenWithPublicKey(tokenString string, config *IAMConfig) (*IAMClaims, error) {
	if config == nil {
		config = DefaultIAMConfig()
	}

	publicKeyBytes := []byte(config.PublicKey)
	if config.PublicKey == "" {
		return nil, fmt.Errorf("IAM public key is not configured")
	}

	publicKey, err := parseRSAPublicKey(publicKeyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse IAM public key: %w", err)
	}

	token, err := jwt.ParseWithClaims(tokenString, &IAMClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return publicKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*IAMClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

// parseRSAPublicKey parses PEM-encoded RSA public key
func parseRSAPublicKey(pubPEM []byte) (*rsa.PublicKey, error) {
	// Normalize line endings
	pubPEM = []byte(strings.ReplaceAll(string(pubPEM), "\\n", "\n"))

	block, _ := pem.Decode(pubPEM)
	if block == nil {
		return nil, fmt.Errorf("failed to parse PEM block containing the public key")
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse public key: %w", err)
	}

	// Type assertion to RSA public key
	if rsaPub, ok := pub.(*rsa.PublicKey); ok {
		return rsaPub, nil
	}

	return nil, fmt.Errorf("public key is not an RSA key")
}

// ParseIDToken validates and parses an ID Token from IAM
func ParseIDToken(idToken string, config *IAMConfig) (*IAMClaims, error) {
	return ParseTokenWithPublicKey(idToken, config)
}

// ConvertIAMClaimUUID converts string UUID from IAM claims to uuid.UUID
func ConvertIAMClaimUUID(claimValue string) (uuid.UUID, error) {
	if claimValue == "" {
		return uuid.Nil, fmt.Errorf("empty UUID claim")
	}
	uid, err := uuid.Parse(claimValue)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid UUID format in claim: %w", err)
	}
	return uid, nil
}

// Context keys for IAM integration
const (
	ContextKeyIsOwner = "is_owner"
	ContextKeyEmail   = "email"
	ContextKeyPhone   = "phone"
	ContextKeyName    = "name"
	ContextKeyAvatar  = "avatar"
)

// GetUserByEmail queries IAM system for user by email
// Uses internal secret for authentication to prevent user enumeration attacks
// Returns IAM claims if user exists, nil if not found, error on failure
func GetUserByEmail(email string, config *IAMConfig) (*IAMClaims, error) {
	if config == nil {
		config = DefaultIAMConfig()
	}

	if config.BaseURL == "" {
		return nil, fmt.Errorf("IAM base URL not configured")
	}

	if config.InternalSecret == "" {
		return nil, fmt.Errorf("IAM internal secret not configured")
	}

	baseURL := strings.TrimSuffix(config.BaseURL, "/")
	reqURL := baseURL + "/api/v1/internal/users/lookup?email=" + url.QueryEscape(email)

	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create IAM request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+config.InternalSecret)
	req.Header.Set("X-Internal-Caller", "jobmaster")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call IAM service: %w", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		var result struct {
			Sub   string `json:"sub"`
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
			Role  string `json:"role"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, fmt.Errorf("failed to parse IAM response: %w", err)
		}
		return &IAMClaims{
			Sub:   result.Sub,
			Name:  result.Name,
			Email: result.Email,
			Phone: result.Phone,
			Role:  result.Role,
		}, nil

	case http.StatusNotFound:
		return nil, nil

	case http.StatusUnauthorized:
		return nil, fmt.Errorf("IAM authentication failed: invalid internal secret")

	default:
		return nil, fmt.Errorf("IAM returned unexpected status: %d", resp.StatusCode)
	}
}
