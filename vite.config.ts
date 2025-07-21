import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Plugin to inject environment variables into HTML
    {
      name: 'inject-env-vars',
      transformIndexHtml(html: string) {
        // Get the relay URL from loaded environment variables
        const relayUrl = env.VITE_RELAY_URL || 'wss://relay.wavlake.com/';
        
        console.log('🔧 [Vite] Injecting relay URL into CSP:', relayUrl);
        
        // Extract protocol and host from relay URL for CSP
        let relayHost = '';
        try {
          const url = new URL(relayUrl);
          relayHost = `${url.protocol}//${url.host}`;
        } catch (e) {
          console.warn('Invalid VITE_RELAY_URL format, using fallback CSP');
          relayHost = 'wss://relay.wavlake.com';
        }
        
        // Replace the placeholder in CSP connect-src directive
        return html.replace(
          'ws://placeholder-will-be-replaced',
          relayHost
        );
      }
    },
    // Only include Sentry plugin in production builds
    process.env.NODE_ENV === "production" &&
      process.env.SENTRY_AUTH_TOKEN &&
      sentryVitePlugin({
        org: "wavlake",
        project: "web",
        authToken: process.env.SENTRY_AUTH_TOKEN,

        // Upload source maps for better error tracking
        sourcemaps: {
          assets: "./dist/**",
          ignore: ["node_modules"],
          // Only delete source maps in production to avoid debugging issues
          filesToDeleteAfterUpload: process.env.NODE_ENV === "production" ? ["./dist/**/*.map"] : [],
        },

        // Set release name
        release: {
          name: "0.0.1",
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Only enable source maps in production if Sentry is configured
    sourcemap: process.env.NODE_ENV === "production" ? !!process.env.SENTRY_AUTH_TOKEN : true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("react-router-dom")
          ) {
            return "react-vendor";
          }

          // Radix UI components (major bundle size)
          if (id.includes("@radix-ui/")) {
            return "ui-vendor";
          }

          // Nostr ecosystem
          if (id.includes("@nostrify/") || id.includes("nostr-tools")) {
            return "nostr-vendor";
          }

          // Form handling
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform/") ||
            id.includes("zod")
          ) {
            return "form-vendor";
          }

          // Media libraries
          if (id.includes("react-player") || id.includes("@zxing/")) {
            return "media-vendor";
          }

          // Charts
          if (id.includes("recharts")) {
            return "chart-vendor";
          }

          // Utility libraries
          if (
            id.includes("lucide-react") ||
            id.includes("date-fns") ||
            id.includes("clsx")
          ) {
            return "utils-vendor";
          }
        },
      },
    },
    // Increase chunk size warning threshold
    chunkSizeWarningLimit: 1000,
  },
  };
});
