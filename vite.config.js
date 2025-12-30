import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/vr-lab-1/' : '/',
  plugins: command === 'serve' ? [basicSsl()] : [],
  resolve: {
    alias: {
      'three': path.resolve(__dirname, 'node_modules/.pnpm/super-three@0.173.5/node_modules/super-three')
    }
  },
  server: {
    host: true,
    open: 'https://192.168.29.126:5173'
  }
}));