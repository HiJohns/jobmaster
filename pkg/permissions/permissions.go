package permissions

import (
	"jobmaster/internal/model"
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
var PermissionMatrix = map[model.UserRole][]Action{
	model.UserRoleBrandHQ: {
		ActionOrderView,
		ActionUserCreate, ActionUserView, ActionUserUpdate, ActionUserDelete,
		ActionOrgView, ActionOrgManage,
		ActionReportView, ActionReportExport,
	},
	model.UserRoleStore: {
		ActionOrderCreate, ActionOrderView, ActionOrderApprove, ActionOrderReject, ActionOrderCancel,
		ActionUserView,
		ActionOrgView,
		ActionReportView,
	},
	model.UserRoleMainContractor: {
		ActionOrderView, ActionOrderDispatch,
		ActionUserCreate, ActionUserView, ActionUserUpdate,
		ActionOrgView, ActionOrgManage,
		ActionReportView, ActionReportExport,
	},
	model.UserRoleVendor: {
		ActionOrderView, ActionOrderExecute,
		ActionUserView,
		ActionOrgView,
		ActionReportView,
	},
	model.UserRoleEngineer: {
		ActionOrderView, ActionOrderExecute,
		ActionReportView,
	},
}

// HasPermission checks if a user has permission to perform an action
func HasPermission(user *model.User, action Action) bool {
	if user == nil || user.Status != model.UserStatusActive {
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
func CanPerformOrderAction(user *model.User, order *model.Order, action Action) bool {
	if !HasPermission(user, action) {
		return false
	}

	switch action {
	case ActionOrderCreate:
		return user.Role == model.UserRoleStore && user.Status == model.UserStatusActive
	case ActionOrderDispatch:
		return user.Role == model.UserRoleMainContractor && order.Status == model.OrderStatusPending
	case ActionOrderExecute:
		return (user.Role == model.UserRoleVendor || user.Role == model.UserRoleEngineer) &&
			(order.Status == model.OrderStatusReserved || order.Status == model.OrderStatusArrived)
	case ActionOrderApprove, ActionOrderReject:
		return user.Role == model.UserRoleStore && order.Status == model.OrderStatusObserving
	case ActionOrderCancel:
		// Store can cancel pending orders, MainContractor can cancel dispatched orders
		if user.Role == model.UserRoleStore && order.Status == model.OrderStatusPending {
			return true
		}
		if user.Role == model.UserRoleMainContractor && order.Status == model.OrderStatusDispatched {
			return true
		}
		return false
	}

	return false
}

// GetAllowedActions returns all actions a user can perform
func GetAllowedActions(user *model.User) []Action {
	if user == nil || user.Status != model.UserStatusActive {
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
func GetOrderStatusPermissions(status model.OrderStatus) []Action {
	switch status {
	case model.OrderStatusPending:
		return []Action{ActionOrderView, ActionOrderDispatch, ActionOrderCancel}
	case model.OrderStatusDispatched:
		return []Action{ActionOrderView, ActionOrderDispatch, ActionOrderCancel}
	case model.OrderStatusReserved:
		return []Action{ActionOrderView, ActionOrderExecute}
	case model.OrderStatusArrived:
		return []Action{ActionOrderView, ActionOrderExecute}
	case model.OrderStatusWorking:
		return []Action{ActionOrderView, ActionOrderExecute}
	case model.OrderStatusFinished:
		return []Action{ActionOrderView}
	case model.OrderStatusObserving:
		return []Action{ActionOrderView, ActionOrderApprove, ActionOrderReject}
	case model.OrderStatusClosed:
		return []Action{ActionOrderView}
	default:
		return []Action{ActionOrderView}
	}
}
