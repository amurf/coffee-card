import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { commitRedemption, configureApi } from "@coffee-card/shared";

if (process.env.VITE_API_URL) {
  configureApi(process.env.VITE_API_URL);
} else {
  console.warn("VITE_API_URL is missing in webhooks environment");
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // We are relying on the route name (webhooks.orders.paid.tsx) so topic is implicitly orders/paid.
  const typedPayload = payload as any;
  const noteAttributes = typedPayload.note_attributes || [];
  const tokenAttr = noteAttributes.find((attr: any) => attr.name === "_custom_redemption_token");
  
  if (tokenAttr && tokenAttr.value) {
    console.log(`Found redemption token: ${tokenAttr.value}, committing...`);
    try {
      await commitRedemption(tokenAttr.value);
      console.log("Successfully committed redemption", tokenAttr.value);
    } catch (err) {
      console.error("Failed to commit redemption:", err);
      // Depending on retry strategy, we might want to throw here to force Shopify to retry.
      // But typically, returning 200 is safest unless we're sure it's a transient error.
    }
  } else {
    console.log("No _custom_redemption_token found in order notes.");
  }

  return new Response("Webhook processed", { status: 200 });
};
