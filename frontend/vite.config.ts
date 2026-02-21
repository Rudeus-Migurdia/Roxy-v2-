import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pixi-live2d-display', 'pixi-live2d-display/cubism2'],
  },
  define: {
    // Make Live2D available globally for pixi-live2d-display
    __LIVE2D_SDK_ENABLED__: JSON.stringify(true),
  },
  server: {
    port: 5173,
    host: true,
  },
})
