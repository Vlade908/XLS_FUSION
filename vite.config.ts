import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      // Quando o front chamar /api, o Vite redireciona para o Backend
      '/api': {
        target: 'http://localhost:5000', // Certifique-se que seu servidor node usa esta porta
        changeOrigin: true,
        timeout:60000,
        proxyTimeout: 60000,
        secure: false,
      },
    },
  },
});