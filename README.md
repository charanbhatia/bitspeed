# Bitespeed Identity Reconciliation Service

A production-ready microservice that identifies and reconciles customer identity across multiple purchases by linking contact information (email addresses and phone numbers) to a single customer profile.

**Live URL:** `https://bitspeed-identity-reconciliation-yb3h.onrender.com`

> The free-tier Render instance spins down after inactivity. The first request may take 30-60 seconds (cold start). Subsequent requests are fast.

---

## API Reference

### POST /identify

Identifies a customer and returns their consolidated contact profile.

**Request**

```bash
curl -X POST https://bitspeed-identity-reconciliation-yb3h.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'
```

At least one of `email` or `phoneNumber` must be provided.

**Response — 200 OK**

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `primaryContatctId` | `number` | ID of the oldest (primary) contact in the cluster |
| `emails` | `string[]` | All unique emails — primary email first |
| `phoneNumbers` | `string[]` | All unique phone numbers — primary phone first |
| `secondaryContactIds` | `number[]` | IDs of all linked secondary contacts |

**Error Responses**

| Status | Condition |
|--------|-----------|
| 400 | Neither field provided, or invalid format |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |

---

### GET /contacts/:id

Returns the consolidated contact cluster for a given contact ID.

```bash
curl https://bitspeed-identity-reconciliation-yb3h.onrender.com/contacts/1
```

**Response — 200 OK** — same shape as `/identify`.

---

### GET /health

Returns service liveness and database connectivity status.

```bash
curl https://bitspeed-identity-reconciliation-yb3h.onrender.com/health
```

```json
{
  "status": "ok",
  "timestamp": "2026-03-08T16:32:47.061Z",
  "service": "bitspeed-identity-reconciliation",
  "database": "connected"
}
```

Returns `503` with `"database": "disconnected"` if the database is unreachable.

---

## Rate Limiting

| Limit | Scope |
|-------|-------|
| 200 requests / 15 minutes | All routes (global) |
| 60 requests / 1 minute | `POST /identify` only |

Requests exceeding the limit receive a `429 Too Many Requests` response.

---

## Example curl Scenarios

```bash
BASE="https://bitspeed-identity-reconciliation-yb3h.onrender.com"

# 1. Create a brand-new primary contact
curl -X POST "$BASE/identify" \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'

# 2. Same phone, new email — creates a secondary linked to contact 1
curl -X POST "$BASE/identify" \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'

# 3. Two previously independent primaries get merged into one cluster
curl -X POST "$BASE/identify" \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "789012"}'

# 4. Query by phone only
curl -X POST "$BASE/identify" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "123456"}'

# 5. Look up a contact by ID
curl "$BASE/contacts/1"

# 6. Health check
curl "$BASE/health"
```

---

## Architecture

```
HTTP Request
    |
    v
Validation Middleware  -- input sanitisation & constraint checks
    |
    v
Controller Layer       -- HTTP <-> domain translation
    |
    v
Service Layer          -- business logic & reconciliation algorithm
    |
    v
Repository Layer       -- data-access abstraction over Prisma ORM
    |
    v
PostgreSQL Database
```

### Identity Reconciliation Algorithm

1. Find all contacts matching the incoming `email` or `phoneNumber`.
2. If no matches exist, create a new primary contact and return.
3. Resolve the root primary for every matched contact.
4. Fetch the complete cluster for all discovered primaries.
5. Elect the oldest contact (by `createdAt`) as the true primary.
6. Demote any other primaries to secondary and re-parent their dependants.
7. If the request carries new information not present in the cluster, create a secondary.
8. Return the consolidated contact view.

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
# 1. Clone and install
git clone https://github.com/charanbhatia/bitspeed.git
cd bitspeed
npm install

# 2. Configure environment
cp .env.example .env
# Set DATABASE_URL in .env:
# DATABASE_URL="postgresql://user:password@localhost:5432/bitspeed_db?schema=public"

# 3. Apply migrations
npm run prisma:migrate:dev

# 4. Start dev server
npm run dev
```

The service starts at `http://localhost:3000`.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run prisma:migrate:dev` | Create and apply a migration (development) |
| `npm run prisma:migrate` | Apply pending migrations (production) |
| `npm run prisma:generate` | Regenerate Prisma client |

---

## Project Structure

```
.
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── database.ts          # Prisma client singleton
│   │   └── environment.ts       # Environment variable validation
│   ├── controllers/
│   │   └── contact.controller.ts
│   ├── interfaces/              # IContact, IIdentifyRequest/Response, IRepository, IService
│   ├── middleware/
│   │   ├── correlation-id.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── validation.middleware.ts
│   ├── repositories/
│   │   └── contact.repository.ts
│   ├── routes/
│   │   ├── contact.routes.ts
│   │   └── index.ts
│   ├── services/
│   │   └── contact.service.ts   # Core reconciliation logic
│   ├── utils/
│   │   └── errors.ts
│   ├── app.ts
│   └── server.ts
├── Dockerfile
├── docker-compose.yml
├── render.yaml
├── tsconfig.json
└── package.json
```

---

## Deployment

Deployed on [Render](https://render.com) via the included `render.yaml` blueprint.

The blueprint provisions a free-tier PostgreSQL database and the Node.js web service. On each deploy, `prisma migrate deploy` runs automatically to apply pending migrations.

To self-host: push to GitHub, create a new Render Blueprint, and connect the repository.
