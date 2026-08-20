import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer'),
      '@core': resolve('src/renderer/core'),
      '@shell': resolve('src/renderer/shell'),
      '@theme': resolve('src/renderer/theme'),
      '@plugins': resolve('src/renderer/plugins'),
      '@ai': resolve('src/renderer/ai'),
      '@components': resolve('src/renderer/components'),
      '@hooks': resolve('src/renderer/hooks'),
      '@lib': resolve('src/renderer/lib'),
      '@shared': resolve('src/shared'),
    },
  },
  build: {
    outDir: '../../out/renderer',
  },
  server: {
    port: 5173,
  },
})
