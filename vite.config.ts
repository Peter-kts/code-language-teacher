import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error plain JS module shared with the production server
import { handleChat } from './server/chat.mjs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'chat-api',
      configureServer(server) {
        server.middlewares.use('/api/chat', handleChat)
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/chat', handleChat)
      },
    },
  ],
  worker: { format: 'es' },
  // Monaco is one big chunk; that's expected for an editor app.
  build: { chunkSizeWarningLimit: 3500 },
})
