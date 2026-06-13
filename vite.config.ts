import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // pinned to match the CORS origin in wreckshopmediav2-server
    port: 5371,
  },
})
