import type { LoaderFunctionArgs } from "@remix-run/node"
import { authenticate } from "../shopify.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("loader auth.$.tsx")
  await authenticate.admin(request)
  return null
}
