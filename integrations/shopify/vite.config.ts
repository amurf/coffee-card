import { vitePlugin as remix } from "@remix-run/dev"
import { installGlobals } from "@remix-run/node"
import { defineConfig, type UserConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

installGlobals({ nativeFetch: true })

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
// Replace the HOST env var with SHOPIFY_APP_URL so that it doesn't break the remix server. The CLI will eventually
// stop passing in HOST, so we can remove this workaround after the next major release.
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST
  delete process.env.HOST
}

// Sync the Shopify app URL with the POS extension's .env file
const syncExtensionEnv = () => {
  let appUrl = process.env.SHOPIFY_APP_URL || process.env.HOST

  if (!appUrl) {
    try {
      const tomlPath = path.resolve(__dirname, "shopify.app.toml")
      if (fs.existsSync(tomlPath)) {
        const toml = fs.readFileSync(tomlPath, "utf8")
        const match = toml.match(/application_url\s*=\s*"([^"]+)"/)
        if (match && match[1]) {
          appUrl = match[1]
        }
      }
    } catch (e) {
      console.warn(
        "[Vite] Could not read application_url from shopify.app.toml:",
        e,
      )
    }
  }

  if (appUrl) {
    const extEnvPath = path.resolve(__dirname, "extensions/redeem-coffee/.env")
    const extEnvDir = path.dirname(extEnvPath)
    try {
      if (!fs.existsSync(extEnvDir)) {
        fs.mkdirSync(extEnvDir, { recursive: true })
      }
      fs.writeFileSync(extEnvPath, `VITE_API_URL=${appUrl}/api\n`)
      console.log(
        `[Vite] Synchronized extension .env with VITE_API_URL=${appUrl}/api`,
      )
    } catch (e) {
      console.error("[Vite] Failed to write extension .env:", e)
    }
  }
}

syncExtensionEnv()

const host = new URL(process.env.SHOPIFY_APP_URL || "http://localhost").hostname

let hmrConfig
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  }
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: parseInt(process.env.FRONTEND_PORT!) || 8002,
    clientPort: 443,
  }
}

export default defineConfig({
  server: {
    allowedHosts: [host],
    cors: {
      preflightContinue: true,
    },
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      // See https://vitejs.dev/config/server-options.html#server-fs-allow for more information
      allow: ["app", "node_modules"],
    },
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
        v3_singleFetch: false,
        v3_routeConfig: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  optimizeDeps: {
    include: ["@shopify/app-bridge-react", "@shopify/polaris"],
  },
}) satisfies UserConfig
