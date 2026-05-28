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
