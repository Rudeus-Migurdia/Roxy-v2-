import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pixi-live2d-display', 'pixi-live2d-display/cubism2'],
  },
  server: {
    port: 5173,
    host: true,
  },
})
