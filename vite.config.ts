import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/core/finance": path.resolve(__dirname, "./src/capabilities/billing/finance"),
      "@/core/commerce": path.resolve(__dirname, "./src/capabilities/commerce/facade"),
      "@/core/product": path.resolve(__dirname, "./src/capabilities/commerce/catalog"),
      "@/core/inventory": path.resolve(__dirname, "./src/capabilities/commerce/stock"),
      "@/core/sales": path.resolve(__dirname, "./src/capabilities/commerce/saleLedger"),
      "@/core/loyalty": path.resolve(__dirname, "./src/capabilities/commerce/loyalty"),
      "@/core/availability": path.resolve(__dirname, "./src/capabilities/scheduling/availability"),
      "@/core/capacity": path.resolve(__dirname, "./src/capabilities/scheduling/capacity"),
      "@/core/calendar": path.resolve(__dirname, "./src/capabilities/scheduling/calendar"),
      "@/core/waitlist": path.resolve(__dirname, "./src/capabilities/booking/waitlist"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@refinedev")) {
              return "refine-vendor";
            }
            if (id.includes("@supabase")) {
              return "supabase-vendor";
            }
            if (id.includes("@tanstack")) {
              return "query-vendor";
            }
            if (id.includes("lucide-react")) {
              return "icons-vendor";
            }
            if (
              id.includes("/framer-motion/") ||
              id.includes("/motion-dom/") ||
              id.includes("/motion-utils/")
            ) {
              return "motion-vendor";
            }
            if (id.includes("/tailwind-merge/") || id.includes("/canvas-confetti/")) {
              return "ui-vendor";
            }
            if (id.includes("/zod/")) {
              return "zod-vendor";
            }
            if (id.includes("/xlsx/")) {
              return "xlsx-vendor";
            }
            if (id.includes("recharts")) {
              return "recharts-vendor";
            }
            if (
              id.includes("react/") ||
              id.includes("react-dom/") ||
              id.includes("react-router/") ||
              id.includes("react-router-dom/")
            ) {
              return "react-vendor";
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  esbuild: {
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },
});
