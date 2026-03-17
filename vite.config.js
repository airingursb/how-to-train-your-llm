import { defineConfig } from 'vite'

export default defineConfig({
  base: '/how-to-train-your-llm/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: true,
  },
})
