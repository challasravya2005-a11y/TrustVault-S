# TrustVault Threat Model

## Authentication threats

### Credential stuffing and brute force
**Scenario:** An attacker tries common passwords against known email addresses.

**Mitigations:** Passwords are hashed with bcrypt; invalid logins return a generic error; failed login attempts are audited. For production, add rate limiting, account lockout/backoff, MFA, and monitoring.

### Session theft
**Scenario:** An attacker steals a session cookie through XSS or an insecure network.

**Mitigations:** Cookies are HTTP-only and `SameSite=Lax`; sessions expire after eight hours; HTTPS is required in production so the `Secure` flag is active. Add CSRF tokens and a persistent session store for production hardening.

## Authorization threats

### Insecure direct object reference
**Scenario:** A viewer changes `/api/documents/<id>` to another document ID or calls the download endpoint directly.

**Mitigations:** The server loads the document, checks ownership, role, and the current `document_access` row before returning metadata or file bytes. Denied attempts are logged.

### Privilege escalation
**Scenario:** A viewer sends `role: admin` or another user's ID in a request body.

**Mitigations:** Identity and role always come from the server-side session and database lookup. Role changes are restricted to administrators, and administrators cannot change their own role.

### Permission persistence after revocation
**Scenario:** A user retains access after an owner revokes permission.

**Mitigations:** Revocation deletes the `document_access` row immediately; every subsequent metadata, download, edit, share, or delete request rechecks permissions.

## File-handling threats

### Malicious file upload
**Scenario:** An attacker uploads an executable, script, or oversized file.

**Mitigations:** Uploads are limited to 5 MB and validated by both MIME type and extension for PDF, JPG, PNG, and TXT. Filenames are sanitized before storage.

### Public file exposure
**Scenario:** Uploaded files become publicly accessible through guessed URLs.

**Mitigations:** Files reside in a private Supabase Storage bucket. The backend downloads and streams them only after authorization; no permanent public URL is generated.

## Data-integrity threats

### Audit tampering
**Scenario:** A user or compromised client alters logs to hide activity.

**Mitigations:** The application only inserts audit records; it does not expose update or delete endpoints for audit logs. Database-level restrictions and operational monitoring should further protect the table.

### SQL injection
**Scenario:** Search fields contain SQL syntax intended to alter queries.

**Mitigations:** Supabase PostgREST calls use parameterized, structured filters rather than string-concatenated SQL. Inputs are trimmed, length-limited, and sanitized.

## Operational threats

### Secret leakage
**Scenario:** The Supabase service-role key is committed to GitHub or embedded in frontend code.

**Mitigations:** Secrets are read exclusively from server environment variables; `.env` is Git-ignored; `.env.example` contains no real credentials.

### Denial of service
**Scenario:** Large or repeated uploads exhaust server resources.

**Mitigations:** Multer enforces a 5 MB per-file limit and memory limits. Production should add request rate limits, virus scanning, object-storage lifecycle rules, and infrastructure autoscaling.
