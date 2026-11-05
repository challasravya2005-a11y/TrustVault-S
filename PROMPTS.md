# AI Usage Log

## 2026-11-01 — Authentication design
**Prompt:** “Design secure login and logout for a Node.js/Express application using bcrypt and server-side sessions. Explain how to avoid trusting client-supplied roles.”

**Use:** Used to shape the session-based authentication flow, bcrypt hashing, HTTP-only cookies, and the rule that identity and role are reloaded from the database on every authenticated request.

## 2026-11-01 — Access-control model
**Prompt:** “Create a role-based authorization model for document owners, viewers, and administrators, including Read and Edit permissions and immediate revocation.”

**Use:** Used to define the `document_access` model, server-side permission checks for every document route, and immediate revocation by deleting the access record.

## 2026-11-02 — Audit logging
**Prompt:** “What fields should an append-only audit log contain for document views, downloads, edits, shares, revocations, and denied authorization attempts?”

**Use:** Used to define audit fields: user, email, action, document, timestamp, success/failure, and JSON details. The implementation records both successful and refused operations.

## 2026-11-02 — Secure Supabase storage
**Prompt:** “How can a Node.js backend serve files from private Supabase Storage without exposing permanent public URLs?”

**Use:** Used to implement private-bucket storage and server-mediated downloads, where the backend verifies permission before streaming file bytes to the user.

## 2026-11-03 — Upload validation
**Prompt:** “Implement secure file-upload validation in Express/Multer for PDF, JPG, PNG, and TXT files with a 5 MB maximum.”

**Use:** Used to implement MIME-type and extension validation, filename sanitization, and the 5 MB upload limit.

## 2026-11-04 — Automated security tests
**Prompt:** “Write Jest and Supertest cases for login failure, unauthorized document access, read-versus-edit permissions, revocation, upload validation, and failed-access audit records.”

**Use:** Used to structure the test suite and ensure each security requirement has an executable regression test.
