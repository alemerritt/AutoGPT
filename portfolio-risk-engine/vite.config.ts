import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Browser pages cannot call Yahoo Finance or FRED directly (no CORS headers on
// those APIs), so the dev server proxies them. `npm run dev` gives you live
// data; a static production build should sit behind an equivalent reverse
// proxy (nginx/Cloudflare worker) exposing the same /api/* routes.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/yahoo/, ""),
      },
      "/api/fred": {
        target: "https://api.stlouisfed.org",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/fred/, ""),
      },
      "/api/fmp": {
        target: "https://financialmodelingprep.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/fmp/, ""),
      },
    },
  },
});
