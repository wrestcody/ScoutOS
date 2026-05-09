import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devServer from '@hono/vite-dev-server'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    react(),
    devServer({
      entry: 'server.ts',
      exclude: [
        /.*\.tsx?($|\?)/,
        /.*\.(s?css|less)($|\?)/,
        /.*\.(svg|png)($|\?)/,
        /^\/@.+$/,
        /^\/node_modules\/.*/,
      ],
      injectClientScript: false, // This is not working correctly with React
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
