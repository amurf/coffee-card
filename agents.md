# AI Agent Onboarding & Reference Guide

This file provides system context, architectural guidelines, database schema details, and development workflows for AI agents (and human developers) working on the **Coffee Card** loyalty system.

---

## 1. Project Overview

`coffee-card` is a digital loyalty program backend and point-of-sale (POS) integration. It supports:

- Issuing customer loyalty cards (e.g., digital stamp cards).
- Tracking stamp balances (via item purchases or spending amount rules).
- Milestones and reward redemptions (e.g., free items, percentage/fixed discounts).
- Integrations with Shopify POS ([integrations/shopify/](file:///Users/ash/src/coffee-card/integrations/shopify)) and Square.

For more details on deployment, refer to [DEPLOYMENT.md](file:///Users/ash/src/coffee-card/DEPLOYMENT.md).

---

## 2. Monorepo Layout

The repository is managed as a **Bun Workspace** with the following packages:

- **[backend/](file:///Users/ash/src/coffee-card/backend/)**: Core standalone Hono API server, SQLite database connections, and business logic.
- **[web-frontend/](file:///Users/ash/src/coffee-card/web-frontend/)**: Vue 3 & Vite single-page application for stores and customers.
- **[integrations/shopify/](file:///Users/ash/src/coffee-card/integrations/shopify/)**: Shopify app package built using Shopify Remix CLI.
- **[shared/](file:///Users/ash/src/coffee-card/shared/)**: Shared models, types, schemas, and API structures used across frontend, backend, and shopify packages.
- **[scripts/](file:///Users/ash/src/coffee-card/scripts/)**: Helper scripts for webhook mocking, local development, and testing.

---

## 3. Tech Stack

- **Infrastructure & Deployment**: Containerized Hono backend (Docker-compatible for Railway, Render, etc.).
- **Backend Runtime**: Bun & TypeScript.
- **Frontend App**: Vite, Vue 3, Tailwind CSS.
- **Database**: SQLite (locally as a file `backend/local.db` or remotely via Turso/libsql).
- **ORM**: Drizzle ORM (schema located in `shared/src/db/schema.ts`).
- **Validation**: Zod (located in the shared package).

---

## 4. Relational Database Schema (SQLite)

All entities reside in the SQLite database managed with Drizzle ORM.

### Tables Layout

1. **Stores (`stores`)**
   - **Fields**:
     - `id`: `text` (Primary Key, UUID)
     - `name`: `text` (Unique, not null, storeName acts as tenant identifier)
     - `location`: `text` (Not null)
     - `themeOptions`: `text` (JSON representation of store theme styling)
     - `rewardRules`: `text` (JSON representation of stamp rules and milestones)
     - `posType`: `text` (`SHOPIFY` | `SQUARE` | `NONE`, defaults to `NONE`)
     - `posConfig`: `text` (JSON configurations such as access tokens, refresh tokens, location IDs, merchant IDs)
     - `merchantPasscode`: `text` (Passcode value)
   - **Schema**: [stores](file:///Users/ash/src/coffee-card/shared/src/db/schema.ts#L9)

2. **Loyalty Cards (`loyalty_cards`)**
   - **Fields**:
     - `id`: `text` (Primary Key, cardId)
     - `storeName`: `text` (Foreign key referencing `stores.name` with cascade delete)
     - `issueDate`: `text` (Not null, ISO date string)
     - `stampCount`: `integer` (Not null, defaults to `0`)
     - `totalStampsEarned`: `integer` (Not null, defaults to `0`)
     - `redeemedMilestones`: `text` (JSON string array of milestone IDs claimed)
   - **Schema**: [loyaltyCards](file:///Users/ash/src/coffee-card/shared/src/db/schema.ts#L20)

3. **Pending Redemptions (`pending_redemptions`)**
   - **Fields**:
     - `token`: `text` (Primary Key, unique redemption token)
     - `cardId`: `text` (Foreign key referencing `loyalty_cards.id` with cascade delete)
     - `milestoneId`: `text` (Not null)
     - `expiresAt`: `integer` (Not null, Unix timestamp)
   - **Schema**: [pendingRedemptions](file:///Users/ash/src/coffee-card/shared/src/db/schema.ts#L31)

4. **Processed Orders (`processed_orders`)**
   - **Fields**:
     - `orderId`: `text` (Primary Key, unique POS order identifier for idempotency)
     - `storeName`: `text` (Foreign key referencing `stores.name` with cascade delete)
     - `cardId`: `text` (Foreign key referencing `loyalty_cards.id` with cascade delete)
     - `stampsAwarded`: `integer` (Not null)
     - `createdAt`: `text` (Not null, ISO date string)
   - **Schema**: [processedOrders](file:///Users/ash/src/coffee-card/shared/src/db/schema.ts#L40)

---

## 5. Development & Testing Workflows

### Prerequisites

- Node.js (v18.20+ or v20.10+)
- Bun (v1.0+)

### Local Development Setup

1. Install dependencies from the root directory:

   ```bash
   bun install
   ```

2. Initialize and push schema to local SQLite database:

   ```bash
   bun run db:push
   ```

3. Seed the local SQLite database with mock stores and cards:

   ```bash
   bun run db:seed
   ```

4. Start both the backend and frontend dev servers:

   ```bash
   bun run dev
   ```

   * Hono backend runs on `http://localhost:3000`
   * Vue 3 frontend runs on `http://localhost:5173`

### Testing Webhooks Locally

Use the scripts in the [scripts/](file:///Users/ash/src/coffee-card/scripts/) directory to mock webhook calls from integrations:

- Shopify webhook mock: `pnpm run mock:webhook:shopify`
- Square webhook mock: `pnpm run mock:webhook:square`

---

## 6. Implementation Checklist for Agents

When implementing features or modifying code:

- [ ] **Type & Schema Consistency**: Define/update data structures in the [shared/src/model/](file:///Users/ash/src/coffee-card/shared/src/model/) package using Zod schema, then import them elsewhere. Database schema is updated in [shared/src/db/schema.ts](file:///Users/ash/src/coffee-card/shared/src/db/schema.ts).
- [ ] **Database Access Patterns**: Do not write raw Drizzle operations in lambda handlers or Honos routes directly. Add or update functions inside [backend/src/dynamo/](file:///Users/ash/src/coffee-card/backend/src/dynamo/) (e.g., [card.ts](file:///Users/ash/src/coffee-card/backend/src/dynamo/card.ts) or [store.ts](file:///Users/ash/src/coffee-card/backend/src/dynamo/store.ts)).
- [ ] **Router Registration**: When adding a new HTTP handler, ensure it is mapped to a route in [backend/src/index.ts](file:///Users/ash/src/coffee-card/backend/src/index.ts).
- [ ] **Linting & Formatting**: Ensure code adheres to styling guidelines via Prettier and ESLint. Run formatting before committing changes.
