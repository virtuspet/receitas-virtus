import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const API_PORT = process.env.API_PORT || "8787";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "logo-virtus.png"],
      manifest: {
        name: "Receitas Virtus Pet",
        short_name: "Receitas VP",
        description: "Leitura e análise de receitas veterinárias da loja",
        lang: "pt-BR",
        start_url: "/",
        display: "standalone",
        background_color: "#ffc100",
        theme_color: "#ffc100",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Nunca cachear /api — dados sempre frescos
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
          {
            // Fontes do Google (Poppins / Nunito Sans) — guardadas para uso offline
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": `http://localhost:${API_PORT}`,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
