import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  // Monaco is one big chunk; that's expected for an editor app.
  build: { chunkSizeWarningLimit: 3500 },
})
