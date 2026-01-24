import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  output: 'static',
  build: {
    assets: 'assets'
  },
  vite: {
    server: {
      proxy: {
        '/api': 'http://localhost:8081',
        '/sse': 'http://localhost:8081'
      }
    }
  }
});
