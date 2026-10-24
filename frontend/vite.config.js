import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:    'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // Vitest: pruebas unitarias de componentes (jsdom) + cobertura lcov para SonarQube
  test: {
    environment: 'jsdom',
    setupFiles:  './src/test/setup.js',
    include:     ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include:  ['src/**/*.{js,jsx}'],
      exclude:  ['src/**/*.test.{js,jsx}', 'src/test/**', 'src/main.jsx'],
    },
  },
});
