import { defineConfig } from 'vite'

export default defineConfig({
  root: 'admin',
  base: '/',
  build: {
    outDir: '../editor-service/public',
    emptyOutDir: true,
  },
})
