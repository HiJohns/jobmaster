# JobMaster Models

## Five-Party Organization Model

This package defines the data models for the JobMaster (工单匠) five-party collaboration system.

### Entity Relationships

```
BrandHQ (总店)
    │
    ├── has many → Store (分店)
    │       │
    │       ├── has many → User
    │       └── has many → Order
    │
    └── has many → User

MainContractor (工程公司)
    │
    ├── has many → Vendor (供应商)
    │       │
    │       ├── has many → Engineer (工程师)
    │       │       │
    │       │       └── belongs to → User
    │       │
    │       ├── has many → User
    │       └── has many → Order
    │
    ├── has many → User
    └── has many → Order

Order (工单) - Central Entity
    ├── belongs to → Store (creator)
    ├── belongs to → MainContractor (dispatcher)
    ├── belongs to → Vendor (assigned)
    └── belongs to → Engineer (executor)
```

### Roles

| Role | Code | Description |
|------|------|-------------|
| Brand HQ | `brand_hq` | Global configuration, cross-region coordination |
| Store | `store` | Order creation, on-site coordination, final approval |
| Main Contractor | `main_contractor` | Order assessment, vendor assignment |
| Vendor | `vendor` | Execution, check-in, work records |
| Engineer | `engineer` | Field work, progress reporting |

### Order State Machine

```
PENDING → DISPATCHED → RESERVED → ARRIVED → WORKING → FINISHED → OBSERVING → CLOSED
              ↑______________________________________________________________|
```

### Key Design Decisions

1. **JSONB Fields**: Flexible data storage for equipment info, contact details, and settings
2. **Soft Deletes**: All entities use `gorm.DeletedAt` for audit trails
3. **Status Tracking**: Explicit status fields for workflow management
4. **Foreign Key Relationships**: Clear ownership and association chains

### Usage

```go
import "jobmaster/internal/models"

// Create a new order
order := &models.Order{
    StoreID:     storeID,
    Status:      models.OrderStatusPending,
    EquipmentInfo: datatypes.JSON(`{"type": "HVAC", "model": "ABC-123"}`),
    IsUrgent:    true,
}

// Check permissions
if user.CanCreateOrder() {
    // Allow order creation
}
```
