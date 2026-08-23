import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Applies the local docker-compose DATABASE_URL when one is not already
    // set, so `npm run test:acceptance` is identical on PowerShell, bash, and
    // in GitHub Actions.
    setupFiles: ["tests/setup/database-url.ts"],
  },
});
