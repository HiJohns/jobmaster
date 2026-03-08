package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
)

// OrderNoGenerator defines the interface for generating order numbers
type OrderNoGenerator interface {
	Generate(tenantID, storeID uuid.UUID) (string, error)
}

// DefaultOrderNoGenerator implements OrderNoGenerator with format: WO-YYYYMMDD-C{OrgID}-XXXX
type DefaultOrderNoGenerator struct {
	// For SaaS scalability, this could be replaced with distributed ID generator
	// like Snowflake, database sequence, or Redis counter
}

// NewOrderNoGenerator creates a new order number generator
func NewOrderNoGenerator() *DefaultOrderNoGenerator {
	return &DefaultOrderNoGenerator{}
}

// Generate creates a unique order number using crypto/rand for thread safety
// Format: WO-YYYYMMDD-C{OrgIDPrefix}-XXXX
// Example: WO-20260308-C8f4-7392
func (g *DefaultOrderNoGenerator) Generate(tenantID, storeID uuid.UUID) (string, error) {
	// Get current date
	now := time.Now()
	dateStr := now.Format("20060102")

	// Extract first 4 chars of store ID (tenant-specific prefix)
	storePrefix := storeID.String()[:4]

	// Generate cryptographically secure random 4-digit suffix (0000-9999)
	// crypto/rand is safe for concurrent use
	n, err := rand.Int(rand.Reader, big.NewInt(10000))
	if err != nil {
		return "", fmt.Errorf("failed to generate random suffix: %w", err)
	}
	suffix := n.Int64()

	orderNo := fmt.Sprintf("WO-%s-C%s-%04d", dateStr, storePrefix, suffix)

	return orderNo, nil
}

// SimpleOrderNoGenerator is a simpler version without OrgID prefix
// Format: WO-YYYYMMDD-XXXX
type SimpleOrderNoGenerator struct{}

// NewSimpleOrderNoGenerator creates a simple order number generator
func NewSimpleOrderNoGenerator() *SimpleOrderNoGenerator {
	return &SimpleOrderNoGenerator{}
}

// Generate creates a simple order number using crypto/rand
// Format: WO-YYYYMMDD-XXXX
func (g *SimpleOrderNoGenerator) Generate(tenantID, storeID uuid.UUID) (string, error) {
	now := time.Now()
	dateStr := now.Format("20060102")

	n, err := rand.Int(rand.Reader, big.NewInt(10000))
	if err != nil {
		return "", fmt.Errorf("failed to generate random suffix: %w", err)
	}
	suffix := n.Int64()

	return fmt.Sprintf("WO-%s-%04d", dateStr, suffix), nil
}
