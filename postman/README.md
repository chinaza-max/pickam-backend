# Postman Documentation

This directory contains the complete Postman collection and dedicated documentation to interact with all the PickAm Backend microservices, Admin Panel APIs, and the SafeHaven MFB Integration.

---

## 🌟 Dedicated API Guides

- 📍 **[LOCATION_USER_DOCUMENTATION.md](file:///Users/macbookpro/Downloads/programming/test/pickam-backend/postman/LOCATION_USER_DOCUMENTATION.md)**: User-facing guide for Coordinate Geocoding (Nominatim), State → Zones resolution, and Zone → Landmarks discovery.
- 👑 **[ADMIN_POSTMAN_DOCUMENTATION.md](file:///Users/macbookpro/Downloads/programming/test/pickam-backend/postman/ADMIN_POSTMAN_DOCUMENTATION.md)**: Exhaustive Admin Panel documentation, RBAC matrix, and management APIs.


---

## Collection Location
The JSON file is located at:
* **[pickam_backend.postman_collection.json](file:///Users/macbookpro/Downloads/programming/test/pickam-backend/postman/pickam_backend.postman_collection.json)**

---

## How to Import

1. Open Postman.
2. Click the **Import** button in the top-left corner.
3. Select and upload the file: `postman/pickam_backend.postman_collection.json` (or drag and drop it).
4. Click **Import** to add the collection to your workspace.

---

## Admin Privilege Levels & Role-Based Access Control (RBAC)

Admin users can be assigned specific roles and privileges depending on their responsibilities:

| Admin Privilege Level | Enum / Role Name | Description & Allowed API Scope |
|---|---|---|
| 👑 **Super Admin** | `SUPER_ADMIN` | Full access across all modules: user management, zones, landmarks, pricing, orders, wallets, notifications & analytics. |
| 🚚 **Operations Admin** | `OPERATIONS_ADMIN` / `OPERATIONS` | Logistics & dispatch: create/update zones & landmarks, assign riders to operating zones, assign riders to orders. |
| 💳 **Finance Admin** | `FINANCE_ADMIN` / `FINANCE` | Platform economics: define zone pricing matrix, calculate prices, inspect user wallets & system wallet transaction audit logs. |
| 🎧 **Support Admin** | `SUPPORT_ADMIN` / `SUPPORT` | User governance & tracking: query user accounts, view user profiles & orders, inspect system notification audit logs. |

---

## Environment & Collection Variables

The collection contains pre-configured collection variables. To view or modify them:
1. Click on the collection name **"PickAm Backend — MVP"** in the sidebar.
2. Go to the **Variables** tab.

Port mapping and variables guide:

| Variable | Default Value | Description |
|---|---|---|
| `gatewayUrl` | `http://localhost:3000` | Unified API Gateway endpoint (routes request downstream) |
| `userServiceUrl` | `http://localhost:3001` | Direct User Service URL (for testing isolation) |
| `walletServiceUrl` | `http://localhost:3002` | Direct Wallet Service URL (for testing isolation) |
| `orderServiceUrl` | `http://localhost:3003` | Direct Order Service URL (for testing isolation) |
| `notifServiceUrl` | `http://localhost:3004` | Direct Notification Service URL (for testing isolation) |
| `adminServiceUrl` | `http://localhost:3005` | Direct Admin Service URL (for testing isolation) |
| `safeHavenUrl` | `https://api.sandbox.safehavenmfb.com` | SafeHaven MFB Sandbox endpoint |
| `accessToken` | *Dynamic* | Saved automatically from login success |
| `safeHavenToken` | *Dynamic* | Saved automatically from SafeHaven direct OAuth |
| `userId` | *Dynamic* | Captured on registration/login for downstream parameters |
| `orderId` | *Dynamic* | Captured on order creation for lifecycle tracking |
| `zoneId` / `landmarkId` | *Dynamic* | Captured from Admin Zone/Landmark creation |

---

## Organized Request Folders

### 1. 🔐 Auth — User Service
* **Register Customer**: Registers a customer. Automatically sets the `userId` collection variable on success.
* **Register Rider**: Registers a rider.
* **Login**: Logs in as a customer or rider. Automatically sets the `accessToken` variable.
* **Login as Admin**: Logs in using admin credentials (`SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `SUPPORT_ADMIN`).

### 2. 👤 Profiles — User Service
* **Get My Profile**: Fetches the profile of the currently logged-in user.
* **Update My Profile**: Updates name and phone number.
* **Update Rider Vehicle Profile**: Updates the vehicle type and active status (Riders only).
* **Get User by ID**: Internal endpoint used for cross-service checks.
* **Get All Riders**: List of all registered riders (Admin only).

### 3. 👥 Admin — User Management
* **Get All Users (Paginated)**: Filterable and searchable user list (`SUPER_ADMIN`, `USER_MANAGEMENT`).
* **Get User by ID**: Full details including profile, social accounts, rider profile (`USER_MANAGEMENT`, `SUPPORT`).
* **Update User Account**: Update role, privileges, status, or profile (`USER_MANAGEMENT`, `SUPER_ADMIN`).
* **Suspend User**: Suspend access (`USER_MANAGEMENT`, `SUPER_ADMIN`).
* **Activate User**: Re-enable access (`USER_MANAGEMENT`, `SUPER_ADMIN`).
* **Soft Delete User**: Soft delete user account (`SUPER_ADMIN`).
* **View User Wallet**: View user's wallet balance and SafeHaven virtual account (`FINANCE`, `SUPER_ADMIN`).
* **View User Orders**: View paginated order history for specific user (`SUPPORT`, `SUPER_ADMIN`).

### 4. 🛠️ Admin — Admin Service (Operations & Pricing)
* **Create Zone**: Setup zone boundaries and base prices (`OPERATIONS`, `SUPER_ADMIN`).
* **Update Zone**: Modify zone properties (`OPERATIONS`, `SUPER_ADMIN`).
* **List Zones**: View all active and inactive zones.
* **Create Landmark**: Add landmarks attached to a zone (`OPERATIONS`, `SUPER_ADMIN`).
* **List Landmarks**: List all registered landmarks.
* **Assign Rider Operating Zones**: Bind riders to delivery zones (`OPERATIONS`, `SUPER_ADMIN`).
* **Get Rider Operating Zones**: Fetch zones assigned to a rider (`OPERATIONS`, `SUPER_ADMIN`).
* **Create Pricing Matrix**: Setup fixed price between two zones (`FINANCE`, `SUPER_ADMIN`).
* **Update Pricing Matrix**: Modify fixed route price (`FINANCE`, `SUPER_ADMIN`).
* **Calculate Delivery Price**: Calculate price between pickup & delivery landmark.
* **Admin Dashboard**: View system analytics and revenue metrics.

### 5. 📋 Admin — Audit Logs
* **List All Wallet Transactions (System Audit)**: System-wide financial transactions log (`FINANCE`, `SUPER_ADMIN`).
* **List All Notifications (System Audit)**: System-wide push/email/SMS log (`SUPPORT`, `SUPER_ADMIN`).
* **List All Riders**: Paginated list of registered riders (`OPERATIONS`, `SUPER_ADMIN`).

### 6. 💰 Wallet — Wallet Service
* **Create Wallet**: Initializes a wallet and requests a SafeHaven virtual account.
* **Get Balance**: Retrieves current balance and account bank routing info.
* **Get Transaction History**: Lists debits, credits, and deposits.
* **Webhook**: Simulates a deposit confirmation from SafeHaven server.

### 7. 📦 Orders — Order Service
* **Create Order**: Deducts pricing matrix fees from user balance and sets status to PENDING.
* **Assign Rider to Order**: Admin manually pairs a rider with the delivery (`OPERATIONS`, `SUPER_ADMIN`).
* **Update Order Status**: Simulates riders changing state to PICKED_UP or DELIVERED.
* **Cancel Order**: Cancels delivery and processes automatic wallet refund.
* **Get Order Details / History**: Views specific status event sequences.

### 8. 🔔 Notifications — Notification Service
* **Send Notification**: Dispatches push, email, or SMS log payloads.
* **Get My Notifications**: Fetches notification box for authenticated user.

### 9. 🏦 SafeHaven API (Direct)
* Direct SafeHaven MFB Sandbox calls for virtual accounts, NIN verification, and bank transfers.

---

## Authentication Automation

All endpoints automatically use the `{{accessToken}}` token header. You do **not** need to copy-paste the token manually.
1. Run the **Login as Admin** request inside `🔐 Auth — User Service`.
2. A script on the **Tests** tab will read the token and update the `accessToken` collection variable.
3. Every downstream request will automatically use that token.
