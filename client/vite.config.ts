import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Forward API calls to the Express server so the browser only ever talks to one origin.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
