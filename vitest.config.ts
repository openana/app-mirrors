import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Scope to src/ so the local reference consumer clone under reference/
    // (which carries its own Playwright specs) is not swept up.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
