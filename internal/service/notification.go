package service

import (
	"fmt"

	"gorm.io/gorm"
	"jobmaster/internal/model"
)

// NotificationService handles sending notifications to administrators
type NotificationService struct {
	db *gorm.DB
}

// NewNotificationService creates a new notification service
func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db}
}

// NotifyAdmin sends an escalation notification to the store admin or manager
func (s *NotificationService) NotifyAdmin(order model.WorkOrder) error {
	// Get store
	var store model.Organization
	if err := s.db.First(&store, "id = ?", order.StoreID).Error; err != nil {
		return fmt.Errorf("failed to get store: %w", err)
	}

	// Use tenant owner as recipient for now
	// In production, this would query the store's admin users
	recipient := store.TenantID.String()

	message := fmt.Sprintf("加急工单 %s 已超时30分钟未响应，请及时处理", order.OrderNo)

	// Record the escalation
	return model.RecordEscalation(s.db, order.ID, recipient, message)
}

// NotifyEscalation sends escalation notifications for overdue urgent orders
func (s *NotificationService) NotifyEscalation(orders []model.WorkOrder) error {
	for _, order := range orders {
		// Check if already notified
		notified, err := model.HasBeenNotified(s.db, order.ID)
		if err != nil {
			return fmt.Errorf("failed to check notification status: %w", err)
		}
		if notified {
			continue // Already notified, skip
		}

		// Send notification
		if err := s.NotifyAdmin(order); err != nil {
			return fmt.Errorf("failed to notify admin for order %s: %w", order.OrderNo, err)
		}
	}
	return nil
}

// NotifyEvaluationNeeded notifies that a work order needs evaluation
func (s *NotificationService) NotifyEvaluationNeeded(order model.WorkOrder) error {
	var org model.Organization
	if err := s.db.First(&org, "id = ?", order.StoreID).Error; err != nil {
		return fmt.Errorf("failed to get organization: %w", err)
	}

	message := fmt.Sprintf("工单 %s 已通过验收，需要进行评估评分", order.OrderNo)
	return model.RecordEscalation(s.db, order.ID, org.TenantID.String(), message)
}
