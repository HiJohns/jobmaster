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

		// Set ParentProviderID for temporary parent-child relationship
		if vendorID != nil {
			// Check if the vendor has a parent organization
			var vendorOrg model.Organization
			if err := tx.First(&vendorOrg, "id = ?", vendorID).Error; err == nil && vendorOrg.ParentID != nil {
				order.ParentProviderID = vendorOrg.ParentID
			}
		}

		// Build log details
		details := "Assigned to"
		if vendorID != nil {
			details += fmt.Sprintf(" vendor %s", vendorID.String())
		}
		if engineerID != nil {
			details += fmt.Sprintf(" engineer %s", engineerID.String())
		}

		// Add audit log
		order.Logs.AddLog(userID, userName, model.LogActionDispatch, details, oldStatus, model.WorkOrderStatusDispatched)

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
		order.Logs.AddLog(userID, userName, model.LogActionAccept, details, oldStatus, model.WorkOrderStatusReserved)

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
		order.Logs.AddLog(userID, userName, model.LogActionReject, details, oldStatus, model.WorkOrderStatusPending)

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

// Reserve sets the appointment time for a dispatched work order
// Transitions from DISPATCHED to RESERVED
func (s *OrderService) Reserve(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, orgID uuid.UUID, userName string, appointedAt time.Time) (*model.WorkOrder, error) {
	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}

		// Validate ownership - must be assigned to this vendor or engineer
		if order.VendorID != nil && *order.VendorID != orgID {
			return fmt.Errorf("not assigned to this order: vendor mismatch")
		}
		if order.EngineerID != nil && *order.EngineerID != userID {
			return fmt.Errorf("not assigned to this order: engineer mismatch")
		}

		// Validate transition to RESERVED
		oldStatus := order.Status
		if err := order.CanTransitionTo(model.WorkOrderStatusReserved); err != nil {
			return err
		}

		order.Status = model.WorkOrderStatusReserved
		order.AppointedAt = &appointedAt

		details := fmt.Sprintf("Appointment scheduled for %s", appointedAt.Format(time.RFC3339))
		order.Logs.AddLog(userID, userName, model.LogActionReserve, details, oldStatus, model.WorkOrderStatusReserved)

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

// Arrive checks in at the work site with GPS coordinates
// Transitions from RESERVED to ARRIVED
func (s *OrderService) Arrive(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, orgID uuid.UUID, userName string, latitude, longitude float64) (*model.WorkOrder, error) {
	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}

		// Validate ownership - must be assigned to this engineer or vendor
		if order.EngineerID != nil && *order.EngineerID != userID {
			return fmt.Errorf("not assigned to this order: engineer mismatch")
		}
		if order.EngineerID == nil && order.VendorID != nil && *order.VendorID != orgID {
			return fmt.Errorf("not assigned to this order: vendor mismatch")
		}

		// Validate transition to ARRIVED
		oldStatus := order.Status
		if err := order.CanTransitionTo(model.WorkOrderStatusArrived); err != nil {
			return err
		}

		now := time.Now()
		order.Status = model.WorkOrderStatusArrived
		order.ArrivedAt = &now

		details := fmt.Sprintf("Arrived at location [%.6f, %.6f]", latitude, longitude)
		order.Logs.AddLog(userID, userName, model.LogActionArrive, details, oldStatus, model.WorkOrderStatusArrived)

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

// Finish completes the work and records completion details
// Transitions from WORKING to FINISHED
func (s *OrderService) Finish(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, orgID uuid.UUID, userName string, description string, photoURLs []string, laborFee, materialFee, otherFee float64) (*model.WorkOrder, error) {
	if description == "" {
		return nil, fmt.Errorf("completion description is required")
	}

	// Validate fee ranges
	if laborFee < 0 || laborFee > 999999 {
		return nil, fmt.Errorf("labor fee must be between 0 and 999999")
	}
	if materialFee < 0 || materialFee > 999999 {
		return nil, fmt.Errorf("material fee must be between 0 and 999999")
	}
	if otherFee < 0 || otherFee > 999999 {
		return nil, fmt.Errorf("other fee must be between 0 and 999999")
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

		// Validate ownership - must be assigned to this engineer
		if order.EngineerID != nil && *order.EngineerID != userID {
			return fmt.Errorf("not assigned to this order: engineer mismatch")
		}

		// Validate transition to FINISHED
		oldStatus := order.Status
		if err := order.CanTransitionTo(model.WorkOrderStatusFinished); err != nil {
			return err
		}

		now := time.Now()
		order.Status = model.WorkOrderStatusFinished
		order.FinishedAt = &now
		order.LaborFee = laborFee
		order.MaterialFee = materialFee
		order.OtherFee = otherFee

		// Build completion details
		details := fmt.Sprintf("Work completed: %s", description)
		if len(photoURLs) > 0 {
			details += fmt.Sprintf(" | Photos: %d attached", len(photoURLs))
		}
		order.Logs.AddLog(userID, userName, model.LogActionFinish, details, oldStatus, model.WorkOrderStatusFinished)

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
