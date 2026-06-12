# Production Deployment Guide

This guide documents the steps required to deploy the containerized **Coffee Card** loyalty system to production.

---

## 1. Prerequisites

Ensure you have the following configured before deploying to production:

- **Bun**: Installed locally for building projects (`bun install` & `bun run build`).
- **Turso Account & CLI**: Required to provision your production relational database.
- **Docker**: For testing/building your container locally before pushing to production container hosts.
- **Shopify Partner Account**: Required if deploying the Shopify POS integration.

---

## 2. Production Database Setup (Turso)

The project uses Turso/libsql (a distributed edge SQLite database).

### 1. Provision a Database on Turso
Install the Turso CLI and create a production database:
```bash
# Log in to your Turso account
turso auth login

# Create a new database
turso db create coffee-card-prod
```

### 2. Copy the Connection URL & Auth Token
Retrieve the connection URL and generate an authentication token:
```bash
# Copy the URL (looks like libsql://coffee-card-prod-username.turso.io)
turso db show coffee-card-prod

# Generate and copy a production JWT token
turso db tokens create coffee-card-prod
```

### 3. Push Database Schema to Turso
Apply the schema definition from the monorepo to your remote Turso database:
```bash
DATABASE_URL="libsql://coffee-card-prod-username.turso.io" \
DATABASE_AUTH_TOKEN="your-token-here" \
bunx drizzle-kit push
```

---

## 3. Deploying the Backend API (Hono)

The Hono backend API runs as a standalone Docker container. You can deploy it to container-hosting platforms like **Railway**, **Render**, or **AWS ECS (Fargate)**.

### 1. Required Environment Variables
Configure your container hosting environment with the following environment variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Turso connection URL | `libsql://coffee-card-prod-username.turso.io` |
| `DATABASE_AUTH_TOKEN` | Turso authentication token | `jwt-token-string` |
| `QR_SECRET` | Secret key for dynamic HMAC QR code validation | `your-secret-hmac-key` |
| `SQUARE_CLIENT_ID` | Square Developer Portal App ID | `sq0idp-...` |
| `SQUARE_CLIENT_SECRET` | Square Developer Portal Client Secret | `sq0csp-...` |
| `PORT` | Listening port for the Hono server | `3000` |

### 2. Docker Build & Run (Local Test)
To verify the container builds and runs properly before deploying to a production host:
```bash
# Build the production Docker image
docker build -t coffee-card-api .

# Run the container locally using a .env file
docker run -p 3000:3000 --env-file .env coffee-card-api
```

---

## 4. Deploying the Web Frontend (Vue 3)

The Vue 3 frontend (`web-frontend/`) is a Single Page Application (SPA). It is compiled into static assets that can be hosted on edge networks like **Cloudflare Pages**, **Vercel**, or **Netlify**.

### 1. Build Static Assets
Build the production build in the `web-frontend` package:
```bash
bun --filter web-frontend build
```

### 2. Deploy to CDN
Deploy the compiled directory `web-frontend/dist` to your static hosting provider of choice. 
Ensure the frontend is configured to send requests to your production Hono API subdomain (e.g., `https://api.yourdomain.com`).

---

## 5. Deploying the Shopify POS Integration

The Shopify App runs as a Remix server.

1. Navigate to the `integrations/shopify` directory:
   ```bash
   cd integrations/shopify
   ```
2. Build the production server bundle:
   ```bash
   bun run build
   ```
3. Deploy the application to Shopify:
   ```bash
   bun run deploy
   ```
4. Follow the CLI prompts to register your production domain, connect it to your Shopify Partner App, and deploy your POS UI Extensions.
