# JobMaster Process

This document describes the test flows to be validated.

## Use Case 01: Super Admin Login

Precondition: System deployed, cold start, INIT_PASSWORD prepared in .env

System checks associated IAM system, finds no jobmaster related users

System calls IAM API to create jobmaster super admin, completes startup

User opens frontend page, system redirects to IAM, completes super admin login via agreement, obtains JWT token

User views tenant list

User creates tenant tenant1, 403 (super admin not allowed to perform business operations)

User creates main tenant admin admin@root

User views user list, can see main tenant admin user

User views logs, can see records of own login and main tenant admin creation

## Use Case 02: Main Tenant Admin Login

User logs in with main tenant admin account + common password

User creates following accounts

- Tenant tenant1/tenant2 admin personal accounts (admin@tenant1 / admin@tenant2)
- Contractor contractor1 / contractor2 / contractor3 sync login contractor admin personal accounts (admin@contractor1 / admin@contractor2 / admin@contractor3), note contractor is also a type of tenant in this system

User views tenant list, can see newly created tenants and contractors

User views user list, can see main tenant admin and tenant admin users, should not see super admin

User views logs, can see records of own login and creation of each tenant and admin

## Use Case 03: Tenant Admin Login

Precondition: Tenant tenant1 already created

User logs in with admin@tenant1 + common password

User views branch list (currently empty)

User creates branches branch1 / branch2, sync registers branch admin personal accounts (admin@branch1 / admin@branch2)

User views branch list, can see newly created branches

User views user list, can see tenant admin, branch admin, and contractor admin users, cannot see super admin or main tenant admin.

User searches with contractor1, can find contractor1 / contractor2 / contractor3

User assigns contractor1 to branch1 (requires impersonation)

User views contractor1 details, can see branch1 in business sources

User views branch1 details, can see related contractors include contractor1

User views logs, can see records of own login, branch and admin creation, contractor1 assignment

## Use Case 04: Branch Admin Login

Precondition: Branch branch1 already created

User logs in with admin@branch1 + common password

User calls API to enter admin interface (server assigns impersonation token)

User creates employee account employee1 (employee1@branch1)

User views user list, can see branch admin and employee users.

User exits admin interface (server regenerates normal token)

User views related contractors, can see contractor1

User assigns contractor1 to branch1 (requires impersonation)

User creates work orders 1, 2, assigns to contractor1

User views work order list, can see own created work orders 1, 2

User views logs, can see records of own login, employee creation, work order creation

## Use Case 05: Branch Employee Login

Precondition: Branch branch1 already created, employee already created

User logs in with employee1@branch1 common password

User views related contractors, can see contractor1

User creates work orders 3, 4, assigns to contractor1

User views logs, can see records of own login, work order creation

User views work order list, can see work orders 1~4 in pending status

User logs in with admin@branch1

User views logs can see employee1 created work orders

User views work order list, can see work orders 1~4 in pending status, each creator

## Use Case 06: Contractor Admin Login

Precondition: Contractor contractor1 already created

User logs in with admin@contractor1 + common password

User calls API to enter admin interface (server assigns impersonation token)

User creates employee account employee1 (employee1@contractor1)

User creates engineer accounts engineer1 (engineer1@contractor1) and engineer2 (engineer2@contractor1)

User views user list, can see contractor admin, employee, engineer users.

User searches with keyword contractor2, finds company contractor2

User adds company contractor2 to own vendor list (requires impersonation)

User views vendor list, can see contractor2

User exits admin interface (server regenerates normal token)

User views work order list, can see work orders 1~4 in pending status

User assigns work order 1 to Engineer1, 3 to contractor2

System starts WeChat call to Engineer1

User views work order list, can see work order 1 in assigned status, 3 in transferred status

User views logs, can see records of own login, employee creation, engineer user creation, vendor addition, work order assignment

## Use Case 07: Contractor Employee Login

Precondition: Contractor contractor1 already created, employee already created

User logs in with employee1@contractor1 + common password

User views work order list, can see work orders 1-4 where 2, 4 in pending status

User assigns work order 2 to Engineer2, 4 to contractor2

System starts WeChat call to Engineer2

User views work order list, can see work order 2 in assigned status, 4 in transferred status

User views logs, can see records of own login, work order assignment

## Use Case 08: Vendor Admin Login

Precondition: Vendor contractor2 already created

User logs in with admin@contractor2 + common password

User calls API to enter admin interface (server assigns impersonation token)

User creates employee account employee1 (employee1@contractor2)

User creates engineer accounts engineer1 (engineer1@contractor2) and engineer2 (engineer2@contractor2)

User views user list, can see vendor admin, employee, engineer users.

User exits admin interface (server regenerates normal token)

User views work order list, can see work orders 3, 4 in transferred status

User assigns work order 3 to Engineer1

System starts WeChat call to Engineer1

User views work order list, can see work order 3 in assigned status

User views logs, can see records of own login, employee creation, engineer user creation, work order assignment

## Use Case 09: Vendor Employee Login

Precondition: Vendor contractor2 already created, employee already created

User logs in with employee1@contractor2 + common password

User views work order list, can see work orders 3, 4 where 4 in transferred status

User assigns work order 4 to Engineer2

System starts WeChat call to Engineer2

User views work order list, can see work order 4 in assigned status

User views logs, can see records of own login, work order assignment

## Use Case 10: Maintenance Process

Precondition: Engineer receives WeChat call

Engineer logs in with engineerX@contractorY + common password

Engineer views work order list, can see work order X assigned to self

Engineer confirms order via API, sets appointment time

System automatically notifies branch branch1 (engineer, appointment time) where work order X creator belongs

employee1 logs in, views work order list, opens corresponding work order X, can see engineer and appointment time, clicks confirm

Server changes work order X status to accepted (generates log)

employee1 logs in, opens work order X, clicks generate arrival confirmation QR code, server generates QR code and returns to frontend for display

Engineer uses WeChat to scan, clicks arrive, WeChat enters working status, calls server to change corresponding work order status to working (generates log)

Engineer clicks work complete and depart on WeChat

Server changes corresponding work order status to acceptance (generates log)

employee logs in, opens work order X, clicks acceptance passed, server changes work order status to completed (generates log)

System automatically notifies engineer and their company.

---

## Permission Description: Associate Organizations

### Association Operations Require Impersonation

The following organization association operations must be completed under impersonation:

| Operation Type | Role | Impersonated Operation |
|----------------|------|------------------------|
| Assign contractor to branch | Tenant admin | Assign contractor to branch |
| Assign contractor to branch | Branch admin | Assign contractor to own branch |
| Add vendor to contractor | Contractor admin | Add vendor to contractor's vendor list |

### Association Relationships

```
Tenant
    │
    ├── Branch
    │       └── Related Contractor (Requires Impersonation)
    │
    └── Contractor
            └── Related Vendor (Requires Impersonation)
```

### Permission Notes

- **Tenant Admin**: Can assign contractors to branches (requires impersonation)
- **Branch Admin**: Can assign contractors to own branch (requires impersonation)
- **Contractor Admin**: Can add external vendors to own company (requires impersonation)
- **Regular Employee**: Cannot perform organization association operations