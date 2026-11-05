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

## API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Log in |
| POST | `/api/auth/logout` | Authenticated | Log out |
| GET | `/api/auth/me` | Authenticated | Current session user |
| GET | `/api/documents` | Authenticated | Search/list authorized documents |
| POST | `/api/documents` | Authenticated | Upload PDF/JPG/PNG/TXT up to 5 MB |
| GET | `/api/documents/:id` | Read+ | View metadata |
| GET | `/api/documents/:id/download` | Read+ | Download through the server |
| PATCH | `/api/documents/:id` | Edit+/Owner/Admin | Rename, recategorize, or replace file |
| DELETE | `/api/documents/:id` | Owner/Admin | Delete document |
| GET | `/api/documents/:id/access` | Owner/Admin | List permissions |
| POST | `/api/documents/:id/access` | Owner/Admin | Grant `read` or `edit` |
| DELETE | `/api/documents/:id/access/:userId` | Owner/Admin | Revoke access |
| GET | `/api/admin/users` | Admin | List users |
| PATCH | `/api/admin/users/:id` | Admin | Change user role |
| GET | `/api/admin/documents` | Admin | List all documents |
| DELETE | `/api/admin/documents/:id` | Admin | Delete any document |
| GET | `/api/audit` | Admin | Filter audit logs |

## Tests

```bash
npm test
```

Tests cover login success/failure, admin authorization, owner access, shared viewer access, unauthorized access, read-versus-edit permissions, revocation, upload validation, and audit logging of refused attempts.

The tests use an in-memory mock of the Supabase data layer, so they run without real Supabase credentials.

## VS CODE

1. Import or upload this project to VS CODE.
2. Create `.env` using `.env.example`.
3. Run `npm install`.
4. Run `npm run seed` once.
5. Run `npm start`.
6. Open the preview URL and log in with a demo account.

VS CODE is suitable for local/demo use. For a durable deployment, use Render for the backend and Supabase for the database/storage.

## Render deployment

1. Push the project to GitHub without `.env`.
2. In Render, create a **Web Service** from the repository.
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `SUPABASE_STORAGE_BUCKET=documents`, and `NODE_ENV=production`.
6. Deploy, then run the seed script locally against the same Supabase project or use a Render one-time job.

## Security notes

- Every document operation rechecks the session user, role, ownership, and current permission on the server.
- Browser-supplied roles and user IDs are never trusted.
- Files are stored in a private Supabase bucket and streamed through an authorized backend endpoint; no permanent public URLs are issued.
- Access revocation deletes the permission row before any subsequent download or edit request, so it takes effect immediately.
- Audit events include user, action, document, timestamp, success/failure, and contextual details, including denied attempts.
- Sessions use HTTP-only cookies; enable HTTPS in production so the `Secure` cookie flag is effective.

