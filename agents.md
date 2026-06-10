# Coffee Card - Project Overview

## Core Concept
A privacy-focused, zero-account digital loyalty card system for coffee shops.
- **Zero-Account**: Users do not create accounts.
- **Bearer Token Model**: The Card ID (UUID) is the "account". Whoever holds the link/QR code owns the stamps.
- **Privacy First**: No personal data (email, phone) is collected or stored.
- **Possession-based**: Acts like a physical paper card.

## Architecture (Monorepo)

### 1. Backend (`package/backend`)
- **Stack**: TypeScript, AWS Lambda, DynamoDB.
- **Role**: Core business logic (Create Card, Redeem Stamps, Manage Stores).
- **Data Model**:
  - `Store`: Profile and settings.
  - `Card`: Linked to a Store, holds `coffeeCount` and `coffeesEarned`.
- **Infrastructure**: Serverless (SST v3).

### 2. Web Frontend (`packages/web-frontend`)
- **Stack**: Vue 3, Vite, Tailwind CSS v4.
- **Role**: Customer-facing Progressive Web App (PWA).
- **Features**:
  - View Card balance.
  - Generate QR Code for merchant to scan.
  - "Add to Wallet" (Future: .pkpass or PWA install).
- **Design System**:
  - **Shadcn/Vue** (New York style).
  - **OKLCH Colors**: Modern, vibrant color palettes.
  - **Dark Mode**: Native support.

### 3. Shopify Integration (`integrations/shopify`)
- **Stack**: Remix, Shopify App Bridge, Polaris.
- **Role**: Merchant-facing dashboard embedded in Shopify Admin/POS.
- **Features**:
  - View Store Details.
  - Scan Customer QR Codes.
  - Redeem Stamps.
  - View recent loyalty cards.

### 4. Shared (`packages/shared`)
- **Role**: Shared TypeScript types (DTOs), Zod schemas, and potentially API clients.

## Current Status
- **Prototype Phase**: Core architecture is in place.
- **Frontend**: Functional UI, needs API integration and persistent storage logic.
- **Backend**: Basic Lambda handlers (`create-card`, `redeem`) and DynamoDB logic exist.
- **POS App**: Functional but contains template boilerplate.

## Design & Aesthetics
- **Goal**: Premium, high-end "Coffee Shop" feel.
- **Current State**: Strong technical foundation (Tailwind v4, OKLCH).
- **Next Steps**: Refine typography, warm up the color palette, and add motion.

## Development Workflow
- **Code Quality**: Ensure `prettier` and `lint` are run after each change.
