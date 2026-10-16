# 🛵 PickAm Rider API Integration Guide

This documentation covers all endpoints, data structures, and workflows required to integrate the **Rider Application (`zone-rider-api`)** with the PickAm Backend API Gateway.

---

## 🌐 General Configuration

- **Gateway Base URL**: `http://localhost:3000` (or `process.env.VITE_API_URL`)
- **Content-Type**: `application/json`
- **Authentication**: JWT Bearer token in header:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```

### Standard Response Envelope
All successful requests return the normalized envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "error": null
}
```

### Standard Error Response
```json
{
  "success": false,
  "data": null,
  "message": "Error description message",
  "error": {
    "statusCode": 401,
    "message": "Error description message",
    "details": "Unauthorized",
    "timestamp": "2026-10-14T00:00:00.000Z"
  }
}
```

---

## 1. 🔐 Authentication & Onboarding

### 1.1 Register Rider
Create a new rider account.
- **Endpoint**: `POST /auth/register`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "rider@pickam.com",
    "password": "Password123!",
    "firstName": "Chinedu",
    "lastName": "Okeke",
    "phoneNumber": "+2348012345678",
    "role": "RIDER",
    "vehicleType": "BIKE",
    "vehiclePlate": "ABJ-452-XY",
    "licenseNo": "DL-908123"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "user": {
        "id": "c1f72e38-958a-40a2-b91c-19d672ef1234",
        "email": "rider@pickam.com",
        "role": "RIDER",
        "firstName": "Chinedu",
        "lastName": "Okeke",
        "phoneNumber": "+2348012345678"
      }
    }
  }
  ```

---

### 1.2 Rider Login
Authenticate an existing rider with email and password.
- **Endpoint**: `POST /auth/login`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "rider@pickam.com",
    "password": "Password123!"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "user": {
        "id": "c1f72e38-958a-40a2-b91c-19d672ef1234",
        "email": "rider@pickam.com",
        "role": "RIDER",
        "firstName": "Chinedu",
        "lastName": "Okeke",
        "phoneNumber": "+2348012345678"
      }
    }
  }
  ```

---

### 1.3 Social Login (Google / Apple)
Sign in or auto-register using OAuth Google ID tokens.
- **Endpoint**: `POST /auth/social-login`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "provider": "GOOGLE",
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }
  ```

---

### 1.4 Get Rider Profile
Fetch the current logged-in rider's personal information and vehicle profile.
- **Endpoint**: `GET /profiles/me`
- **Auth**: Bearer Token
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "c1f72e38-958a-40a2-b91c-19d672ef1234",
      "email": "rider@pickam.com",
      "role": "RIDER",
      "profile": {
        "id": "p_8923a1",
        "firstName": "Chinedu",
        "lastName": "Okeke",
        "phoneNumber": "+2348012345678",
        "address": "Zone 4, Wuse, Abuja",
        "avatar": "https://example.com/avatar.jpg"
      },
      "riderProfile": {
        "id": "rp_45892",
        "userId": "c1f72e38-958a-40a2-b91c-19d672ef1234",
        "vehicleType": "BIKE",
        "vehiclePlate": "ABJ-452-XY",
        "licenseNo": "DL-908123",
        "status": "ONLINE"
      }
    }
  }
  ```

---

### 1.5 Update Rider Status & Vehicle Info
Toggle rider online/offline state or update vehicle information.
- **Endpoint**: `PUT /riders/profile`
- **Auth**: Bearer Token (RIDER role)
- **Request Body**:
  ```json
  {
    "status": "ONLINE",
    "vehicleType": "BIKE",
    "vehiclePlate": "ABJ-452-XY",
    "licenseNo": "DL-908123"
  }
  ```
  *(Status options: `"ONLINE"`, `"OFFLINE"`, `"DELIVERING"`)*
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "rp_45892",
      "userId": "c1f72e38-958a-40a2-b91c-19d672ef1234",
      "vehicleType": "BIKE",
      "vehiclePlate": "ABJ-452-XY",
      "licenseNo": "DL-908123",
      "status": "ONLINE",
      "updatedAt": "2026-10-14T00:00:00.000Z"
    }
  }
  ```

---

## 2. 📦 Delivery Orders Workflow

### 2.1 Get Available Orders (Open Pool)
Returns available pending delivery orders for pickup. By default, orders matching the rider's operating zones are filtered.
- **Endpoint**: `GET /orders/available`
- **Auth**: Bearer Token (RIDER role)
- **Query Parameters**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`)
  - `zoneId` *(optional)*: Filter by pickup zone ID
  - `search` *(optional)*: Search pickup/dropoff address
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "ord_88291f0a",
        "customerId": "usr_9912",
        "riderId": null,
        "pickupAddress": "Plot 120, Kubwa Express, Abuja",
        "destinationAddress": "First Bank Plaza, Garki II, Abuja",
        "pickupZoneId": "4adcca41-7d8d-481a-b8cf-b7162a35c9d4",
        "destinationZoneId": "c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d",
        "recipientName": "Amina Bello",
        "recipientPhone": "+2348099887766",
        "pickupNotes": "Fragile food container",
        "deliveryNotes": "Call before arrival",
        "amount": 2500,
        "status": "PENDING",
        "paymentStatus": "PAID",
        "expiresAt": "2026-10-14T01:30:00.000Z",
        "createdAt": "2026-10-14T00:15:00.000Z",
        "customer": {
          "id": "usr_9912",
          "name": "Sarah Danjuma",
          "phone": "+2348033221100"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

### 2.2 Accept an Order
Rider accepts an open delivery job. This sets `order.riderId` to the current rider and transitions `status` to `ASSIGNED`.
- **Endpoint**: `POST /orders/:id/accept`
- **Auth**: Bearer Token (RIDER role)
- **Path Parameter**: `id` — Order ID (e.g. `ord_88291f0a`)
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "ord_88291f0a",
      "riderId": "c1f72e38-958a-40a2-b91c-19d672ef1234",
      "status": "ASSIGNED",
      "amount": 2500,
      "updatedAt": "2026-10-14T00:20:00.000Z"
    },
    "message": "Order accepted"
  }
  ```

---

### 2.3 Update Delivery Status
Update the delivery lifecycle as you pick up and deliver the package.
- **Endpoint**: `PUT /orders/:id/status`
- **Auth**: Bearer Token
- **Path Parameter**: `id` — Order ID
- **Request Body**:
  ```json
  {
    "status": "PICKED_UP"
  }
  ```
  *(Status options for Rider: `"PICKED_UP"`, `"DELIVERED"`)*
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "ord_88291f0a",
      "status": "PICKED_UP",
      "updatedAt": "2026-10-14T00:35:00.000Z"
    }
  }
  ```

---

### 2.4 Get Rider's Order History / Active Deliveries
Returns orders assigned to the logged-in rider.
- **Endpoint**: `GET /orders/history`
- **Auth**: Bearer Token (RIDER role)
- **Query Parameters**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`)
  - `status` *(optional)*: Filter by `"ASSIGNED"`, `"PICKED_UP"`, `"DELIVERED"`, or `"CANCELLED"`
  - `search` *(optional)*: Search customer or recipient name/address
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "ord_88291f0a",
        "status": "ASSIGNED",
        "amount": 2500,
        "pickupAddress": "Plot 120, Kubwa Express, Abuja",
        "destinationAddress": "First Bank Plaza, Garki II, Abuja",
        "recipientName": "Amina Bello",
        "recipientPhone": "+2348099887766",
        "createdAt": "2026-10-14T00:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

### 2.5 Get Order Details & Timeline
Retrieve full details, customer information, and event logs of an order.
- **Endpoint**: `GET /orders/:id`
- **Auth**: Bearer Token
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "ord_88291f0a",
      "customerId": "usr_9912",
      "riderId": "c1f72e38-958a-40a2-b91c-19d672ef1234",
      "status": "PICKED_UP",
      "amount": 2500,
      "pickupAddress": "Plot 120, Kubwa Express, Abuja",
      "destinationAddress": "First Bank Plaza, Garki II, Abuja",
      "recipientName": "Amina Bello",
      "recipientPhone": "+2348099887766",
      "timeline": [
        {
          "status": "PENDING",
          "description": "Order created by customer.",
          "createdAt": "2026-10-14T00:15:00.000Z"
        },
        {
          "status": "ASSIGNED",
          "description": "Rider accepted this order.",
          "createdAt": "2026-10-14T00:20:00.000Z"
        },
        {
          "status": "PICKED_UP",
          "description": "Rider has picked up your package and is on the way.",
          "createdAt": "2026-10-14T00:35:00.000Z"
        }
      ]
    }
  }
  ```

---

## 3. 💳 Wallet & Rider Earnings

### 3.1 Get Rider Wallet Balance
- **Endpoint**: `GET /wallets/me/balance`
- **Auth**: Bearer Token
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "balance": 18500.00,
      "virtualAccount": {
        "accountNumber": "9994670615",
        "accountName": "Chinedu Okeke",
        "bankName": "SafeHaven MFB"
      }
    }
  }
  ```

---

### 3.2 Get Rider Transactions
- **Endpoint**: `GET /wallets/me/transactions`
- **Auth**: Bearer Token
- **Query Parameters**: `page`, `limit`
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "tx_9082",
        "amount": 2500,
        "type": "CREDIT",
        "status": "SUCCESS",
        "reference": "payout_ord_88291f0a",
        "createdAt": "2026-10-14T00:45:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

## 4. 🔔 Notifications

### 4.1 Get Rider Notifications
- **Endpoint**: `GET /notifications/me`
- **Auth**: Bearer Token
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "notif_102",
        "title": "New Delivery Assigned",
        "message": "You have accepted order ord_88291f0a. Please proceed to pickup location.",
        "read": false,
        "createdAt": "2026-10-14T00:20:00.000Z"
      }
    ]
  }
  ```

### 4.2 Mark Notification Read
- **Endpoint**: `PATCH /notifications/:id/read`
- **Auth**: Bearer Token

---

## 5. 📍 Zones & Locations

### 5.1 Get States & Zones
- **Endpoint**: `GET /states?limit=40&page=1`
- **Auth**: None (Public)

### 5.2 Get Public Zones
- **Endpoint**: `GET /zones`
- **Auth**: None (Public)

---

## 6. 🛠️ Frontend Integration Helper (`zone-rider-api`)

In `zone-rider-api/src/lib/api.ts`, replace the localStorage mock methods with real HTTP requests:

```typescript
export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function request<T>(path: string, options: { method?: string; body?: any; auth?: boolean } = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth !== false && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.message || json?.error?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

// Example API calls:
export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: any }>("/auth/login", { method: "POST", body: { email, password }, auth: false }),

  getProfile: () => request<any>("/profiles/me"),

  updateStatus: (status: "ONLINE" | "OFFLINE" | "DELIVERING") =>
    request<any>("/riders/profile", { method: "PUT", body: { status } }),

  // Orders
  getAvailableOrders: () => request<any[]>("/orders/available"),

  acceptOrder: (orderId: string) =>
    request<any>(`/orders/${orderId}/accept`, { method: "POST" }),

  updateOrderStatus: (orderId: string, status: "PICKED_UP" | "DELIVERED") =>
    request<any>(`/orders/${orderId}/status`, { method: "PUT", body: { status } }),

  getMyActiveOrders: () =>
    request<any[]>("/orders/history?status=ASSIGNED"),

  getMyHistory: () =>
    request<any[]>("/orders/history"),

  // Wallet
  getWalletBalance: () => request<any>("/wallets/me/balance"),
  getTransactions: () => request<any>("/wallets/me/transactions"),

  // Notifications
  getNotifications: () => request<any>("/notifications/me"),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: "PATCH" }),
};
```
