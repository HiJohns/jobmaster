package task

import (
	"time"
	"gorm.io/gorm"

	"jobmaster/internal/model"
	"jobmaster/internal/service"
)

// EscalationTask manages automatic escalation notifications for overdue urgent work orders
type EscalationTask struct {
	db                  *gorm.DB
	notificationService *service.NotificationService
}

// NewEscalationTask creates a new escalation task
func NewEscalationTask(db *gorm.DB) *EscalationTask {
	return &EscalationTask{
		db:                  db,
		notificationService: service.NewNotificationService(db),
	}
}

// Run checks for overdue urgent work orders and sends escalation notifications
// This should be called periodically (e.g., every 10 minutes)
func (t *EscalationTask) Run() error {
	// Find dispatched urgent orders older than 30 minutes
	thirtyMinutesAgo := time.Now().Add(-30 * time.Minute)

	var orders []model.WorkOrder
	err := t.db.
		Where("status = ? AND priority > ? AND dispatched_at < ?",
			model.WorkOrderStatusDispatched, model.PriorityNormal, thirtyMinutesAgo).
		Find(&orders).Error

	if err != nil {
		return err
	}

	// Send notifications
	return t.notificationService.NotifyEscalation(orders)
}
