/**
 * Default DATABASE_URL to the local docker-compose service.
 *
 * Without this, running the acceptance suite requires prefixing the command
 * with an environment variable. `DATABASE_URL=... npm run test:acceptance` is
 * POSIX shell syntax and fails in PowerShell, so the setup step differed per
 * operating system for no good reason.
 *
 * An explicitly set DATABASE_URL always wins, which is how CI points the suite
 * at the Actions service container on port 5432.
 */
const DEFAULT_LOCAL_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:55432/northstar";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_LOCAL_DATABASE_URL;
}
