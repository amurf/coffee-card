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
The repository is managed as a `pnpm` workspace with the following packages:
- **[backend/](file:///Users/ash/src/coffee-card/backend/)**: Core serverless AWS Lambda backend handlers, SST config, and DB interaction layers.
- **[web-frontend/](file:///Users/ash/src/coffee-card/web-frontend/)**: React & Vite single-page application for stores and customers.
- **[integrations/shopify/](file:///Users/ash/src/coffee-card/integrations/shopify/)**: Shopify app package built using Shopify Remix CLI.
- **[shared/](file:///Users/ash/src/coffee-card/shared/)**: Shared models, types, schemas, and API structures used across frontend, backend, and shopify packages.
- **[scripts/](file:///Users/ash/src/coffee-card/scripts/)**: Helper scripts for webhook mocking, local development, and testing.

---

## 3. Tech Stack
- **Infrastructure & Deployment**: [SST v3 (Ion)](file:///Users/ash/src/coffee-card/sst.config.ts) for AWS (Lambda, API Gateway, DynamoDB).
- **Backend Runtime**: Node.js & TypeScript.
- **Frontend App**: Vite, React, Tailwind CSS.
- **Database**: AWS DynamoDB (Single-table design).
- **Validation**: Zod (located in the shared package).

---

## 4. Single-Table Database Schema
All entities reside in the `CoffeeCardData` DynamoDB table configured in [sst.config.ts](file:///Users/ash/src/coffee-card/sst.config.ts).

### Key Structure
- **Primary Key**:
  - Partition Key (`PK`): `string`
  - Sort Key (`SK`): `string`
- **Global Secondary Index (GSI)**:
  - `getByCardId`: Hash Key: `cardId` (`string`)

### Entities Layout
1. **Store Profile**
   - **PK**: `STORE#<storeName>`
   - **SK**: `PROFILE`
   - **EntityType**: `"Store"`
   - **Schema**: Defined by [StoreProfileSchema](file:///Users/ash/src/coffee-card/shared/src/model/StoreProfile.ts#L35) / `StoreProfileModel`.
2. **Loyalty Card**
   - **PK**: `STORE#<storeName>`
   - **SK**: `CARD#<cardId>`
   - **EntityType**: `"Card"`
   - **GSI (`getByCardId`)**: `cardId`
   - **Schema**: Defined by [LoyaltyCardSchema](file:///Users/ash/src/coffee-card/shared/src/model/LoyaltyCard.ts#L3) / `LoyaltyCardModel`.
3. **Pending Redemption**
   - **PK**: `Redemption#<token>`
   - **SK**: `Redemption#<token>`
   - **EntityType**: `"PendingRedemption"`
   - **Schema**: Defined by [PendingRedemptionSchema](file:///Users/ash/src/coffee-card/shared/src/model/PendingRedemption.ts#L3) / `PendingRedemptionModel`.
4. **Square Location Mapping**
   - **PK**: `INTEGRATION#SQUARE`
   - **SK**: `LOCATION#<locationId>`

---

## 5. Development & Testing Workflows

### Prerequisites
- Node.js (v18.20+ or v20.10+)
- `pnpm` (v10.9.0 recommended)
- AWS CLI configured with administrative access for local SST resources.

### Local Development Setup
1. Install dependencies from the root directory:
   ```bash
   pnpm install
   ```
2. Start the local SST dev environment:
   ```bash
   pnpm run dev
   ```
   *This initializes AWS resources in your `dev` stage, provisions the DynamoDB table and routes, and generates local `.env` files with generated AWS endpoint URLs.*

3. Start individual service dev servers (e.g., web-frontend or shopify):
   - Web frontend: `pnpm --filter web-frontend dev`
   - Shopify app: `pnpm --filter shopify dev` (under `integrations/shopify`)

### Testing Webhooks Locally
Use the scripts in the [scripts/](file:///Users/ash/src/coffee-card/scripts/) directory to mock webhook calls from integrations:
- Shopify webhook mock: `pnpm run mock:webhook:shopify` (triggers [scripts/emit-webhook.ts](file:///Users/ash/src/coffee-card/scripts/emit-webhook.ts))
- Square webhook mock: `pnpm run mock:webhook:square` (triggers [scripts/emit-square-webhook.ts](file:///Users/ash/src/coffee-card/scripts/emit-square-webhook.ts))

---

## 6. Implementation Checklist for Agents

When implementing features or modifying code:
- [ ] **Type & Schema Consistency**: Define/update data structures in the [shared/src/model/](file:///Users/ash/src/coffee-card/shared/src/model/) package using Zod schema, then import them elsewhere.
- [ ] **Database Access Patterns**: Do not write raw DynamoDB operations in lambda handlers directly. Add or update functions inside [backend/src/dynamo/](file:///Users/ash/src/coffee-card/backend/src/dynamo/) (e.g., [card.ts](file:///Users/ash/src/coffee-card/backend/src/dynamo/card.ts) or [store.ts](file:///Users/ash/src/coffee-card/backend/src/dynamo/store.ts)).
- [ ] **Router Registration**: When adding a new HTTP handler, ensure it's mapped to a route in [sst.config.ts](file:///Users/ash/src/coffee-card/sst.config.ts) and that the environment parameters (`TABLE_NAME`, `QR_SECRET`, etc.) are linked correctly.
- [ ] **Linting & Formatting**: Ensure code adheres to styling guidelines via Prettier and ESLint. Run formatting before committing changes.
