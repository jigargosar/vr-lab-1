import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig({
  plugins: [basicSsl()],
  resolve: {
    alias: {
      'three': path.resolve(__dirname, 'node_modules/.pnpm/super-three@0.173.5/node_modules/super-three')
    }
  },
  server: {
    host: true,
    open: 'https://192.168.29.126:5173'
  }
});