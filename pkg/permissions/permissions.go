package permissions

import (
	"jobmaster/internal/models"
)

// Action represents a system action
type Action string

const (
	// Order actions
	ActionOrderCreate   Action = "order:create"
	ActionOrderView     Action = "order:view"
	ActionOrderDispatch Action = "order:dispatch"
	ActionOrderExecute  Action = "order:execute"
	ActionOrderApprove  Action = "order:approve"
	ActionOrderReject   Action = "order:reject"
	ActionOrderCancel   Action = "order:cancel"

	// User management actions
	ActionUserCreate Action = "user:create"
	ActionUserView   Action = "user:view"
	ActionUserUpdate Action = "user:update"
	ActionUserDelete Action = "user:delete"

	// Organization actions
	ActionOrgView   Action = "org:view"
	ActionOrgManage Action = "org:manage"

	// Report actions
	ActionReportView   Action = "report:view"
	ActionReportExport Action = "report:export"
)

// PermissionMatrix defines what actions each role can perform
var PermissionMatrix = map[models.Role][]Action{
	models.RoleBrandHQ: {
		ActionOrderView,
		ActionUserCreate, ActionUserView, ActionUserUpdate, ActionUserDelete,
		ActionOrgView, ActionOrgManage,
		ActionReportView, ActionReportExport,
	},
	models.RoleStore: {
		ActionOrderCreate, ActionOrderView, ActionOrderApprove, ActionOrderReject, ActionOrderCancel,
		ActionUserView,
		ActionOrgView,
		ActionReportView,
	},
	models.RoleMainContractor: {
		ActionOrderView, ActionOrderDispatch,
		ActionUserCreate, ActionUserView, ActionUserUpdate,
		ActionOrgView, ActionOrgManage,
		ActionReportView, ActionReportExport,
	},
	models.RoleVendor: {
		ActionOrderView, ActionOrderExecute,
		ActionUserView,
		ActionOrgView,
		ActionReportView,
	},
	models.RoleEngineer: {
		ActionOrderView, ActionOrderExecute,
		ActionReportView,
	},
}

// HasPermission checks if a user has permission to perform an action
func HasPermission(user *models.User, action Action) bool {
	if user == nil || user.Status != models.UserStatusActive {
		return false
	}

	allowedActions, exists := PermissionMatrix[user.Role]
	if !exists {
		return false
	}

	for _, allowedAction := range allowedActions {
		if allowedAction == action {
			return true
		}
	}
	return false
}

// CanPerformOrderAction checks if user can perform a specific order action based on order status
func CanPerformOrderAction(user *models.User, order *models.Order, action Action) bool {
	if !HasPermission(user, action) {
		return false
	}

	switch action {
	case ActionOrderCreate:
		return user.CanCreateOrder()
	case ActionOrderDispatch:
		return user.CanDispatchOrder() && order.Status == models.OrderStatusPending
	case ActionOrderExecute:
		return user.CanExecuteOrder() && (order.Status == models.OrderStatusReserved || order.Status == models.OrderStatusArrived)
	case ActionOrderApprove, ActionOrderReject:
		return user.CanApproveOrder() && order.Status == models.OrderStatusObserving
	case ActionOrderCancel:
		// Store can cancel pending orders, MainContractor can cancel dispatched orders
		if user.Role == models.RoleStore && order.Status == models.OrderStatusPending {
			return true
		}
		if user.Role == models.RoleMainContractor && order.Status == models.OrderStatusDispatched {
			return true
		}
		return false
	}

	return false
}

// GetAllowedActions returns all actions a user can perform
func GetAllowedActions(user *models.User) []Action {
	if user == nil || user.Status != models.UserStatusActive {
		return []Action{}
	}

	actions, exists := PermissionMatrix[user.Role]
	if !exists {
		return []Action{}
	}

	// Return a copy to prevent modification
	result := make([]Action, len(actions))
	copy(result, actions)
	return result
}

// GetOrderStatusPermissions returns what actions can be performed on an order in a specific status
func GetOrderStatusPermissions(status models.OrderStatus) []Action {
	switch status {
	case models.OrderStatusPending:
		return []Action{ActionOrderView, ActionOrderDispatch, ActionOrderCancel}
	case models.OrderStatusDispatched:
		return []Action{ActionOrderView, ActionOrderDispatch, ActionOrderCancel}
	case models.OrderStatusReserved:
		return []Action{ActionOrderView, ActionOrderExecute}
	case models.OrderStatusArrived:
		return []Action{ActionOrderView, ActionOrderExecute}
	case models.OrderStatusWorking:
		return []Action{ActionOrderView, ActionOrderExecute}
	case models.OrderStatusFinished:
		return []Action{ActionOrderView}
	case models.OrderStatusObserving:
		return []Action{ActionOrderView, ActionOrderApprove, ActionOrderReject}
	case models.OrderStatusClosed:
		return []Action{ActionOrderView}
	default:
		return []Action{ActionOrderView}
	}
}
