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
});
