import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:4173',
    viewportWidth: 1280,  // >= breakpoint lg de Tailwind: sidebar visible
    viewportHeight: 800,
    video: true,
    screenshotOnRunFailure: true,
    supportFile: false,
  },
})
