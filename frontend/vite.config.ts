import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    basicSsl(), // Automatically provisions self-signed certificate for local HTTPS dev
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0', // binds to all network interfaces
    port: 5173,
    allowedHosts: true, // prevents Vite 6 from dropping foreign incoming requests / LAN devices
    https: {}, // Guarantees window.isSecureContext and navigator.mediaDevices camera access across LAN IPs
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[Vite Proxy Error]', err.message);
            // If backend is offline or disconnected, return valid JSON 502 instead of empty/broken response
            if (!res.headersSent && 'writeHead' in res) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'BACKEND_OFFLINE',
                  message:
                    'Cannot connect to backend at http://localhost:3000. Ensure the backend server is running (`npm run dev` in /backend).',
                })
              );
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
