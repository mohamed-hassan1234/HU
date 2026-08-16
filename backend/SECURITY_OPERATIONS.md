# Security and Operations

## Production configuration

- Set `NODE_ENV=production`.
- Set `MONGO_URI` to the production database.
- Set `JWT_SECRET` to a unique random value of at least 32 characters. The server refuses to start with the documented placeholder.
- Set `JWT_EXPIRES_IN` (recommended: `1h`).
- Set `CLIENT_URL` to the exact HTTPS frontend origins, separated by commas.
- Keep `ALLOW_DATABASE_RESET=false`.

## Temporary passwords

Accounts created with an administrator-provided, imported, generated, or reset password are marked `mustChangePassword`. They may access only session information and the password-change endpoint until they choose a new password. Changing or resetting a password increments `tokenVersion`, invalidating previously issued JWTs.

## Login protection

Failed login attempts are limited to 10 per IP in a 15-minute window. Successful logins do not consume the limit. Failed attempts are written to the activity log without recording the supplied password.

## Database seed safety

The seed script deletes application collections and is disabled in production. In development it requires explicit confirmation:

```powershell
$env:ALLOW_DATABASE_RESET='true'
npm run seed
Remove-Item Env:ALLOW_DATABASE_RESET
```

Verify `MONGO_URI` before setting the confirmation flag.

## Dependency note

`npm audit` reports an unresolved high-severity advisory for the `xlsx` package. Uploads are authenticated, extension-filtered, and limited to 5 MB, but the package should be replaced with a maintained spreadsheet parser during the import/data-integrity phase. CSV imports are preferred until replacement is complete.
