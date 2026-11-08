## Entry 1: Project Setup & Repository Configuration
<<<<<<< HEAD
- AI Tool Used: Gemini

Prompt: Asked for project roadmap, tech stack selection, and repository visibility rules according to challenge guidelines.

Notes / Decisions: Kept the repository private during active development to protect work per hackathon instructions, and plan to switch it to public right before the final deadline.

## Entry 2: Authentication and Session Handling
- AI Tool Used: Perplexity
- Prompt: Asked how to implement secure login, logout, password hashing, and session handling in a Node.js/Express application.
- Notes / Decisions: Implemented bcrypt password hashing, HTTP-only session cookies, and server-side session validation. Ensured that user identity and role are reloaded from the database on every authenticated request rather than trusting browser-supplied values.

## Entry 3: Role-Based Access Control
- AI Tool Used: Perplexity
- Prompt: Asked how to enforce document ownership and shared permissions (Read/Edit) with immediate revocation in a multi-role application.
- Notes / Decisions: Implemented server-side permission checks for every document operation. Owners can manage their own documents, admins have override access, and viewers can only access documents shared with them. Revocation deletes the access record so it takes effect immediately.
=======
- AI Tool Used:Gemini

-Prompt: Asked for project roadmap, tech stack selection, and repository visibility rules according to challenge guidelines.

-Notes / Decisions: Kept the repository private during active development to protect work per hackathon instructions, and plan to switch it to public right before the final deadline.

## Entry 2: Authentication and Session Handling
- **AI Tool Used:** Perplexity
- **Prompt:** Asked how to implement secure login, logout, password hashing, and session handling in a Node.js/Express application.
- **Notes / Decisions:** Implemented bcrypt password hashing, HTTP-only session cookies, and server-side session validation. Ensured that user identity and role are reloaded from the database on every authenticated request rather than trusting browser-supplied values.

## Entry 3: Role-Based Access Control
- **AI Tool Used:** Perplexity
- **Prompt:** Asked how to enforce document ownership and shared permissions (Read/Edit) with immediate revocation in a multi-role application.
- **Notes / Decisions:** Implemented server-side permission checks for every document operation. Owners can manage their own documents, admins have override access, and viewers can only access documents shared with them. Revocation deletes the access record so it takes effect immediately.
>>>>>>> e8a9992 (Update TrustVault dashboard and backend)

## Entry 4: Audit Logging
- **AI Tool Used:** Perplexity
- **Prompt:** Asked what fields an append-only audit log should contain for document views, downloads, edits, shares, revocations, and denied authorization attempts.
- **Notes / Decisions:** Implemented audit logging with user, email, action, document, timestamp, success/failure status, and JSON details. Both successful and denied operations are recorded.

## Entry 5: Supabase Storage Upload Issue
- **AI Tool Used:** Perplexity
- **Prompt:** Reported that document upload failed after configuring Supabase Storage and asked what could be wrong.
- **Notes / Decisions:** Identified a bucket/storage configuration issue. Corrected the bucket configuration and verified successful upload through audit logs.

## Entry 6: Delete Permission Debugging
- **AI Tool Used:** Perplexity
- **Prompt:** Reported that the document list showed the logged-in uploader as owner, but deletion still failed with “Only the owner or an administrator can delete this document.”
- **Notes / Decisions:** Reviewed audit logs and found that the failed delete attempts were made by a Viewer account, not the document owner. Confirmed that the server-side permission logic was correct: only the owner or an administrator can delete a document. Retained the owner/admin-only delete rule and verified that denied attempts were recorded in audit logs.

## Entry 7: Audit Log Analysis
- **AI Tool Used:** Perplexity
- **Prompt:** Shared audit log entries and asked the AI to interpret the permission behavior.
- **Notes / Decisions:** Confirmed that a Viewer with edit permission could edit but not delete or share, while an Admin could delete. This validated that the permission rules were working as intended.

## Entry 8: Render Deployment
- **AI Tool Used:** Perplexity
- **Prompt:** Asked how to deploy a Node.js/Express application with Supabase to Render.
- **Notes / Decisions:** Prepared environment variables (`NODE_ENV`, `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`), build command (`npm install`), start command (`npm start`), and deployment checklist.

## Entry 9: Documentation Simplification
- **AI Tool Used:** Perplexity
- **Prompt:** Asked whether the API endpoints section in README could be removed or simplified.
- **Notes / Decisions:** Retained a concise API overview to satisfy the “Include API documentation” requirement while keeping the README clean and readable.
