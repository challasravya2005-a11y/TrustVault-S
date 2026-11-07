# TrustVault — Secure Document Sharing Platform

TrustVault is a full-stack document-sharing application with role-based access control, private Supabase Storage, server-side authorization, and append-only audit logging.

## Roles

| Role | Capabilities |
|---|---|
| Admin | Manage users and roles, view/delete all documents, manage permissions, view audit logs |
| Uploader / Owner | Upload, view, edit, share, revoke, and delete their own documents |
| Viewer | View and download only documents explicitly shared with them |

## Tech stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- Database and private file storage: Supabase
- Authentication: bcrypt password hashing and HTTP-only session cookies
- Tests: Jest and Supertest

## Project structure

```text
index.js
seed-users.js
src/app.js
src/db.js
src/routes/
src/middleware.js
src/audit.js
public/
database/schema.sql
tests/
```

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `database/schema.sql`. It creates or safely updates the `users`, `documents`, `document_access`, and `audit_logs` tables, enables RLS, and creates the private `documents` storage bucket.
3. Copy the project URL and service-role key from **Project Settings → API**.
4. Create `.env` from `.env.example` and fill in the values.

The service-role key is used only by the Node.js backend. It must never be placed in `public/`, browser JavaScript, or a Git repository.

## Local setup

```bash
npm install
cp .env.example .env
# Edit .env with your Supabase URL, service-role key, and session secret
npm run seed
npm start
```

Open `http://localhost:3000`.

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@trustvault.test | Admin@12345 |
| Uploader | uploader@trustvault.test | Uploader@12345 |
| Viewer | viewer@trustvault.test | Viewer@12345 |

Change these credentials before any public deployment.
## API overview

The backend exposes REST API endpoints for authentication, documents, sharing, permissions, admin management, and audit logs.

Main endpoint groups:

- `/api/auth` — login, logout, current session
- `/api/documents` — upload, list, view, download, edit, delete
- `/api/documents/:id/access` — grant and revoke read/edit permissions
- `/api/admin` — manage users, documents, and view audit logs
- `/api/audit` — view audit logs (Admin only)

All document operations enforce server-side authorization. Audit logs record successful and denied actions.

## Tests

```bash
npm test
```

Tests cover login success/failure, admin authorization, owner access, shared viewer access, unauthorized access, read-versus-edit permissions, revocation, upload validation, and audit logging of refused attempts.

The tests use an in-memory mock of the Supabase data layer, so they run without real Supabase credentials.

## Development and deployment

This project was developed locally using Visual Studio Code (VS Code).

### Run locally

1. Open the project folder in VS Code.
2. Create `.env` from `.env.example`.
3. Add your Supabase URL, service-role key, storage bucket name, and session secret.
4. Run:

```bash
npm install
npm run seed
npm start
```

5. Open the URL shown in the terminal, usually `http://localhost:3000`.

## Render deployment

1. Push the project to GitHub without `.env`.
2. In Render, create a **Web Service** from the repository.
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables:
- `NODE_ENV=production`
   - `SESSION_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET=documents`
6. Deploy, then run the seed script locally against the same Supabase project or use a Render one-time job.
## Security notes

- Every document operation rechecks the session user, role, ownership, and current permission on the server.
- Browser-supplied roles and user IDs are never trusted.
- Files are stored in a private Supabase bucket and streamed through an authorized backend endpoint; no permanent public URLs are issued.
- Access revocation deletes the permission row before any subsequent download or edit request, so it takes effect immediately.
- Audit events include user, action, document, timestamp, success/failure, and contextual details, including denied attempts.
- Sessions use HTTP-only cookies; enable HTTPS in production so the `Secure` cookie flag is effective.
