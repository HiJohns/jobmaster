package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"jobmaster/internal/model"
	"jobmaster/pkg/database"
)

// OrderService handles business logic for work orders
type OrderService struct{}

// NewOrderService creates a new order service instance
func NewOrderService() *OrderService {
	return &OrderService{}
}

// TransitTo handles state transitions for work orders
// This is the central authority for all state changes - controllers must use this method
func (s *OrderService) TransitTo(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userName string, targetStatus model.WorkOrderStatus, details string) (*model.WorkOrder, error) {
	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	// Fetch the work order within a transaction
	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}

		// Validate state transition
		oldStatus := order.Status
		if err := order.CanTransitionTo(targetStatus); err != nil {
			return err // Returns ErrInvalidStateTransition
		}

		// Update status
		order.Status = targetStatus

		// Handle special state entry logic
		if err := s.handleStateEntry(tx, &order, targetStatus); err != nil {
			return err
		}

		// Add audit log (append-only for evidence trail)
		action := fmt.Sprintf("status_changed_%s_to_%s", oldStatus.String(), targetStatus.String())
		order.Logs.AddLog(userID, userName, action, details, oldStatus, targetStatus)

		// Save changes
		if err := tx.Save(&order).Error; err != nil {
			return fmt.Errorf("failed to save work order: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}

// handleStateEntry handles logic when entering a specific state
func (s *OrderService) handleStateEntry(tx *gorm.DB, order *model.WorkOrder, status model.WorkOrderStatus) error {
	switch status {
	case model.WorkOrderStatusObserving:
		// Set observing deadline (e.g., 7 days from now)
		deadline := time.Now().Add(7 * 24 * time.Hour)
		order.ObservingDeadline = &deadline

	case model.WorkOrderStatusClosed:
		// Record close time
		now := time.Now()
		order.ClosedAt = &now

	case model.WorkOrderStatusArrived:
		// Record arrival time
		now := time.Now()
		order.ArrivedAt = &now

	case model.WorkOrderStatusWorking:
		// Record start time
		now := time.Now()
		order.StartedAt = &now

	case model.WorkOrderStatusFinished:
		// Record finish time
		now := time.Now()
		order.FinishedAt = &now
	}

	return nil
}

// Dispatch assigns a work order to a vendor or engineer
// This is a specialized transition from PENDING to DISPATCHED
func (s *OrderService) Dispatch(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userName string, vendorID *uuid.UUID, engineerID *uuid.UUID) (*model.WorkOrder, error) {
	if vendorID == nil && engineerID == nil {
		return nil, fmt.Errorf("must specify either vendor_id or engineer_id")
	}

	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}

		// Validate transition to DISPATCHED
		oldStatus := order.Status
		if err := order.CanTransitionTo(model.WorkOrderStatusDispatched); err != nil {
			return err
		}

		// Update assignment
		order.VendorID = vendorID
		order.EngineerID = engineerID
		order.Status = model.WorkOrderStatusDispatched

		// Build log details
		details := "Assigned to"
		if vendorID != nil {
			details += fmt.Sprintf(" vendor %s", vendorID.String())
		}
		if engineerID != nil {
			details += fmt.Sprintf(" engineer %s", engineerID.String())
		}

		// Add audit log
		order.Logs.AddLog(userID, userName, "dispatch", details, oldStatus, model.WorkOrderStatusDispatched)

		if err := tx.Save(&order).Error; err != nil {
			return fmt.Errorf("failed to save work order: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}

// Accept allows vendor/engineer to accept a dispatched work order
// Transitions from DISPATCHED to RESERVED
func (s *OrderService) Accept(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userName string, scheduledAt time.Time) (*model.WorkOrder, error) {
	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}

		// Validate transition
		oldStatus := order.Status
		if err := order.CanTransitionTo(model.WorkOrderStatusReserved); err != nil {
			return err
		}

		order.Status = model.WorkOrderStatusReserved
		order.ScheduledAt = &scheduledAt

		details := fmt.Sprintf("Scheduled for %s", scheduledAt.Format(time.RFC3339))
		order.Logs.AddLog(userID, userName, "accept", details, oldStatus, model.WorkOrderStatusReserved)

		if err := tx.Save(&order).Error; err != nil {
			return fmt.Errorf("failed to save work order: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}

// Reject allows vendor/engineer to reject a dispatched work order
// Transitions from DISPATCHED back to PENDING (with reason)
func (s *OrderService) Reject(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userName string, reason string) (*model.WorkOrder, error) {
	if reason == "" {
		return nil, fmt.Errorf("rejection reason is required")
	}

	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}

		// Validate transition
		oldStatus := order.Status
		if err := order.CanTransitionTo(model.WorkOrderStatusPending); err != nil {
			return err
		}

		// Clear assignment
		order.VendorID = nil
		order.EngineerID = nil
		order.Status = model.WorkOrderStatusPending

		details := fmt.Sprintf("Reason: %s", reason)
		order.Logs.AddLog(userID, userName, "reject", details, oldStatus, model.WorkOrderStatusPending)

		if err := tx.Save(&order).Error; err != nil {
			return fmt.Errorf("failed to save work order: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}
