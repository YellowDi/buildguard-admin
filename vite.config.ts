import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

const apiTarget = "https://www.nbbjyw.com"

export default defineConfig({
  base: "/admin/",
  plugins: [vue(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return
          }

          if (id.includes("@unovis")) {
            return "vendor-unovis"
          }

          if (id.includes("@amap/amap-jsapi-loader")) {
            return "vendor-amap"
          }

          if (id.includes("html2canvas")) {
            return "vendor-html2canvas"
          }

          if (id.includes("jspdf")) {
            return "vendor-jspdf"
          }

          if (id.includes("reka-ui") || id.includes("@vueuse")) {
            return "vendor-ui"
          }

          if (id.includes("vue-router")) {
            return "vendor-router"
          }

          if (id.includes("/vue/")) {
            return "vendor-vue"
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    proxy: {
      "/bqi": {
        target: apiTarget,
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (proxyReq) => {
            // Some backend deployments validate request source and reject LAN dev origins.
            proxyReq.setHeader("Origin", apiTarget)
            proxyReq.setHeader("Referer", `${apiTarget}/`)
          })
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
