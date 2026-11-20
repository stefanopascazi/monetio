# Sysadmin console (#47)

The console lives in its own repository (`monetio-admin`) and Vercel project. This repository owns
everything it relies on: the database schema, the worker that fills the run history and the design system.

## Database (migration 0038)

- `sysadmins`: users allowed into the console. Grant or revoke with
  `npm run admin:grant -- you@example.com [--revoke]` (production: `node scripts/dev/with-env.ts .env.prod npm run admin:grant -- ...`).
- `is_sysadmin()`: the console checks it after sign-in.
- `admin_health()`: health snapshot (worker runs, push delivery, PSD2 consents). Metadata only, no household data.
- `admin_log(action, target, details)`: append-only audit log of every sysadmin action.
- `job_runs`: one row per finished worker run, written by the worker and kept 30 days (`job-runs-purge`).

The console signs in with the normal Supabase auth and never holds the service-role key: every read
goes through the security-definer functions above, which refuse callers who are not sysadmins.

## Integrity checks (migration 0039)

- `integrity_findings()` lists current anomalies (ids, dates, counts only): `rule_double_booking`, `transfer_unlinked`,
  `transfer_missing_side`, `transfer_mismatch`, `orphan_movement`, `household_without_admin`, `balance_drift`.
  One-sided transfers from the spreadsheet import (`import_ref` set, no batch) are known history: counted as
  `legacy_one_sided_transfers`, never listed.
- `run_integrity_checks()` reconciles `integrity_anomalies` (new, still open, resolved) and logs `integrity_runs`.
- Worker job `integrity-check`: nightly after 04:00 Italian time, or within 2 minutes of a console request
  (`admin_request_job('integrity-check')`, audit-logged). The console reads `admin_integrity()`.
- SQL tests: `npm run test:db`, only against a local database (opt-in via `supabase/tests/db-tests.env`); skipped elsewhere, Vercel included.

## Design system

`packages/ui` is published to GitHub Packages as `@stefanopascazi/monetio-ui` by `.github/workflows/ui-package.yml`:

1. Bump `version` in `packages/ui/package.json` and merge.
2. Push a tag `ui-v<version>` (for example `git tag ui-v0.1.0 && git push origin ui-v0.1.0`).

The console installs it under the original name, so imports stay `@monetio/ui`:
`"@monetio/ui": "npm:@stefanopascazi/monetio-ui@<version>"`. The package ships TypeScript sources:
the console lists it in `transpilePackages`.
