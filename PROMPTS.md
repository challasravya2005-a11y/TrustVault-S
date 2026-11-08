# TrustVault – AI Prompts and Development Decisions

This file documents how AI tools were used during the development of TrustVault, the prompts used, and the technical decisions made after reviewing the suggestions.

## Entry 1: Project Setup and Repository Configuration

- **AI Tool Used:** Gemini
- **Prompt:** Asked for guidance on starting the TrustVault project, selecting a suitable technology stack, planning the development steps, and understanding the repository requirements mentioned in the challenge.
- **Notes / Decisions:** Selected Node.js, Express, HTML, CSS, JavaScript, and Supabase for the project. Planned the repository structure and followed the repository visibility instructions provided for the challenge.

## Entry 2: Authentication and Session Handling

- **AI Tool Used:** Perplexity
- **Prompt:** Asked how to implement login, logout, password hashing, and session management in a Node.js and Express application.
- **Notes / Decisions:** Used bcrypt for password hashing and HTTP-only session cookies. Authentication is checked on the server, and the application uses the authenticated user's identity and role rather than trusting values sent by the browser.

## Entry 3: Role-Based Access Control

- **AI Tool Used:** Perplexity
- **Prompt:** Asked how to implement Admin, Uploader, and Viewer roles and control document access based on ownership and shared Read/Edit permissions.
- **Notes / Decisions:** Implemented server-side permission checks for document operations. Owners can manage their own documents, Admins have administrative access, and Viewers can access documents shared with them according to their permissions. Revoking access removes the corresponding permission record.

## Entry 4: Audit Logging

- **AI Tool Used:** Perplexity
- **Prompt:** Asked what information should be stored in an audit log for document uploads, views, downloads, edits, sharing, revocation, and unauthorized attempts.
- **Notes / Decisions:** Implemented audit records containing user information, action, document details, timestamp, success or failure status, and additional details. Both successful and denied operations are recorded.

## Entry 5: Supabase Storage Upload Issue

- **AI Tool Used:** Perplexity
- **Prompt:** Explained that document uploads were failing after configuring Supabase Storage and asked for help identifying the configuration problem.
- **Notes / Decisions:** Investigated the storage bucket configuration, corrected the configuration, and checked the upload operation using the application's audit logs.

## Entry 6: Delete Permission Debugging

- **AI Tool Used:** Perplexity
- **Prompt:** Reported that document deletion was failing with the message "Only the owner or an administrator can delete this document" and asked how to investigate the issue.
- **Notes / Decisions:** Reviewed the audit logs and identified that the failed delete attempts were made by a Viewer account rather than the document owner. Confirmed that the server-side rule was working as intended. Kept deletion restricted to the owner and Admin.

## Entry 7: Audit Log Analysis

- **AI Tool Used:** Perplexity
- **Prompt:** Shared audit log entries and asked for help understanding why different users could perform certain document operations.
- **Notes / Decisions:** Reviewed the permission behavior. Confirmed that a Viewer with Edit permission could edit a document but could not delete or share it, while an Admin could perform administrative deletion.

## Entry 8: Render Deployment

- **AI Tool Used:** Perplexity
- **Prompt:** Asked how to deploy the Node.js and Express application connected to Supabase using Render.
- **Notes / Decisions:** Configured the deployment settings, including the build command, start command, and required environment variables such as NODE_ENV, SESSION_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.

## Entry 9: Documentation Updates

- **AI Tool Used:** Perplexity
- **Prompt:** Asked how to organize the README and whether the API endpoint information could be simplified.
- **Notes / Decisions:** Kept a short API overview in the README so that the main endpoints are documented without making the file unnecessarily long.

## Entry 10: Dashboard Sidebar and Role-Based Navigation

- **AI Tool Used:** ChatGPT
- **Prompt:** Asked to change the dashboard sidebar so that each user role sees only the menu options relevant to their permissions. Admin should see Dashboard, Documents, User Management, and Audit Logs. Uploader should see Dashboard, Upload Document, and Documents. Viewer should see Dashboard and Documents.
- **Notes / Decisions:** Updated the dashboard navigation based on the logged-in user's role. Kept the role-based menu visibility in the frontend while retaining server-side authorization for actual access control.

## Entry 11: Dashboard Button Styling

- **AI Tool Used:** ChatGPT
- **Prompt:** Reported that Search, Filter, Edit, and Share buttons were working, but their text labels were not clearly visible. Asked for a CSS fix without changing the existing application functionality or login page design.
- **Notes / Decisions:** Updated the dashboard button styling to improve text visibility, colors, spacing, and appearance. Preserved the existing purple dashboard theme and kept the login page design unchanged.

---

## General Development Note

AI tools were used to understand requirements, generate code, troubleshoot errors, and improve the application. The generated suggestions were reviewed and adjusted during development. Technical decisions were made according to the project requirements and the behavior observed while testing the application.
