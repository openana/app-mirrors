import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/consts" as *;\n`,
      },
    },
  },
  server: {
    proxy: {
      '/api/mirrors.json': {
        target: 'https://mirrors.xjtu.edu.cn',
        changeOrigin: true,
      },
      '/api/downloads.json': {
        target: 'https://mirrors.xjtu.edu.cn',
        changeOrigin: true,
      },
    },
  },
});