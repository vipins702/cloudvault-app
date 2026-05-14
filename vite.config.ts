import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      // Local Proxy for Vercel Blob to bypass CORS
      '/api/vercel-blob': {
        target: 'https://blob.vercel-storage.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/vercel-blob/, ''),
        // Clean headers to look like a direct server call
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.removeHeader('Origin');
            proxyReq.removeHeader('Referer');
            // Optional: Set a neutral User-Agent if needed, though Vercel usually accepts browser UAs on public endpoints
            // proxyReq.setHeader('User-Agent', 'Node.js/Preview');
          });
        },
      },
    }
  }
});
