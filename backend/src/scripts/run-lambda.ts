// Run lambda code locally
// It will just import the lambda and call the handler function, passing in a apigateway event and context
// This is useful for testing the lambda code locally without deploying it to AWS

import { APIGatewayProxyEvent } from "aws-lambda"
import { handler } from "../lambda/store"

async function main() {
  const event: APIGatewayProxyEvent = {
    headers: {
      Header1: "value1",
      Header2: "value1,value2",
    },
    queryStringParameters: {
      parameter1: "value1,value2",
      parameter2: "value",
    },
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      authorizer: {
        jwt: {
          claims: {
            claim1: "value1",
            claim2: "value2",
          },
          scopes: ["scope1", "scope2"],
        },
      },
      domainName: "id.execute-api.us-east-1.amazonaws.com",
      domainPrefix: "id",
      requestId: "id",
      routeKey: "$default",
      stage: "$default",
      protocol: "HTTP/1.1",
      httpMethod: "GET",
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: "",
        user: null,
        userAgent: null,
        userArn: null,
      },
      path: "",
      requestTimeEpoch: 0,
      resourceId: "",
      resourcePath: "",
    },
    body: "eyJ0ZXN0IjoiYm9keSJ9",
    pathParameters: {
      storeName: "CoffeeLads",
    },
    isBase64Encoded: true,
    stageVariables: {
      stageVariable1: "value1",
      stageVariable2: "value2",
    },
    multiValueHeaders: {},
    httpMethod: "",
    path: "",
    multiValueQueryStringParameters: null,
    resource: "",
  }

  const response = await handler(event)
  console.log(response)
}

main()
