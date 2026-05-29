# AGENTS.md — AI Agent Rules

## Prohibited Actions

### State Machine Changes
**NEVER introduce a new work order status without explicit user approval.**
Adding new statuses (e.g., FORWARDED) causes cascading breakage across:
- Backend state transitions and service logic
- Frontend STATUS_CONFIG in multiple components
- API status filters (demo.ts)
- Test expectations
- Seed data

Current statuses:
```
PENDING → DISPATCHED → ACCEPTED → RESERVED → ARRIVED → WORKING → FINISHED → PENDING_EVALUATION → CLOSED
                                   ↕ OBSERVING
```

### Core Documents
- `docs/cases.md` — business use cases and expected flows (authoritative)
- `docs/demo_accounts.md` — demo user and organization definitions

Always cross-reference these before changing business logic.

### Feature Implementation Checklist
When implementing a feature described in an Issue:
1. **Identify the full call chain**: user action → frontend page/component → API endpoint → service → model
2. **Check existing UI**: read the relevant frontend page (mobile: `frontend-mobile/src/pages/`, PC: `frontend/src/pages/`) to understand what the user currently sees
3. **Backend-only != done**: if a feature involves data the user inputs or sees, the corresponding frontend form/display MUST be updated
 4. **Never assume the scope**: even if an Issue sounds backend-focused, verify whether the frontend needs changes too

### E2E Test Guidelines
When writing end-to-end tests, verify the **complete data flow** — not just HTTP status codes and backend state:

1. **Field-by-field API verification**: for every field the backend returns, assert it exists and has the correct value/type in the API response
2. **Frontend map integrity**: verify that `.map()` transformations in `fetchOrders`/`fetchStats` preserve ALL fields from the API (especially newly added ones like `owner_org_name`, `engineer_id`)
3. **Component-level display**: follow each API field to where it renders in the UI — check STATUS_CONFIG completeness, card/detail page template usage
4. **Role-based visibility**: test each role's view separately, verifying both what IS shown and what is NOT shown (permission boundaries)
5. **State transitions UI**: after each status change, verify the frontend renders the correct buttons/panels (canAssign/canDistribute logic) — not just the backend state machine
6. **Data persistence across refreshes**: verify that dispatch/assign operations persist after page reload — no window.location.reload() causing data loss
7. **All endpoints for a feature**: if a feature spans create/dispatch/assign, test each step through the full chain (not just the final state)

### Known Pitfalls
- `.map()` in frontend drops new API fields silently → list cards show stale/missing data
- `STATUS_CONFIG` drifts between pages (WorkOrderCard vs WorkOrderDetail vs EngineerHome)
- `canAssign`/`canDistribute` logic duplicated in useEffect AND render section — fix both copies
- Hardcoded user/org data in `mockData.ts` differs from seeded DB data
- `api/demo.ts` status filters explicitly exclude new statuses added to the backend
- **`_, _ :=` error ignore** — any `_` that swallows an error is a latent nil-pointer panic in production. Audit must REJECT any unchecked error in demo handlers (session lookup, DB lookup, etc.)
