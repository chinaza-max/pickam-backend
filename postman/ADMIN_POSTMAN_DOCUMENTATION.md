# PickAm Backend — Special Admin API Postman Documentation

This document provides a comprehensive, standalone specification for all **Admin APIs**, **Admin Privilege Levels**, and **Role-Based Access Control (RBAC)** across the PickAm delivery platform microservices.

---

## 1. Overview & Architecture

The Admin API provides central administration, user governance, zone & landmark logistics management, fixed zone pricing matrix management, dispatch rider assignments, financial wallet audits, notification audits, and platform analytics.

### Base URLs & Routing
* **Unified API Gateway (Recommended):** `http://localhost:3000`
* **Direct Admin Microservice (Isolation Testing):** `http://localhost:3005`
* **User Service (Admin User Management):** `http://localhost:3001`
* **Wallet Service (Admin Financial Audits):** `http://localhost:3002`
* **Order Service (Admin Order Assignments):** `http://localhost:3003`

All admin requests passing through the API Gateway (`http://localhost:3000`) require a valid JWT bearer token in the HTTP header:
```http
Authorization: Bearer {{accessToken}}
```

---

## 2. Admin Privilege System & Role-Based Access Control (RBAC)

PickAm implements a granular privilege and role hierarchy for administrative accounts. Admin accounts are categorized into Admin Roles with corresponding `AdminPrivilege` permissions.

### Admin Roles & Privileges Matrix

| Admin Role | `UserRole` / Enum | Granted `AdminPrivilege` Scope | Module Scope |
|---|---|---|---|
| **Super Admin** | `SUPER_ADMIN` / `ADMIN` | `SUPER_ADMIN` (All privileges) | Full platform administration |
| **Operations Admin** | `OPERATIONS_ADMIN` | `OPERATIONS` | Zones, Landmarks, Rider Zones, Order Assignments, Rider Directory |
| **Finance Admin** | `FINANCE_ADMIN` | `FINANCE` | Pricing Matrix, Price Calculator, User Wallets, System Transaction Audit Logs |
| **Support Admin** | `SUPPORT_ADMIN` | `USER_MANAGEMENT`, `SUPPORT` | User Accounts, User Profiles, User Orders, System Notification Audit Logs |

---

### Detailed Privilege Breakdown (`AdminPrivilege` Enum)

1. **`SUPER_ADMIN`**
   * Unrestricted system-wide access.
   * Ability to grant/revoke admin roles and assign custom privileges to other admins.
   * Access to all dashboard metrics, financial logs, system configuration, and deletion features.

2. **`USER_MANAGEMENT`**
   * Query, search, and filter user accounts (`GET /admin/users`).
   * View user detail profiles (`GET /admin/users/:id`).
   * Update user details and roles (`PUT /admin/users/:id`).
   * Suspend and re-activate user accounts (`POST /admin/users/:id/suspend`, `POST /admin/users/:id/activate`).
   * Soft-delete user accounts (`DELETE /admin/users/:id`).

3. **`OPERATIONS`**
   * Configure delivery zones (`POST /admin/zones`, `PUT /admin/zones/:id`, `GET /admin/zones`).
   * Create and list landmarks within zones (`POST /admin/landmarks`, `GET /admin/landmarks`).
   * Assign dispatch riders to operating zones (`POST /admin/riders/:userId/zones`, `GET /admin/riders/:userId/zones`).
   * Manually pair/assign riders to pending orders (`POST /orders/:id/assign-rider`).
   * View rider directory (`GET /admin/riders`).

4. **`FINANCE`**
   * Define zone-to-zone fixed pricing rules (`POST /admin/pricing`, `PUT /admin/pricing/:id`, `GET /admin/pricing`).
   * Calculate landmark-to-landmark pricing (`GET /admin/pricing/calculate`).
   * View individual user wallet balances and SafeHaven virtual accounts (`GET /admin/users/:id/wallet`).
   * System-wide wallet transaction audit log inspection (`GET /admin/wallets/transactions`).

5. **`SUPPORT`**
   * User lookup and status check.
   * View user order history (`GET /admin/users/:id/orders`).
   * View system-wide notification dispatch logs (`GET /admin/notifications`).

---

## 3. Postman Environment & Collection Setup

### Collection Variables

| Variable | Recommended Default | Description |
|---|---|---|
| `gatewayUrl` | `http://localhost:3000` | Unified API Gateway endpoint |
| `accessToken` | *Auto-populated* | JWT Token retrieved after running **Login as Admin** |
| `userId` | `usr_abc123` | Target user ID for user management requests |
| `zoneId` | `zone_001` | Created delivery zone ID |
| `landmarkId` | `lm_001` | Created landmark ID |
| `orderId` | `ord_001` | Target order ID for assignment |

---

## 4. Admin API Endpoint Specifications

---

### Section 1: Admin User Management

#### 1.1 List All Users (Paginated, Searchable & Filterable)
* **HTTP Method:** `GET`
* **Route:** `/admin/users`
* **Privilege Required:** `USER_MANAGEMENT` or `SUPER_ADMIN`

##### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |
| `search` | string | `""` | Search in full name, email, phone number, user ID |
| `role` | string | `""` | Filter by `CUSTOMER`, `RIDER`, `ADMIN`, `SUPER_ADMIN` |
| `status` | string | `""` | Filter by `ACTIVE`, `SUSPENDED` |
| `verified` | boolean | `""` | Filter by `true` or `false` |
| `sort` | string | `createdAt` | Field to sort by (`createdAt`, `email`, `status`) |
| `order` | string | `desc` | Sort direction (`asc` or `desc`) |
| `startDate` | ISO Date | `""` | Registration start date (e.g. `2026-07-01`) |
| `endDate` | ISO Date | `""` | Registration end date (e.g. `2026-07-31`) |

##### Example Request (cURL)
```bash
curl -X GET "http://localhost:3000/admin/users?page=1&limit=20&role=CUSTOMER&status=ACTIVE&search=John" \
  -H "Authorization: Bearer {{accessToken}}"
```

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "usr_abc123",
      "email": "john@example.com",
      "role": "CUSTOMER",
      "status": "ACTIVE",
      "isVerified": true,
      "lastLoginAt": "2026-07-28T00:00:00.000Z",
      "createdAt": "2026-06-01T00:00:00.000Z",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "phoneNumber": "+2348012345678",
        "avatarUrl": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

---

#### 1.2 Get User by ID
* **HTTP Method:** `GET`
* **Route:** `/admin/users/:id`
* **Privilege Required:** `USER_MANAGEMENT` or `SUPPORT` or `SUPER_ADMIN`

##### Example Request (cURL)
```bash
curl -X GET "http://localhost:3000/admin/users/usr_abc123" \
  -H "Authorization: Bearer {{accessToken}}"
```

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "john@example.com",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "isVerified": true,
    "createdAt": "2026-06-01T00:00:00.000Z",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+2348012345678"
    },
    "riderProfile": null
  }
}
```

---

#### 1.3 Update User Account (Role, Status, Privileges, Profile)
* **HTTP Method:** `PUT`
* **Route:** `/admin/users/:id`
* **Privilege Required:** `USER_MANAGEMENT` or `SUPER_ADMIN`

##### Request Body (JSON)
```json
{
  "role": "ADMIN",
  "privileges": ["OPERATIONS", "FINANCE"],
  "status": "ACTIVE",
  "isVerified": true,
  "firstName": "John",
  "lastName": "Doe Updated",
  "phoneNumber": "+2348099887766"
}
```

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "email": "john@example.com",
    "role": "ADMIN",
    "privileges": ["OPERATIONS", "FINANCE"],
    "status": "ACTIVE",
    "isVerified": true,
    "profile": {
      "firstName": "John",
      "lastName": "Doe Updated",
      "phoneNumber": "+2348099887766"
    }
  }
}
```

---

#### 1.4 Suspend User Account
* **HTTP Method:** `POST`
* **Route:** `/admin/users/:id/suspend`
* **Privilege Required:** `USER_MANAGEMENT` or `SUPER_ADMIN`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "status": "SUSPENDED"
  }
}
```

---

#### 1.5 Activate User Account
* **HTTP Method:** `POST`
* **Route:** `/admin/users/:id/activate`
* **Privilege Required:** `USER_MANAGEMENT` or `SUPER_ADMIN`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "status": "ACTIVE"
  }
}
```

---

#### 1.6 Soft Delete User Account
* **HTTP Method:** `DELETE`
* **Route:** `/admin/users/:id`
* **Privilege Required:** `SUPER_ADMIN`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "usr_abc123",
    "deleted": true
  }
}
```

---

#### 1.7 View User Wallet Details
* **HTTP Method:** `GET`
* **Route:** `/admin/users/:id/wallet`
* **Privilege Required:** `FINANCE` or `SUPER_ADMIN`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "usr_abc123",
    "balance": 12500.00,
    "virtualAccount": {
      "bankName": "SafeHaven MFB",
      "accountName": "John Doe",
      "accountNumber": "9012345678"
    }
  }
}
```

---

#### 1.8 View User Order History
* **HTTP Method:** `GET`
* **Route:** `/admin/users/:id/orders`
* **Privilege Required:** `SUPPORT` or `SUPER_ADMIN`

##### Query Parameters
* `page` (default: `1`)
* `limit` (default: `20`)
* `status` (optional: `PENDING`, `ASSIGNED`, `PICKED_UP`, `DELIVERED`, `CANCELLED`)

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "ord_1720137600000_4521",
      "status": "DELIVERED",
      "amount": 2500.00,
      "createdAt": "2026-07-05T01:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

---

### Section 2: Operations & Logistics Management

#### 2.0.1 Fetch All Nigerian States (Native `country-state-city` Package)
* **HTTP Method:** `GET`
* **Route:** `/states/nigeria`
* **Privilege Required:** Public / None

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "name": "Lagos",
      "code": "LA",
      "fullName": "Lagos State",
      "countryCode": "NG",
      "latitude": "6.5244",
      "longitude": "3.3792"
    },
    {
      "name": "Enugu",
      "code": "EN",
      "fullName": "Enugu State",
      "countryCode": "NG",
      "latitude": "6.4584",
      "longitude": "7.5464"
    }
  ],
  "error": null
}
```

#### 2.0.2 Bulk Seed All Nigerian States
* **HTTP Method:** `POST`
* **Route:** `/admin/states/seed-nigeria`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "message": "Successfully seeded 37 Nigerian states",
    "count": 37
  },
  "error": null
}
```

#### 2.0.3 Create State
* **HTTP Method:** `POST`
* **Route:** `/admin/states`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Request Body (JSON)
```json
{
  "name": "Enugu",
  "code": "EN",
  "status": "ACTIVE"
}
```

##### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "state_001",
    "name": "Enugu",
    "code": "EN",
    "status": "ACTIVE",
    "createdAt": "2026-08-05T00:00:00.000Z"
  },
  "error": null
}
```

#### 2.0.4 List States (With Zones)
* **HTTP Method:** `GET`
* **Route:** `/states` or `/admin/states`
* **Privilege Required:** Public / `OPERATIONS`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "state_001",
      "name": "Enugu",
      "code": "EN",
      "status": "ACTIVE",
      "zones": [
        { "id": "zone_001", "name": "New Haven", "status": "ACTIVE" }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 40, "total": 1, "totalPages": 1, "hasNext": false, "hasPrevious": false }
}
```

#### 2.1 Create Zone
* **HTTP Method:** `POST`
* **Route:** `/admin/zones`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Request Body (JSON)
```json
{
  "name": "New Haven",
  "stateId": "state_001",
  "basePrice": 800
}
```

##### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "zone_001",
    "name": "New Haven",
    "basePrice": 800,
    "status": "ACTIVE",
    "createdAt": "2026-07-28T00:00:00.000Z"
  }
}
```

---

#### 2.2 Update Zone
* **HTTP Method:** `PUT`
* **Route:** `/admin/zones/:id`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Request Body (JSON)
```json
{
  "name": "New Haven Central",
  "basePrice": 1000,
  "status": "ACTIVE"
}
```

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "zone_001",
    "name": "New Haven Central",
    "basePrice": 1000,
    "status": "ACTIVE"
  }
}
```

---

#### 2.3 List Delivery Zones
* **HTTP Method:** `GET`
* **Route:** `/admin/zones`
* **Privilege Required:** Authenticated Admin

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    { "id": "zone_001", "name": "New Haven Central", "basePrice": 1000, "status": "ACTIVE" },
    { "id": "zone_002", "name": "Independence Layout", "basePrice": 1200, "status": "ACTIVE" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 2, "totalPages": 1 }
}
```

---

#### 2.4 Create Landmark
* **HTTP Method:** `POST`
* **Route:** `/admin/landmarks`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Request Body (JSON)
```json
{
  "name": "Roban Stores Independence Layout",
  "zoneId": "zone_002"
}
```

##### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "lm_001",
    "name": "Roban Stores Independence Layout",
    "zoneId": "zone_002",
    "createdAt": "2026-07-28T00:00:00.000Z"
  }
}
```

---

#### 2.5 List Landmarks
* **HTTP Method:** `GET`
* **Route:** `/admin/landmarks`
* **Privilege Required:** Authenticated Admin

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    { "id": "lm_001", "name": "Roban Stores", "zoneId": "zone_002" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

#### 2.6 Assign Rider Operating Zones
* **HTTP Method:** `POST`
* **Route:** `/admin/riders/:userId/zones`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Request Body (JSON)
```json
{
  "zoneIds": ["zone_001", "zone_002"]
}
```

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "usr_rider_001",
    "assignedZones": ["zone_001", "zone_002"]
  }
}
```

---

#### 2.7 Get Rider Operating Zones
* **HTTP Method:** `GET`
* **Route:** `/admin/riders/:userId/zones`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "usr_rider_001",
    "zones": [
      { "id": "zone_001", "name": "New Haven Central" },
      { "id": "zone_002", "name": "Independence Layout" }
    ]
  }
}
```

---

#### 2.8 Assign Rider to Order
* **HTTP Method:** `POST`
* **Route:** `/orders/:id/assign-rider`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Request Body (JSON)
```json
{
  "riderId": "usr_rider_001"
}
```

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "ord_1720137600000_4521",
    "status": "ASSIGNED",
    "riderId": "usr_rider_001",
    "assignedAt": "2026-07-28T00:00:00.000Z"
  }
}
```

---

#### 2.9 List All Riders
* **HTTP Method:** `GET`
* **Route:** `/admin/riders`
* **Privilege Required:** `OPERATIONS` or `SUPER_ADMIN`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "userId": "usr_rider_001",
      "firstName": "Emeka",
      "lastName": "Okafor",
      "email": "emeka@example.com",
      "vehicleType": "BIKE",
      "status": "ONLINE",
      "accountStatus": "ACTIVE"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

---

### Section 3: Pricing Matrix & Financial Management

> Zone-to-Zone pricing lives in the `PricingMatrix` table. Each row maps a `fromZone` → `toZone` pair to a flat `price`.
> Same-zone deliveries use the zone's own `basePrice` (set when creating/updating a Zone).

---

#### 3.1 Create Zone-to-Zone Pricing Rule
* **HTTP Method:** `POST`
* **Route:** `/admin/pricing`
* **Privilege Required:** `ADMIN`
* **Note:** Returns `400` if a rule for this `fromZoneId → toZoneId` pair already exists.

##### Request Body (JSON)
```json
{
  "fromZoneId": "c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d",
  "toZoneId": "4adcca41-7d8d-481a-b8cf-b7162a35c9d4",
  "price": 1200,
  "status": "ACTIVE"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `fromZoneId` | string (UUID) | Yes | Origin zone ID |
| `toZoneId` | string (UUID) | Yes | Destination zone ID |
| `price` | number | Yes | Flat delivery price in Naira |
| `status` | string | No | `ACTIVE` (default) or `INACTIVE` |

##### Success Response (201 Created)
```json
{
  "id": "pm_uuid_001",
  "price": 1200,
  "status": "ACTIVE",
  "createdAt": "2026-08-06T00:00:00.000Z",
  "updatedAt": "2026-08-06T00:00:00.000Z",
  "fromZone": {
    "id": "c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d",
    "name": "zuba",
    "status": "ACTIVE"
  },
  "toZone": {
    "id": "4adcca41-7d8d-481a-b8cf-b7162a35c9d4",
    "name": "kubwa",
    "status": "ACTIVE"
  }
}
```

##### Error — Duplicate Route (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "A pricing rule for this zone-to-zone route already exists (id: pm_uuid_001). Use PUT /admin/pricing/pm_uuid_001 to update it."
}
```

---

#### 3.2 Get Pricing Rule by ID
* **HTTP Method:** `GET`
* **Route:** `/admin/pricing/:id`
* **Privilege Required:** `ADMIN`

##### Success Response (200 OK)
```json
{
  "id": "pm_uuid_001",
  "price": 1200,
  "status": "ACTIVE",
  "createdAt": "2026-08-06T00:00:00.000Z",
  "updatedAt": "2026-08-06T00:00:00.000Z",
  "fromZone": {
    "id": "c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d",
    "name": "zuba",
    "status": "ACTIVE"
  },
  "toZone": {
    "id": "4adcca41-7d8d-481a-b8cf-b7162a35c9d4",
    "name": "kubwa",
    "status": "ACTIVE"
  }
}
```

---

#### 3.3 Update Zone-to-Zone Pricing Rule
* **HTTP Method:** `PUT`
* **Route:** `/admin/pricing/:id`
* **Privilege Required:** `ADMIN`
* **Note:** All fields optional — only provided fields are updated (partial patch).

##### Request Body (JSON)
```json
{
  "price": 1500,
  "status": "ACTIVE"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `fromZoneId` | string (UUID) | No | Change origin zone |
| `toZoneId` | string (UUID) | No | Change destination zone |
| `price` | number | No | New flat price in Naira |
| `status` | string | No | `ACTIVE` or `INACTIVE` |

##### Success Response (200 OK)
```json
{
  "id": "pm_uuid_001",
  "price": 1500,
  "status": "ACTIVE",
  "createdAt": "2026-08-06T00:00:00.000Z",
  "updatedAt": "2026-08-06T00:10:00.000Z",
  "fromZone": {
    "id": "c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d",
    "name": "zuba",
    "status": "ACTIVE"
  },
  "toZone": {
    "id": "4adcca41-7d8d-481a-b8cf-b7162a35c9d4",
    "name": "kubwa",
    "status": "ACTIVE"
  }
}
```

---

#### 3.4 List All Pricing Rules (Paginated)
* **HTTP Method:** `GET`
* **Route:** `/admin/pricing`
* **Privilege Required:** `ADMIN`

##### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Results per page (max 100) |
| `status` | string | — | Filter: `ACTIVE` or `INACTIVE` |
| `zoneId` | string | — | Filter rules involving a zone (as origin or destination) |
| `sort` | string | `createdAt` | Sort field |
| `order` | string | `desc` | `asc` or `desc` |

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "pm_uuid_001",
      "price": 1500,
      "status": "ACTIVE",
      "createdAt": "2026-08-06T00:00:00.000Z",
      "updatedAt": "2026-08-06T00:10:00.000Z",
      "fromZone": { "id": "c1c3d2a6-...", "name": "zuba", "status": "ACTIVE" },
      "toZone": { "id": "4adcca41-...", "name": "kubwa", "status": "ACTIVE" }
    },
    {
      "id": "pm_uuid_002",
      "price": 800,
      "status": "ACTIVE",
      "createdAt": "2026-08-05T22:00:00.000Z",
      "updatedAt": "2026-08-05T22:00:00.000Z",
      "fromZone": { "id": "4adcca41-...", "name": "kubwa", "status": "ACTIVE" },
      "toZone": { "id": "c1c3d2a6-...", "name": "zuba", "status": "ACTIVE" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

---

#### 3.5 Delete Pricing Rule
* **HTTP Method:** `DELETE`
* **Route:** `/admin/pricing/:id`
* **Privilege Required:** `ADMIN`

##### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Pricing matrix pm_uuid_001 deleted successfully"
}
```

---

#### 3.6 Calculate Delivery Price (Public)
* **HTTP Method:** `GET`
* **Route:** `/admin/pricing/calculate`
* **Privilege Required:** Public — no authentication required

##### Logic
1. **Same zone**: returns the zone's `basePrice`
2. **Different zones**: looks up the `PricingMatrix`; returns `400` if no rule is configured

##### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `fromLandmarkId` | string (UUID) | Yes | Pickup landmark |
| `toLandmarkId` | string (UUID) | Yes | Drop-off landmark |

##### Success Response — Same Zone (200 OK)
```json
{
  "fromLandmarkId": "lm_uuid_001",
  "toLandmarkId": "lm_uuid_002",
  "fromZoneId": "c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d",
  "toZoneId": "c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d",
  "price": 500,
  "amount": 500
}
```

##### Success Response — Cross-Zone (200 OK)
```json
{
  "fromLandmarkId": "lm_uuid_001",
  "toLandmarkId": "lm_uuid_003",
  "fromZoneId": "c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d",
  "toZoneId": "4adcca41-7d8d-481a-b8cf-b7162a35c9d4",
  "price": 1500,
  "amount": 1500
}
```

##### Error — Route Not Configured (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Delivery route between these zones has not been configured"
}
```

---


#### 3.7 System Wallet Transactions Audit Log
* **HTTP Method:** `GET`
* **Route:** `/admin/wallets/transactions`
* **Privilege Required:** `FINANCE` or `SUPER_ADMIN`

##### Query Parameters
* `page` (default: `1`)
* `limit` (default: `20`)
* `userId` (optional: filter by user)
* `type` (optional: `DEBIT`, `CREDIT`)
* `status` (optional: `SUCCESS`, `PENDING`, `FAILED`)

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "tx_001",
      "walletId": "wlt_abc123",
      "amount": 2500.00,
      "type": "DEBIT",
      "status": "SUCCESS",
      "reference": "ord_1720137600000_4521",
      "description": "Debit for order: ord_1720137600000_4521",
      "createdAt": "2026-07-28T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 250,
    "totalPages": 13,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

### Section 4: System Audit Logs & Dashboard Analytics

#### 4.1 System Notification Audit Log
* **HTTP Method:** `GET`
* **Route:** `/admin/notifications`
* **Privilege Required:** `SUPPORT` or `SUPER_ADMIN`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_001",
      "userId": "usr_abc123",
      "title": "Order Placed",
      "type": "PUSH",
      "status": "SENT",
      "createdAt": "2026-07-28T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

---

#### 4.2 Admin Dashboard Analytics
* **HTTP Method:** `GET`
* **Route:** `/admin/dashboard`
* **Privilege Required:** `SUPER_ADMIN`, `OPERATIONS`, `FINANCE`, `SUPPORT`

##### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "activeZones": 8,
    "activeLandmarks": 64,
    "totalRegisteredUsers": 142,
    "totalRegisteredRiders": 28,
    "activeDeliveries": 15,
    "completedDeliveries": 843,
    "totalRevenueUnits": 1452500
  }
}
```

---

## 5. Summary of HTTP Error Codes

| Status Code | Message | Description |
|---|---|---|
| **401 Unauthorized** | `Unauthorized` | Missing or invalid JWT token |
| **403 Forbidden** | `Required role [ADMIN] not matched` | Insufficient admin privileges |
| **404 Not Found** | `Resource not found` | Invalid user ID, zone ID, or landmark ID |
| **400 Bad Request** | `Validation failed` | Invalid parameter payload or missing body field |
