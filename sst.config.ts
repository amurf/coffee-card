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

    const routeConfig = {
      link: [table],
      environment: { TABLE_NAME: table.name },
    }

    api.route("GET /cards/{cardId}", {
      handler: "backend/src/lambda/card/index.handler",
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

    api.url.apply((url) => {
      table.name.apply((tableName) => {
        const fs = require("fs")

        // Frontend (Needs API URL)
        fs.writeFileSync("web-frontend/.env", `VITE_API_URL=${url}\n`)

        // Backend (Needs Table Name)
        fs.writeFileSync("backend/.env", `TABLE_NAME=${tableName}\n`)

        // Shopify App (Needs Table Name for local DB calls, and API URL)
        fs.writeFileSync(
          "shopify-app/.env",
          `TABLE_NAME=${tableName}\nVITE_API_URL=${url}\n`,
        )

        // Read Shopify App URL from shopify.app.toml to configure POS extension API proxy
        let appUrl = url
        try {
          const toml = fs.readFileSync("shopify-app/shopify.app.toml", "utf8")
          const match = toml.match(/application_url\s*=\s*"([^"]+)"/)
          if (match && match[1]) {
            appUrl = match[1]
          }
        } catch (e) {
          console.warn(
            "Could not read application_url from shopify.app.toml, using API Gateway URL fallback",
          )
        }

        fs.writeFileSync(
          "shopify-app/extensions/redeem-coffee/.env",
          `VITE_API_URL=${appUrl}/api\n`,
        )
      })
    })

    return {
      ApiEndpoint: api.url,
    }
  },
})
