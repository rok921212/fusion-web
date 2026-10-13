# Fusion Esports

Corporate website, portfolio and admin CMS for Fusion Esports, built with Next.js 16 (App Router, Cache Components), MongoDB, Tailwind CSS 4, three.js and motion.

All website content lives in MongoDB and is managed from `/admin`. Nothing is read from Google Sheets.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI and ADMIN_INVITE_SECRET
npm run dev
```

Open http://localhost:3000.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string. Server-only. |
| `MONGODB_DB` | no | Database name, default `fusion`. |
| `ADMIN_INVITE_SECRET` | for sign-up | The admin **access code**. |
| `NEXT_PUBLIC_SITE_URL` | before going live | Canonical URL, sitemap, invitation links. |
| `BLOB_READ_WRITE_TOKEN` | serverless hosts | Image storage on Vercel Blob. Otherwise `.data/uploads`. |
| `GOOGLE_SITE_VERIFICATION` | no | Google Search Console. |

Indexes are created automatically on first connection. A failed index is logged and does not stop the site.

## Admin panel

### First administrator

1. Open `/admin`. With no accounts yet you are sent to `/admin/register`.
2. Enter the access code (`ADMIN_INVITE_SECRET`), your name, email and a password. This first account becomes the **super admin**. Only one request can claim that role, even if two people try at once.

### More administrators

- **Invitations (recommended):** Administrators → *Invite an administrator*. Choose the role and how long the link stays valid (1–14 days). The one-time link is shown once; send it privately. Only a hash of the token is stored.
- **Access code:** anyone with the code can create an account at `/admin/register`. These accounts get the role set under Administrators → Security (Content editor by default). Turn this off there once your team is set up. Changing the security settings requires your current password.
- **Forgotten password:** a super admin creates a reset link for that person (valid 24 hours, single use). Using it signs them out everywhere.

### Roles

| | Super admin | Admin | Content editor |
| --- | :-: | :-: | :-: |
| Create and edit content, upload images | ✓ | ✓ | ✓ (drafts only) |
| Publish / unpublish, delete | ✓ | ✓ | |
| Home page & settings, messages, media deletion | ✓ | ✓ | |
| Administrators, security settings, audit log | ✓ | | |

Permissions are checked on the server in every page, server action and route handler (`lib/dal.ts` → `requireAdmin(permission)`), not only hidden in the UI. You cannot change your own role or deactivate yourself, and the last active super admin cannot be demoted or deactivated. Role changes, deactivation and password resets end that person's sessions immediately.

### What can be managed

Portfolio (with partner, YouTube video, project link, gallery and SEO fields), YouTube & videos, news & updates (scheduled by setting a future publish date), partners and collaborations, website links ("Live now" on the home page, footer links, socials, with an optional hide-after date) and services. It also covers home page hero buttons, the announcement banner and section visibility, contact details, the sharing image, the media library, the contact-form inbox and the audit log.

Lists support search, published/draft filters, pagination, bulk publish/unpublish and duplicate. Saving invalidates the matching cache tags, so changes appear on the public site straight away without a redeploy. Scheduled articles appear within an hour of their date.

## Security

- Sessions: a random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only its SHA-256 hash is stored, in the `sessions` collection, with a 7-day expiry. A new token is issued at every sign-in and password change.
- Passwords: bcrypt (cost 12). At least 10 characters, mixing three character types.
- Brute force: per-IP and per-email limits on sign-in, plus limits on code sign-up and invitations, with progressive delays. Unknown emails and wrong passwords take the same time and show the same message.
- Server Actions check the request origin; the upload route also checks `Origin`. Uploads are identified by their file bytes (JPG, PNG, WebP, AVIF and GIF only; no SVG) and limited to 4 MB.
- YouTube links are reduced to a validated 11-character video id. Players load only on click, from `youtube-nocookie.com`.
- Markdown is rendered without raw HTML. Links in content must be `http(s)` URLs or site paths.
- Headers: Content-Security-Policy, HSTS (production), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. Admin pages are sent `private, no-store` and `noindex`.
- Audit log: sign-ins and failures, sign-ups, invitations, role changes, content changes and publishing, uploads, deletions and setting changes, with actor, IP and time. It never contains passwords, tokens or the access code.

## Data migration

`npm run db:migrate-sqlite` copies the old SQLite database (`.data/fusion.db`) into MongoDB. It only inserts what is missing (matched on the old id), so you can run it again safely: it never overwrites edits made in `/admin` and never deletes anything. It prints a report of found, inserted, skipped and failed rows.

The Google Sheet that was briefly connected contained only header rows, so there was nothing to import from it. The sheet itself was left untouched.

## Backup and restore

Use Atlas backups (Cloud Backup on M10+ clusters, or scheduled snapshots), or dump the database yourself:

```bash
mongodump --uri="$MONGODB_URI" --db=fusion --out=backup-$(date +%F)
mongorestore --uri="$MONGODB_URI" --nsInclude="fusion.*" backup-YYYY-MM-DD/
```

Restore into a new database name first (`--nsFrom="fusion.*" --nsTo="fusion_restore.*"`) and check it before switching `MONGODB_DB`. Uploaded images live in `.data/uploads` or Vercel Blob; back those up too.

## Tests

```bash
npm test            # unit tests: YouTube parsing, permissions, validation, upload sniffing
npm run typecheck
npm run lint
```

End-to-end test in a real browser, against a **throwaway** database (the script refuses any database name not ending in `_test` and empties it first):

```bash
MONGODB_DB=fusion_test npx next build
MONGODB_DB=fusion_test npx next start -p 3100
MONGODB_DB=fusion_test npm run test:e2e
```

It covers first-account setup with the access code, content publishing and its effect on the public site, invalid YouTube links, duplicate slugs, invitations, editor restrictions and drafts, bulk publishing, deactivation, upload validation, sign-in failures, the audit log, and a check that no secrets reach the browser.

## Deploying

1. In MongoDB Atlas, create a database user limited to this database, and allow your host's IP addresses under Network Access.
2. Set the environment variables above on the host. Use a long random `ADMIN_INVITE_SECRET`.
3. `npm run build && npm start`, or deploy to Vercel (set `BLOB_READ_WRITE_TOKEN` there for images).
4. Open `/admin` and create the super admin account straight away.
5. Health check: `GET /api/health` returns `{"status":"ok"}`, or 503 if the database is unreachable.

Rollback: redeploy the previous build. Content changes are not tied to deployments, and no migration runs automatically.

## Project layout

```
app/(site)/        public pages (home, portfolio, videos, news, partners, ...)
app/admin/         admin: sign-in, sign-up, invitations, and the panel
app/api/           image upload and health check
components/site/   public UI, three.js hero (hero-scene.tsx), 3D tilt, YouTube player
components/admin/  admin forms and UI
lib/data/          cached public queries (published content only)
lib/actions/       server actions: auth, users, content, media, contact
lib/admin/         content types: add a field here and it appears in the admin form
lib/db/            MongoDB client, document types, indexes
lib/dal.ts         sessions and permission checks
lib/permissions.ts roles
scripts/           SQLite → MongoDB migration
tests/             unit and end-to-end tests
```
