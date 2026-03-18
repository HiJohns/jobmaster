package service

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// SLAService handles SLA monitoring for work orders
type SLAService struct {
	redis RedisClient
}

// RedisClient interface for Redis operations
type RedisClient interface {
	SetSLAMonitor(tenantID, orderID uuid.UUID, data string, ttl time.Duration) error
	GetSLAMonitor(tenantID, orderID uuid.UUID) (string, error)
	DeleteSLAMonitor(tenantID, orderID uuid.UUID) error
	GetSLATTL(tenantID, orderID uuid.UUID) (time.Duration, error)
}

// NewSLAService creates a new SLA service instance
func NewSLAService(redisClient RedisClient) *SLAService {
	return &SLAService{
		redis: redisClient,
	}
}

// StartSLAMonitor starts monitoring SLA for a work order when status changes to DISPATCHED
func (s *SLAService) StartSLAMonitor(orderID, tenantID uuid.UUID) error {
	// SLA timeout: 24 hours (configurable)
	ttl := 24 * time.Hour

	// Store order info in the value
	value := map[string]string{
		"order_id":   orderID.String(),
		"tenant_id":  tenantID.String(),
		"start_time": time.Now().Format(time.RFC3339),
	}

	valueBytes, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal SLA data: %w", err)
	}

	// Set key with TTL
	if err := s.redis.SetSLAMonitor(tenantID, orderID, string(valueBytes), ttl); err != nil {
		return fmt.Errorf("failed to set SLA monitor: %w", err)
	}

	fmt.Printf("[SLAMonitor] Started monitoring for order %s, TTL: %v\n", orderID, ttl)
	return nil
}

// CancelSLAMonitor cancels SLA monitoring for an order (e.g., when order is completed)
func (s *SLAService) CancelSLAMonitor(orderID, tenantID uuid.UUID) error {
	if err := s.redis.DeleteSLAMonitor(tenantID, orderID); err != nil {
		return fmt.Errorf("failed to delete SLA monitor: %w", err)
	}

	fmt.Printf("[SLAMonitor] Cancelled monitoring for order %s\n", orderID)
	return nil
}

// OnSLAExpired handles SLA expiration event
func (s *SLAService) OnSLAExpired(orderID, tenantID uuid.UUID) error {
	fmt.Printf("[SLAMonitor] SLA expired for order %s\n", orderID)

	// TODO: Add "SLA timeout alert" to WorkOrderLogs
	// TODO: Send notification (optional)

	return nil
}
