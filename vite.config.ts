import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,
    allowedHosts: 'all',
    https: {
      cert: fs.readFileSync('./10.40.172.220+2.pem'),
      key: fs.readFileSync('./10.40.172.220+2-key.pem'),
    },
    proxy: {
      '/rest': { target: 'http://localhost:54321', changeOrigin: true },
      '/auth': { target: 'http://localhost:54321', changeOrigin: true },
      '/storage': { target: 'http://localhost:54321', changeOrigin: true },
      '/realtime': { target: 'ws://localhost:54321', changeOrigin: true, ws: true },
      '/webhook': { target: 'http://localhost:5678', changeOrigin: true },
    },
  },
});
