/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "coffee-card",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    }
  },
  async run() {
    const table = new sst.aws.Dynamo("CoffeeCardData", {
      fields: {
        PK: "string",
        SK: "string",
        cardId: "string",
      },
      primaryIndex: { hashKey: "PK", rangeKey: "SK" },
      globalIndexes: {
        getByCardId: { hashKey: "cardId" },
      },
    })

    const api = new sst.aws.ApiGatewayV2("Api")

    const qrSecret =
      process.env.QR_SECRET ||
      (input?.stage !== "production"
        ? "coffee-card-default-qr-hmac-secret-key-32-chars-long"
        : (() => {
            throw new Error(
              "QR_SECRET environment variable is required in production stage",
            )
          })())

    const routeConfig = {
      link: [table],
      environment: {
        TABLE_NAME: table.name,
        QR_SECRET: qrSecret,
        SQUARE_CLIENT_ID: process.env.SQUARE_CLIENT_ID || "",
        SQUARE_CLIENT_SECRET: process.env.SQUARE_CLIENT_SECRET || "",
        SQUARE_REDIRECT_URI: process.env.SQUARE_REDIRECT_URI || "",
      },
    }

    api.route("GET /cards/{cardId}", {
      handler: "backend/src/lambda/card/index.handler",
      ...routeConfig,
    })

    api.route("GET /cards/{cardId}/qr-token", {
      handler: "backend/src/lambda/qr-token/index.handler",
      ...routeConfig,
    })

    api.route("POST /redemptions/reserve", {
      handler: "backend/src/lambda/reserve-redemption/index.handler",
      ...routeConfig,
    })

    api.route("POST /redemptions/commit", {
      handler: "backend/src/lambda/commit-redemption/index.handler",
      ...routeConfig,
    })

    api.route("POST /stores/{storeId}/cards", {
      handler: "backend/src/lambda/create-card/index.handler",
      ...routeConfig,
    })

    api.route("GET /stores/{storeId}", {
      handler: "backend/src/lambda/store/index.handler",
      ...routeConfig,
    })

    api.route("POST /integrations/square/webhook", {
      handler: "backend/src/lambda/integrations/square/webhook/index.handler",
      ...routeConfig,
    })

    api.route("GET /integrations/square/callback", {
      handler: "backend/src/lambda/integrations/square/callback/index.handler",
      ...routeConfig,
    })

    api.route("POST /merchant/cards/verify-token", {
      handler: "backend/src/lambda/verify-token/index.handler",
      ...routeConfig,
    })

    api.route("POST /merchant/cards/{cardId}/stamps", {
      handler: "backend/src/lambda/add-stamps/index.handler",
      ...routeConfig,
    })

    api.route("POST /merchant/cards/{cardId}/claim", {
      handler: "backend/src/lambda/claim-reward/index.handler",
      ...routeConfig,
    })

    api.url.apply((url) => {
      table.name.apply((tableName) => {
        const fs = require("fs")
        const path = require("path")

        const rootDir = process.cwd()

        // Frontend (Needs API URL)
        fs.writeFileSync(
          path.resolve(rootDir, "web-frontend/.env"),
          `VITE_API_URL=${url}\n`,
        )

        // Backend (Needs Table Name and QR Secret)
        fs.writeFileSync(
          path.resolve(rootDir, "backend/.env"),
          `TABLE_NAME=${tableName}\nQR_SECRET=${qrSecret}\n`,
        )

        // Shopify App (Needs Table Name, QR Secret, and API URL)
        fs.writeFileSync(
          path.resolve(rootDir, "integrations/shopify/.env"),
          `TABLE_NAME=${tableName}\nQR_SECRET=${qrSecret}\nAPI_URL=${url}\n`,
        )
      })
    })

    return {
      ApiEndpoint: api.url,
    }
  },
})
