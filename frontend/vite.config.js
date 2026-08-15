import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'aifinanceassistant.com',
      'www.aifinanceassistant.com',
      'localhost'
    ],
  },
});