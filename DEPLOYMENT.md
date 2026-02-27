# Deploying to AWS (Dev Environment)

This guide documents the steps required to deploy the `coffee-card` project to your AWS `dev` environment and Shopify. The project uses SST (v3) for backend AWS infrastructure and Shopify CLI for the POS application.

## 1. Prerequisites

Before starting, ensure you have the following installed and configured:

- **Node.js**: v18.20+ or v20.10+
- **Package Manager**: pnpm (v10.9.0 recommended)
- **AWS CLI**: Installed and configured with credentials for your target AWS account.
  - Run `aws configure` to set up your profile if you haven't already.
  - **Permissions Required**: Your configured AWS user or role **must have administrative privileges** (e.g., the `AdministratorAccess` managed policy). SST needs this because it fully provisions the infrastructure (IAM roles, API Gateways, Lambdas, DynamoDB tables, etc.) on your behalf.
- **Shopify Partner Account**: Required for deploying the POS app.

## 2. Initial Setup

Clone the repository and install the mono-repo dependencies.

```bash
git clone <repository-url>
cd coffee-card
pnpm install
```

## 3. Deploying the Backend to AWS

The backend (DynamoDB schema and API Gateway lambdas) is strictly managed by **SST** (Serverless Stack).

1. From the **root** of the workspace, run the SST deploy command:

   ```bash
   pnpm run deploy --stage dev
   # or
   npx sst deploy --stage dev
   ```

2. **Wait for deployment to finish**: SST will provision the resources on AWS. 
3. **Automatic Environment Variables**: Upon successful deployment, SST automatically generates `.env` files across the workspace (`web-frontend/.env`, `backend/.env`, and `shopify-pos-app/.env`) injected with your new AWS API URLs and DynamoDB table names.

## 4. Deploying the Shopify POS App

The Shopify app and its extensions rely on the backend API URL provided by the SST deployment.

1. Navigate to the `shopify-pos-app` directory:

   ```bash
   cd shopify-pos-app
   ```

2. Run the Shopify deploy command:

   ```bash
   pnpm run deploy
   ```

3. Follow the CLI prompts to log into your Shopify Partner account, select your Partner Organization, and select the Dev/Staging App. This step deploys your Shopify Extensions.

*(Note: For local development testing with Shopify, you can also run `pnpm run dev` in this folder which sets up a Cloudflare/ngrok tunnel).*

## 5. Web Frontend

The `web-frontend` package currently contains a Vite setup but does not have an explicit AWS infrastructure configuration via SST. If you intend to deploy it to AWS, it can be tested manually via Vite.

```bash
cd web-frontend
pnpm run build
```

The resulting `dist` folder can then be hosted on any static hosting provider of your choosing (e.g., AWS S3 + CloudFront).

---

> [!TIP]
> **Teardown**: If you ever need to remove the `dev` environment from AWS, you can easily clean up the resources by running `npx sst remove --stage dev` from the root directory.
