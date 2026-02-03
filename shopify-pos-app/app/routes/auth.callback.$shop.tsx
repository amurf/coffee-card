// app/routes/auth.callback.$shop.tsx
import type { LoaderFunctionArgs } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("auth.callback.$shop.tsx HIT ✅")
  return authenticate.admin(request)
}
