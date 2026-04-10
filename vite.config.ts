import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    headers: {
      // Habilita WebAssembly multi-threading (SharedArrayBuffer)
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  build: {
    rollupOptions: {
      external: ["@xenova/transformers", "@imgly/background-removal"],
    },
  },
  worker: {
    rollupOptions: {
      external: ["@xenova/transformers", "@imgly/background-removal"],
    },
  },
})
