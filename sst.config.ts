/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "coffee-card",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
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
    });

    const api = new sst.aws.ApiGatewayV2("Api");

    const routeConfig = {
      link: [table],
      environment: { TABLE_NAME: table.name },
    };

    api.route("GET /cards/{cardId}", {
      handler: "backend/src/lambda/card/index.handler",
      ...routeConfig,
    });

    api.route("POST /cards/{cardId}/redeem", {
      handler: "backend/src/lambda/redeem/index.handler",
      ...routeConfig,
    });

    api.route("POST /stores/{storeId}/cards", {
      handler: "backend/src/lambda/create-card/index.handler",
      ...routeConfig,
    });

    api.route("GET /stores/{storeId}", {
      handler: "backend/src/lambda/store/index.handler",
      ...routeConfig,
    });

    api.url.apply((url) => {
      table.name.apply((tableName) => {
        const fs = require("fs");
        
        // Frontend (Needs API URL)
        fs.writeFileSync("web-frontend/.env", `VITE_API_URL=${url}\n`);

        // Backend (Needs Table Name)
        fs.writeFileSync("backend/.env", `TABLE_NAME=${tableName}\n`);

        // Shopify POS App (Needs Table Name for local DB calls, and API URL)
        fs.writeFileSync("shopify-pos-app/.env", `TABLE_NAME=${tableName}\nVITE_API_URL=${url}\n`);
      });
    });

    return {
      ApiEndpoint: api.url,
    };
  },
});
