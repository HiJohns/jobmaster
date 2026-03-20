# Integration Flow Test - Account List

Generated: 2026-03-20

Tenant: Tenant_Alpha

## Account Summary

| Level | Role | Email | Password | Org Type | Org ID | User ID |
|-------|------|-------|----------|----------|--------|---------|
| Platform | OWNER | owner@jobmaster.local | admin123 | PLATFORM | | 00000000-0000-0000-0000-000000000003 |
| Platform | ADMIN | admin@jobmaster.local | admin123 | PLATFORM | | 00000000-0000-0000-0000-000000000004 |
| Tenant | BRAND_HQ | brand_hq@tenantalpha.com | Alpha123456 | HQ | (auto-created with tenant) | (auto-created) |
| Store | STORE | store_mg@store001.test | StoreMG123 | STORE | (created in test) | (created in test) |
| Engineering | MAIN_CONTRACTOR | eng_mg@engorg.test | EngMG123 | MAIN_CONTRACTOR | (created in test) | (created in test) |
| Vendor | VENDOR | supp_mg_a@suppa.test | SuppMGA123 | VENDOR | (created in test) | (created in test) |
| Vendor | VENDOR | supp_mg_b@suppb.test | SuppMGB123 | VENDOR | (created in test) | (created in test) |
| Worker | ENGINEER | worker_a@suppa.test | WorkerA123 | VENDOR | (created in test) | (created in test) |
| Worker | ENGINEER | worker_b@suppb.test | WorkerB123 | VENDOR | (created in test) | (created in test) |

## Test Chain Summary

1. **SYS_ADMIN** (owner/admin) logs in
2. **SYS_ADMIN** creates Tenant: Tenant_Alpha
3. **BRAND_HQ** (auto-created tenant admin) logs in
4. **BRAND_HQ** creates Store: Store_001
5. **BRAND_HQ** creates Store Manager (STORE role)
6. **STORE_MG** logs in
7. **BRAND_HQ** creates Engineering Org: ENG_ORG
8. **BRAND_HQ** creates ENG_MG (MAIN_CONTRACTOR role)
9. **ENG_MG** logs in
10. **ENG_MG** creates Supp_A and Supp_B (VENDOR organizations)
11. **ENG_MG** creates SUPP_MG for both vendors
12. **SUPP_MG_A** logs in
13. **SUPP_MG_A** creates WORKER_A (ENGINEER role)
14. **SUPP_MG_B** logs in
15. **SUPP_MG_B** creates WORKER_B (ENGINEER role)

## Running the Test

```bash
# Clean database and run full integration flow
FORCE_RESEED=true JWT_SECRET=test-secret-key go test ./tests/httptest -run TestIntegrationFlow -v
```

## Notes

- Test creates a complete hierarchy from platform admin to field workers
- All entities are created via API calls as per the task requirements
- Test validates tenant_id consistency across all levels
- Test includes permission isolation checks
- Database state persists after test (transaction is committed)
