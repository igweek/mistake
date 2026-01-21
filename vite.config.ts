
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  // Ensure env vars from Vercel (process.env) are mapped if needed, 
  // though Vite handles VITE_ prefix automatically.
  define: {
    'process.env': {} 
  }
});
