package service

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
	"jobmaster/pkg/redis"
)

type SLAListenerService struct {
	db    *gorm.DB
	redis *redis.Client
}

func NewSLAListenerService(db *gorm.DB, redisClient *redis.Client) *SLAListenerService {
	return &SLAListenerService{
		db:    db,
		redis: redisClient,
	}
}

func (s *SLAListenerService) Start(ctx context.Context) error {
	log.Println("[SLAListener] Started SLA expired key listener")
	return nil
}

func (s *SLAListenerService) handleExpiredKey(key string) {
	event, err := redis.ParseSLAExpiredKey(key)
	if err != nil {
		log.Printf("[SLAListener] Failed to parse expired key: %v", err)
		return
	}

	tenantID, err := uuid.Parse(event.TenantID)
	if err != nil {
		log.Printf("[SLAListener] Invalid tenant ID: %v", err)
		return
	}

	orderID, err := uuid.Parse(event.OrderID)
	if err != nil {
		log.Printf("[SLAListener] Invalid order ID: %v", err)
		return
	}

	if err := s.onSLAExpired(orderID, tenantID); err != nil {
		log.Printf("[SLAListener] Failed to handle SLA expired: %v", err)
	}
}

func (s *SLAListenerService) onSLAExpired(orderID, tenantID uuid.UUID) error {
	log.Printf("[SLAListener] SLA expired for order %s, tenant %s", orderID, tenantID)

	var order model.WorkOrder
	if err := s.db.First(&order, "id = ?", orderID).Error; err != nil {
		return fmt.Errorf("order not found: %w", err)
	}

	order.Logs.AddLog(
		uuid.Nil,
		"System",
		"sla_timeout",
		fmt.Sprintf("SLA timeout: order exceeded 24 hour response window"),
		order.Status,
		order.Status,
	)

	if err := s.db.Save(&order).Error; err != nil {
		return fmt.Errorf("failed to update order logs: %w", err)
	}

	s.notifyTimeout(orderID, tenantID)

	return nil
}

func (s *SLAListenerService) notifyTimeout(orderID, tenantID uuid.UUID) {
	log.Printf("[SLAListener] Notifying SLA timeout for order %s", orderID)
}
