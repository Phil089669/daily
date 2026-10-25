import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    // Day logic depends on the local time zone, so tests pin the user's zone.
    env: { TZ: 'Europe/Berlin' },
  },
})
