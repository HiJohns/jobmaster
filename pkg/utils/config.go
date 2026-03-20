package utils

import (
	"os"
	"time"
)

// GetEnv retrieves environment variable with fallback default value
func GetEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// IAMConfig holds IAM configuration
type IAMConfig struct {
	BaseURL        string
	ClientID       string
	ClientSecret   string
	InternalSecret string
	PublicKey      string
	CallbackURL    string
	Timeout        time.Duration
}

// DefaultIAMConfig returns IAM configuration from environment and config
func DefaultIAMConfig() *IAMConfig {
	return &IAMConfig{
		BaseURL:        GetEnv("IAM_BASE_URL", ""),
		ClientID:       GetEnv("IAM_CLIENT_ID", ""),
		ClientSecret:   GetEnv("IAM_CLIENT_SECRET", ""),
		InternalSecret: GetEnv("IAM_INTERNAL_SECRET", ""),
		PublicKey:      GetEnv("IAM_PUBLIC_KEY", ""),
		CallbackURL:    GetEnv("IAM_CALLBACK_URL", "/api/v1/auth/callback"),
		Timeout:        30 * time.Second,
	}
}
