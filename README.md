# Coffee Card Loyalty System

A digital loyalty program backend and point-of-sale (POS) integration. This application is structured as a unified monorepo container using a high-performance, developer-friendly stack.

---

## Tech Stack

* **Runtime:** [Bun](https://bun.sh) (Package manager & fast javascript execution engine)
* **Backend API:** [Hono](https://hono.dev) (Ultra-fast, lightweight routing framework)
* **Database:** [Turso](https://turso.tech) (Distributed edge SQLite / `libsql`)
* **ORM:** [Drizzle ORM](https://orm.drizzle.team) (Lightweight TypeScript SQL query builder)
* **Frontend:** [Vue 3](https://vuejs.org) + [Vite](https://vite.dev) (Customer and merchant dashboard)
* **POS Integrations:** Shopify POS (React/Remix) and Square POS (Webhook callback routines)
* **Deployment:** Docker container monolith serving both frontend static assets and Hono API endpoints

---

## Codebase Structure

The project is managed as a **Bun Workspace** with the following directories:

* **`backend/`**: Core API server (Hono) and database connection logic.
* **`web-frontend/`**: Vue 3 SPA client dashboard (compiled into static assets served by Hono).
* **`shared/`**: Shared schemas and types with subpath exports (`/db`, `/types`, `/validation`).
* **`integrations/shopify/`**: Shopify app package built using Shopify Remix CLI.

---

## Local Development Setup

### 1. Prerequisites
Ensure you have Node.js and **Bun** (version 1.0+) installed on your machine:
```bash
# Verify Bun is installed
bun --version
```

### 2. Install Dependencies
Install all workspace dependencies from the root directory:
```bash
bun install
```

### 3. Initialize & Seed Database
SQLite runs locally as a file at `backend/local.db`. You do not need to run a separate database process.
Create the tables and populate mock seed data (Hadoubrew Store & Customer cards):
```bash
# Push schema to local SQLite database
bun run db:push

# Run seed script
bun run db:seed
```

### 4. Start the Application
Start the Hono API (with hot-reloading) and the Vue 3 frontend dev server concurrently:
```bash
bun run dev
```
* **Hono API:** runs on `http://localhost:3000`
* **Vue 3 Frontend:** runs on `http://localhost:5173` (Vite proxies `/api` calls directly to port 3000)

### 5. Running Tests
Run backend unit and database integration tests:
```bash
bun test --cwd backend
```

---

## Production Deployment

The application is containerized to run on Docker, making it easy to deploy on platforms like **Railway**, **Render**, or **AWS ECS (Fargate)**.

### 1. Provision a Turso Database
1. Install the Turso CLI: `curl -sSf https://get.tur.so/install.sh | bash`
2. Authenticate: `turso auth login`
3. Create your production database: `turso db create coffee-card-prod`
4. Copy the connection URL: `libsql://coffee-card-prod-username.turso.io`
5. Generate an Auth Token: `turso db tokens create coffee-card-prod`

### 2. Push Schema to Turso
Apply the database structure to your remote production database:
```bash
DATABASE_URL="libsql://coffee-card-prod-username.turso.io" \
DATABASE_AUTH_TOKEN="your-token" \
bunx drizzle-kit push
```

### 3. Required Environment Variables
Configure your container host (Railway/Render env settings) with the following parameters:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Turso connection URL | `libsql://coffee-card-prod-username.turso.io` |
| `DATABASE_AUTH_TOKEN` | Turso authentication token | `jwt-token-string` |
| `QR_SECRET` | Secret key for HMAC QR signing | `your-secret-hmac-key` |
| `SQUARE_CLIENT_ID` | Square Developer Portal App ID | `sandbox-sq0idb-...` |
| `SQUARE_CLIENT_SECRET` | Square Developer Portal Secret | `sq0csp-...` |

### 4. Build and Run Container
The `Dockerfile` in the root of the project packages and runs the Hono API server.

To build and run locally to test the production API server:
```bash
# Build image
docker build -t coffee-card-api .

# Run container
docker run -p 3000:3000 --env-file .env coffee-card-api
```
Once deployed to your hosting provider, Hono will listen on port `3000` to serve the JSON API. You can host the Vue 3 frontend statically (e.g. on Cloudflare Pages or Vercel) and point it to this API subdomain. Since Hono has CORS enabled by default, it will accept requests from your frontend's domain.
