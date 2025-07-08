import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
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
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
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
    sourcemap: true, // Enable source maps for better error tracking
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
}));
