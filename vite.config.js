import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/chat': 'http://localhost:3000'
    }
  }
});
