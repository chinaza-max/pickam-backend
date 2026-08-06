# PickAm Backend — MVP Monorepo

A NestJS monorepo-based microservices backend for the PickAm delivery platform.

## Architecture

```
Client
  │
  ▼
API Gateway  :3000  (JWT auth, Swagger, Helmet, Rate-Limit)
  │
  ├── User Service        :3001  (Registration, Profiles, Auth)
  ├── Wallet Service      :3002  (Balance, Virtual Accounts, SafeHaven)
  ├── Order Service       :3003  (Order lifecycle, Pricing, Rider Assignment)
  ├── Notification Service:3004  (Push/SMS/Email logs)
  └── Admin Service       :3005  (Zones, Landmarks, Pricing Matrix, Dashboard)
```

All services share a **single PostgreSQL** database using multi-schema isolation:

| Service      | Schema              |
|-------------|---------------------|
| User         | `user_schema`        |
| Wallet       | `wallet_schema`      |
| Order        | `order_schema`       |
| Notification | `notification_schema`|
| Admin        | `admin_schema`       |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env` and update with your values:

```bash
cp .env .env.local
```

Key variables:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pickam
JWT_SECRET=your_secret_key
SAFEHAVEN_API_URL=https://api.sandbox.safehaven.com/api/v1
SAFEHAVEN_CLIENT_ID=...
SAFEHAVEN_CLIENT_SECRET=...
```

### 3. Run database migrations

```bash
npm run prisma:migrate
```

### 4. Generate Prisma Client

```bash
npm run prisma:generate
```

### 5. Start services

**All services concurrently (dev):**
```bash
npm run start:all:dev
```

**Individual services:**
```bash
npm run start:gateway       # API Gateway     :3000
npm run start:user          # User Service    :3001
npm run start:wallet        # Wallet Service  :3002
npm run start:order         # Order Service   :3003
npm run start:notification  # Notification    :3004
npm run start:admin         # Admin Service   :3005
```

---

## API Documentation

Once the Gateway is running, open:

```
http://localhost:3000/docs
```

Swagger UI covers all public and admin endpoints.

### Postman & Admin API Documentation
* **Postman Collection & Overview:** [postman/README.md](file:///Users/macbookpro/Downloads/programming/test/pickam-backend/postman/README.md)
* **Special Admin API & Privilege Specification:** [postman/ADMIN_POSTMAN_DOCUMENTATION.md](file:///Users/macbookpro/Downloads/programming/test/pickam-backend/postman/ADMIN_POSTMAN_DOCUMENTATION.md)


---

## npm Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run build` | Compile all services |
| `npm run start:all` | Start all services |
| `npm run start:all:dev` | Start all in watch mode |
| `npm run start:gateway` | Start Gateway only |
| `npm run lint` | Lint and auto-fix |
| `npm run test` | Run Jest tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run DB migrations |
| `npm run prisma:studio` | Open Prisma Studio |

---

## Shared Libraries

| Library | Purpose |
|---------|---------|
| `libs/auth` | bcrypt helpers |
| `libs/config` | ENV validation |
| `libs/constants` | Shared enums |
| `libs/decorators` | `@CurrentUser`, `@Public`, `@Roles` |
| `libs/dto` | Shared DTOs |
| `libs/filters` | Global HTTP exception filter |
| `libs/guards` | JWT auth + role guards |
| `libs/interceptors` | Response transform interceptor |
| `libs/interfaces` | Shared TypeScript interfaces |
| `libs/logger` | Pino logger module |
| `libs/prisma` | PrismaService wrapper |
| `libs/utils` | Haversine distance calculator |

---

## SafeHaven Integration

The Wallet Service integrates with the **SafeHaven virtual banking API** to:
1. Generate a unique virtual account per user at registration
2. Listen for deposit webhooks at `POST /wallets/webhook/safehaven`
3. Credit wallet balance automatically on confirmed transfers

For MVP testing, the service gracefully falls back to mock account data if SafeHaven is unreachable.
