package service

import (
	"context"
	"encoding/json"
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

	case model.WorkOrderStatusPendingEvaluation:
		// Record finish time (engineer completed work)
		now := time.Now()
		order.FinishedAt = &now

	case model.WorkOrderStatusFinished:
		// Verification complete — no timestamp change
	}

	return nil
}

// Dispatch assigns a work order to an organization or engineer.
// Supports multi-hop: DISPATCHED → DISPATCHED (CurrentHop++).
func (s *OrderService) Dispatch(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userName string, targetOrgID *uuid.UUID, engineerID *uuid.UUID) (*model.WorkOrder, error) {
	if targetOrgID == nil && engineerID == nil {
		return nil, fmt.Errorf("must specify either target_org_id or engineer_id")
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

		oldStatus := order.Status

		if err := order.CanTransitionTo(model.WorkOrderStatusDispatched); err != nil {
			return err
		}

		var tenant model.Tenant
		if err := tx.First(&tenant, "uuid = ?", order.TenantID).Error; err != nil {
			return fmt.Errorf("failed to fetch tenant config: %w", err)
		}

		hopLimit := 5
		if tenant.Config != nil {
			if val, ok := tenant.Config["hop_limit"].(float64); ok {
				hopLimit = int(val)
			}
		}

		if order.CurrentHop >= hopLimit {
			return fmt.Errorf("transfer limit exceeded: current_hop=%d, hop_limit=%d", order.CurrentHop, hopLimit)
		}

		order.OwnerOrgID = targetOrgID
		order.HandlerID = &userID
		order.EngineerID = engineerID
		order.Status = model.WorkOrderStatusDispatched
		order.CurrentHop++
		order.HopLimit = hopLimit

		// Set ParentProviderID for temporary parent-child relationship
		if targetOrgID != nil {
			// Check if the target org has a parent organization
			var targetOrg model.Organization
			if err := tx.First(&targetOrg, "id = ?", targetOrgID).Error; err == nil && targetOrg.ParentID != nil {
				order.ParentProviderID = targetOrg.ParentID
			}

			// Append target org ID to dispatch path
			var dispatchPath []uuid.UUID
			if order.DispatchPath != nil {
				_ = json.Unmarshal(order.DispatchPath, &dispatchPath)
			}
			dispatchPath = append(dispatchPath, *targetOrgID)
			pathJSON, _ := json.Marshal(dispatchPath)
			order.DispatchPath = pathJSON
		}

		// Build log details
		logDetails := "Assigned to"
		if targetOrgID != nil {
			logDetails += fmt.Sprintf(" org %s", targetOrgID.String())
		}
		if engineerID != nil {
			logDetails += fmt.Sprintf(" engineer %s", engineerID.String())
		}

		order.Logs.AddLog(userID, userName, model.LogActionDispatch, logDetails, oldStatus, model.WorkOrderStatusDispatched)

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
		if err := order.CanTransitionTo(model.WorkOrderStatusAccepted); err != nil {
			return err
		}

		order.Status = model.WorkOrderStatusAccepted
		order.ScheduledAt = &scheduledAt

		details := fmt.Sprintf("Accepted, scheduled for %s", scheduledAt.Format(time.RFC3339))
		order.Logs.AddLog(userID, userName, model.LogActionAccept, details, oldStatus, model.WorkOrderStatusAccepted)

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

// Verify verifies a finished work order (approve or reject)
// Approve: PENDING_EVALUATION -> FINISHED
// Reject: PENDING_EVALUATION -> DISPATCHED (rejected back to contractor)
func (s *OrderService) Verify(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userOrgID uuid.UUID, userName string, action string, comment string) (*model.WorkOrder, error) {
	if action != "approve" && action != "reject" {
		return nil, fmt.Errorf("invalid action: must be 'approve' or 'reject'")
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

		oldStatus := order.Status
		if oldStatus != model.WorkOrderStatusPendingEvaluation {
			return fmt.Errorf("work order must be in PENDING_EVALUATION status to verify: current status is %s", oldStatus.String())
		}

		var newStatus model.WorkOrderStatus
		var logAction string
		var details string

		if action == "approve" {
			newStatus = model.WorkOrderStatusFinished
			logAction = model.LogActionStatusChangeToFinished
			details = "Verification approved"
			if comment != "" {
				details += fmt.Sprintf(": %s", comment)
			}
		} else {
			newStatus = model.WorkOrderStatusDispatched
			logAction = model.LogActionReject
			details = fmt.Sprintf("Verification rejected: %s", comment)
		}

		order.Status = newStatus
		order.Logs.AddLog(userID, userName, logAction, details, oldStatus, newStatus)

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
		order.OwnerOrgID = nil
		order.HandlerID = nil
		order.EngineerID = nil
		order.DispatchPath = []byte("[]")
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

		// Validate ownership - must be assigned to this org or engineer
		if order.OwnerOrgID != nil && *order.OwnerOrgID != orgID {
			return fmt.Errorf("not assigned to this order: org mismatch")
		}
		if order.EngineerID != nil && *order.EngineerID != userID {
			return fmt.Errorf("not assigned to this order: engineer mismatch")
		}

		// Reject reservation for appointment_type=1 (指定上门时段，无需预约)
		if order.AppointmentType == 1 {
			return fmt.Errorf("该工单无需预约，可直接到场签到")
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

// Arrive checks in at the work site with photo and comment
// Transitions from DISPATCHED/RESERVED to ARRIVED
func (s *OrderService) Arrive(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, orgID uuid.UUID, userName string, photoURLs []string, comment string) (*model.WorkOrder, error) {
	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}

		// Validate ownership - must be assigned to this engineer or org
		if order.EngineerID != nil && *order.EngineerID != userID {
			return fmt.Errorf("not assigned to this order: engineer mismatch")
		}
		if order.EngineerID == nil && order.OwnerOrgID != nil && *order.OwnerOrgID != orgID {
			return fmt.Errorf("not assigned to this order: org mismatch")
		}

		// Validate transition to ARRIVED
		if err := order.CanTransitionTo(model.WorkOrderStatusArrived); err != nil {
			return err
		}

		// If arriving directly from DISPATCHED (no reservation), ensure appointment_type=1
		if order.Status == model.WorkOrderStatusDispatched && order.AppointmentType != 1 {
			return fmt.Errorf("该工单需要提前预约，请先设置预约时间")
		}

		now := time.Now()
		order.Status = model.WorkOrderStatusArrived
		order.ArrivedAt = &now

		details := "Arrived at work site"
		if comment != "" {
			details = comment
		}
		order.Logs = append(order.Logs, model.WorkOrderLog{
			Timestamp: time.Now(),
			UserID:    userID,
			UserName:  userName,
			Action:    model.LogActionArrive,
			Details:   details,
			PhotoURLs: photoURLs,
		})

		// Auto-transition to WORKING
		order.Status = model.WorkOrderStatusWorking
		order.StartedAt = &now
		order.Logs.AddLog(userID, userName, model.LogActionStatusChangeToWorking, "Started working", model.WorkOrderStatusArrived, model.WorkOrderStatusWorking)

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

// AddWorkRecord appends a work record (photos + comment) without changing status
func (s *OrderService) AddWorkRecord(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userName string, photoURLs []string, comment string) (*model.WorkOrderLog, error) {
	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}
		// Only allow records during active work (WORKING) or before/after
		if order.Status != model.WorkOrderStatusWorking && order.Status != model.WorkOrderStatusArrived {
			return fmt.Errorf("work records can only be added for active work orders")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	log := model.WorkOrderLog{
		Timestamp: time.Now(),
		UserID:    userID,
		UserName:  userName,
		Action:    model.LogActionWorkRecord,
		Details:   comment,
		PhotoURLs: photoURLs,
	}

	return &log, nil
}

// Finish completes the work and records completion details
// Transitions from WORKING to PENDING_EVALUATION
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

		// Validate transition to PENDING_EVALUATION
		oldStatus := order.Status
		if err := order.CanTransitionTo(model.WorkOrderStatusPendingEvaluation); err != nil {
			return err
		}

		now := time.Now()
		order.Status = model.WorkOrderStatusPendingEvaluation
		order.FinishedAt = &now
		order.LaborFee = laborFee
		order.MaterialFee = materialFee
		order.OtherFee = otherFee

		// Build completion details
		details := fmt.Sprintf("Work completed: %s", description)
		if len(photoURLs) > 0 {
			details += fmt.Sprintf(" | Photos: %d attached", len(photoURLs))
		}
		order.Logs.AddLog(userID, userName, model.LogActionFinish, details, oldStatus, model.WorkOrderStatusPendingEvaluation)

		if err := tx.Save(&order).Error; err != nil {
			return fmt.Errorf("failed to save work order: %w", err)
		}

		// Notify store staff to verify the completed work
		notificationSvc := NewNotificationService(tx)
		if err := notificationSvc.NotifyEvaluationNeeded(order); err != nil {
			fmt.Printf("failed to send evaluation notification: %v\n", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}

// Evaluate evaluates a work order and transitions it from FINISHED to CLOSED
// Only users from the same organization as the work order can evaluate it
func (s *OrderService) Evaluate(ctx context.Context, orderID uuid.UUID, userID uuid.UUID, userOrgID uuid.UUID, userName string, evaluationScore int, evaluationNotes string, estimatedCost float64) (*model.WorkOrder, error) {
	db, err := database.GetDB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database connection: %w", err)
	}

	var order model.WorkOrder
	err = db.Transaction(func(tx *gorm.DB) error {
		// Fetch the work order with lock
		if err := tx.Set("gorm:query_option", "FOR UPDATE").First(&order, "id = ?", orderID).Error; err != nil {
			return fmt.Errorf("work order not found: %w", err)
		}

		// Check organization permission - only allow evaluation from the work order's organization
		if order.StoreID != userOrgID {
			return fmt.Errorf("permission denied: you can only evaluate work orders from your organization")
		}

		// Validate transition to CLOSED (must be from FINISHED)
		oldStatus := order.Status
		if err := order.CanTransitionTo(model.WorkOrderStatusClosed); err != nil {
			return fmt.Errorf("work order must be in FINISHED status: %w", err)
		}

		// Update status and evaluation details
		order.Status = model.WorkOrderStatusClosed
		order.Info.EvaluationScore = evaluationScore
		order.Info.EvaluationNotes = evaluationNotes
		order.Info.EstimatedCost = estimatedCost
		evaluatedAt := time.Now()
		order.Info.EvaluatedAt = evaluatedAt

		// Add log entry
		details := fmt.Sprintf("Evaluation completed: score=%d, cost=%.2f", evaluationScore, estimatedCost)
		if evaluationNotes != "" {
			details += fmt.Sprintf(" | Notes: %s", evaluationNotes)
		}
		order.Logs.AddLog(userID, userName, model.LogActionStatusChangeToClosed, details, oldStatus, model.WorkOrderStatusClosed)

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
