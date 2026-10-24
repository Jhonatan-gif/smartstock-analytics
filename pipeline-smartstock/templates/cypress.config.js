// Copiar como frontend/cypress.config.js
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4173',
    video: true,
    screenshotOnRunFailure: true,
    supportFile: false,
  },
})
