# Bitespeed Identity Reconciliation Service

A production-ready microservice that identifies and reconciles customer identity across multiple purchases by linking different contact information (email addresses and phone numbers) to a single customer profile.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## Overview

FluxKart.com customers often place orders using different email addresses and phone numbers across purchases. This service solves the identity reconciliation problem by maintaining a graph of linked contacts, always returning a consolidated view of all known information for a given customer.

**Live Endpoint:** `https://bitspeed-identity-reconciliation-yb3h.onrender.com`

> Note: The free-tier Render service spins down after 15 minutes of inactivity. The first request after idle may take 30–60 seconds to respond (cold start). Subsequent requests are fast.

### Key Behaviours

- A new contact with no matching email or phone creates a new **primary** contact.
- A request that shares an email or phone with an existing contact but carries new information creates a **secondary** contact linked to the primary.
- When a request links two previously independent primary contacts, the newer primary is demoted to secondary and all its former secondaries are re-pointed to the surviving primary.

## Architecture

The service follows a layered microservice architecture applying SOLID and DRY principles throughout.

```
HTTP Request
    │
    ▼
Validation Middleware  (input sanitisation & constraint checks)
    │
    ▼
Controller Layer       (HTTP ↔ domain translation)
    │
    ▼
Service Layer          (business logic & identity reconciliation algorithm)
    │
    ▼
Repository Layer       (data-access abstraction over Prisma ORM)
    │
    ▼
PostgreSQL Database
```

### Design Principles Applied

| Principle | Implementation |
|-----------|---------------|
| Single Responsibility | Each class has one reason to change — `ContactRepository` only handles data access, `ContactService` only handles business rules |
| Open/Closed | `IContactRepository` and `IContactService` interfaces allow alternative implementations to be injected without modifying existing code |
| Liskov Substitution | Concrete classes satisfy their interface contracts fully |
| Interface Segregation | `IContactRepository`, `IContactService`, and DTO interfaces are focused and minimal |
| Dependency Inversion | `ContactService` depends on `IContactRepository` (interface), not `ContactRepository` (concrete class) |
| DRY | Identity reconciliation logic is in one place; shared error hierarchy avoids repetition |

### Identity Reconciliation Algorithm

1. Find all contacts directly matching the incoming `email` or `phoneNumber`.
2. If no matches exist, create a new primary contact and return.
3. Resolve the root primary ID for every matched contact.
4. Fetch the complete cluster for all discovered primaries.
5. Elect the oldest (by `createdAt`) contact as the true primary.
6. Demote any other primaries to secondary and re-parent their dependants.
7. If the request contains information not present in any existing cluster contact, create a new secondary.
8. Return the consolidated contact view.

## API Reference

### POST /identify

Identifies a customer and returns their consolidated contact profile.

**Request**

```http
POST /identify
Content-Type: application/json
```

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

At least one of `email` or `phoneNumber` must be provided. Both can be supplied simultaneously.

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
| `emails` | `string[]` | All unique emails; primary email is first |
| `phoneNumbers` | `string[]` | All unique phone numbers; primary phone is first |
| `secondaryContactIds` | `number[]` | IDs of all secondary contacts |

**Error Responses**

| Status | Condition |
|--------|-----------|
| 400 | Neither `email` nor `phoneNumber` provided, or invalid format |
| 404 | Route does not exist |
| 500 | Unexpected server error |

### GET /health

Returns service liveness status.

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "bitspeed-identity-reconciliation"
}
```

## Local Development

### Prerequisites

- Node.js 18 or later
- PostgreSQL 14 or later

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-username>/bitspeed-identity-reconciliation.git
   cd bitspeed-identity-reconciliation
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file from the example:

   ```bash
   cp .env.example .env
   ```

4. Set `DATABASE_URL` in `.env` to point at your PostgreSQL instance:

   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/bitspeed_db?schema=public"
   ```

5. Run the database migrations:

   ```bash
   npm run prisma:migrate:dev
   ```

6. Start the development server with hot-reload:

   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3000`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run prisma:migrate:dev` | Create and apply a new migration (development) |
| `npm run prisma:migrate` | Apply pending migrations (production) |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |

### Testing the API

Using curl:

```bash
# Create a new contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'

# Identify with overlapping info — creates a secondary contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'

# Link two independent clusters
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "george@hillvalley.edu", "phoneNumber": "717171"}'
```

## Deployment

The service is configured for zero-downtime deployment on [Render](https://render.com) using the included `render.yaml`.

### Deploying to Render

1. Push this repository to GitHub.
2. Log in to [Render](https://render.com) and select **New > Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically provision a PostgreSQL database and web service using `render.yaml`.
5. Set any additional environment variables in the Render dashboard if needed.

The `render.yaml` blueprint will:
- Provision a free-tier PostgreSQL database
- Build and start the Node.js service
- Run `prisma migrate deploy` on each deploy to apply pending migrations

## Project Structure

```
.
├── prisma/
│   ├── migrations/         # Database migration files
│   └── schema.prisma       # Prisma data model
├── src/
│   ├── config/
│   │   ├── database.ts     # Prisma client singleton
│   │   └── environment.ts  # Environment variable validation
│   ├── controllers/
│   │   └── contact.controller.ts
│   ├── interfaces/
│   │   ├── contact.interface.ts    # Contact DTOs
│   │   ├── identify.interface.ts   # Request/response shapes
│   │   ├── repository.interface.ts # IContactRepository contract
│   │   └── service.interface.ts    # IContactService contract
│   ├── middleware/
│   │   ├── error.middleware.ts     # Global error handler
│   │   └── validation.middleware.ts
│   ├── repositories/
│   │   └── contact.repository.ts   # Prisma-backed implementation
│   ├── routes/
│   │   ├── contact.routes.ts
│   │   └── index.ts
│   ├── services/
│   │   └── contact.service.ts      # Identity reconciliation logic
│   ├── utils/
│   │   ├── errors.ts               # AppError hierarchy
│   │   └── logger.ts               # Structured JSON logger
│   ├── app.ts                      # Express application factory
│   └── server.ts                   # Entry point & graceful shutdown
├── .env.example
├── .gitignore
├── package.json
├── render.yaml
├── tsconfig.json
└── README.md
```

## License

ISC
