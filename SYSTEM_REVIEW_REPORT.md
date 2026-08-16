# CTES / HUCEMS System Review

Review date: 2026-08-15

## Implementation progress

Completed after the review:

- Anonymous evaluation identity protection across list, export, participation, and student-history paths.
- Department-level registration scoping across accounts, reads, writes, imports, exports, and reporting.
- Login throttling, Helmet security headers, production JWT/CLIENT_URL validation, and failed-login auditing.
- Forced password changes for generated/reset credentials and JWT invalidation after password changes.
- Production-safe error messages and automatic Express async rejection propagation.
- Production-disabled, explicitly confirmed destructive seeding.
- Privacy, scoping, configuration, and error-response regression tests.

Still scheduled for later phases: comprehensive request schemas, transactions, dependency-safe XLSX replacement, aggregation performance, broader API/E2E coverage, repository cleanup, and CI/monitoring.

## Executive summary

CTES is a working React/Express/MongoDB course and teaching evaluation system. It supports five roles: admin, registration officer, dean, lecturer, and student. The main workflows—master-data management, course assignment, student evaluation, lecturer reporting, analytics, bulk import/export, and password changes—are present, and the frontend production build succeeds.

The system is suitable as a functional prototype, but it is not yet production-safe. The most urgent risks concern evaluation anonymity, role scoping, authentication hardening, destructive database seeding, inconsistent error handling, and the lack of end-to-end/API tests. These should be addressed before adding major features.

## How the system works

```text
Browser (React SPA on Vite)
  -> Axios sends a JWT Bearer token
  -> Express API under /api
  -> route modules perform authorization, validation, business logic, and reporting
  -> Mongoose reads/writes MongoDB
  -> JSON/CSV/XLSX/PDF results return to the browser
```

### Main workflows

1. A user logs in with a `loginId` and password. The backend verifies the bcrypt hash and returns a seven-day JWT.
2. React stores the JWT in `localStorage`, reloads the profile through `/api/auth/me`, and routes the user to a role-specific dashboard.
3. Admin users manage users, faculties, departments, classes, students, lecturers, courses, assignments, and questions.
4. Registration officers manage operational data within their configured scope and view reports.
5. Students see active assignments for their class or explicit student assignment, then submit one evaluation per assignment.
6. Lecturers see feedback and analytics limited by their lecturer ID and can submit a class evaluation.
7. Admin, registration, and dean users view participation, rankings, analytics, and reports.

### Architecture assessment

Strengths:

- Clear role-based route groups in the frontend and authorization middleware in the backend.
- Passwords are hashed with bcrypt and are excluded from normal API responses.
- Evaluation and assignment uniqueness indexes prevent common duplicate submissions.
- Master-data relationships include faculty, department, and class identifiers.
- Bulk-import validation supports CSV and XLSX with a 10,000-row ceiling for the newer workflow.
- Activity logging exists for important mutations.
- The application uses lazy-loaded pages and produces a successful production build.

Limitations:

- Large route files combine controllers, business rules, reporting, imports, and persistence.
- Validation is mostly handwritten and inconsistent.
- Multi-document changes do not use transactions.
- Analytics load full collections into application memory.
- There is no comprehensive automated test suite, linting, formatting, CI, or API contract documentation.

## Findings and priorities

### P0 — fix before production

#### 1. Anonymous evaluations expose student identifiers

`GET /api/evaluations` replaces `studentName` with `Anonymous`, but spreads the full evaluation first. The returned object still contains `studentId`. Participation and student-history endpoints also make re-identification possible for roles that can access detailed reporting.

Impact: the application's anonymity promise is not technically enforced and confidential feedback can be attributed to students.

Recommended update:

- Create role-aware response serializers that remove `studentId` and other identifying metadata from anonymous submissions.
- Separate confidential participation tracking from feedback/reporting responses.
- Define exactly which role, if any, may perform an audited identity reveal.
- Add privacy tests proving anonymous records cannot be re-identified through any reporting endpoint.

#### 2. Registration access scope contradicts the documented model

The implementation defines both `dean` and `registration` as faculty-scoped, while `DEPARTMENT_SCOPED_ROLES` is empty. User creation also clears the registration officer's department. Existing documentation says registration users are department-scoped.

Impact: a registration user may view or manage data across an entire faculty when operators expect department isolation.

Recommended update:

- Decide the intended policy: faculty registrar or department registrar.
- If department-level is intended, retain `departmentId`, add registration to department-scoped roles, and enforce scope consistently on list, get, mutation, import, export, analytics, and class-evaluation endpoints.
- Add cross-tenant denial tests for every scoped resource.

#### 3. Authentication is missing production protections

Login has no rate limiting, lockout, delay, or failed-attempt audit. JWT signing falls back to a known development secret, tokens last seven days, and there is no revocation/version mechanism. Default seeded and imported passwords are predictable.

Impact: password guessing, credential reuse, long-lived stolen sessions, and unsafe deployments with a default JWT secret.

Recommended update:

- Require a strong `JWT_SECRET` at startup in every deployed environment.
- Add login rate limiting and failed-login auditing.
- Require password change on first login/reset and remove predictable ID-based defaults.
- Add short-lived access tokens plus a revocation/password-version strategy, or use secure HTTP-only session cookies.
- Add security headers with Helmet and define a production CSP.

#### 4. The seed command deletes the entire application database

`npm run seed` runs `deleteMany({})` across the core collections before inserting demo records.

Impact: running the command against the wrong database destroys production or shared test data.

Recommended update:

- Refuse to seed when `NODE_ENV=production`.
- Require an explicit confirmation environment flag and verify the target database name.
- Split demo reset from idempotent bootstrap/admin creation.
- Never print production credentials to logs.

#### 5. Async error handling is inconsistent

The authentication routes use an async wrapper, but most Express 4 routes are plain `async` handlers. Rejected promises may bypass the error middleware. Some routes catch errors locally while others do not, and the global handler returns raw error messages.

Impact: hanging requests, unhandled rejections/process instability, and accidental internal-detail disclosure.

Recommended update:

- Apply one async-handler wrapper to every route.
- Introduce typed operational errors and a consistent response envelope.
- Log full errors server-side while returning safe production messages.
- Add 404, invalid ObjectId, validation, duplicate, database-down, and upload-error tests.

### P1 — high-value stabilization

#### 6. Request validation is incomplete

Ratings and response arrays are accepted directly from the client. Mongoose validates top-level rating ranges, but question membership, required responses, response types, comment lengths, pagination limits, dates, and many update fields are not consistently validated. Some update routes pass broad request bodies to Mongoose.

Recommended update: add centralized schemas (for example Zod, Joi, or express-validator), whitelist fields, cap text/array sizes, validate ObjectIds and dates, and normalize pagination with a safe maximum.

#### 7. Multi-document writes are not atomic

Creating/updating/deleting a student or lecturer separately modifies both a profile collection and `User`. Bulk imports perform sequential writes without transactions. Deleting master data does not consistently check dependent records.

Impact: partial failures create orphaned accounts, profiles, assignments, or references.

Recommended update: use MongoDB transactions for linked writes and imports; add dependency checks or explicit archival/cascade rules; provide a consistency-audit migration.

#### 8. Anonymous and personal data governance is undefined

Evaluation records retain identity indefinitely. Import-session JSON files contain personal data and sometimes plaintext initial passwords, with no expiry cleanup. Uploaded/session artifacts are present under the project tree.

Recommended update: define retention periods, automatically expire import sessions, keep uploads outside deployed source, encrypt/back up appropriately, remove password data immediately after account creation, and document audit access.

#### 9. Query performance will decline as data grows

Analytics and reports repeatedly load complete evaluation, student, lecturer, course, and assignment result sets and aggregate in Node.js. Several endpoints return all matching evaluations without pagination. Search terms are turned directly into regular expressions.

Recommended update: move aggregations to MongoDB pipelines, add pagination to detail endpoints, escape search expressions, cap query limits, profile indexes, and cache slow summary reports where appropriate.

#### 10. Automated coverage is inadequate

The repository has one runnable test command, covering CSV escaping/parsing and cleanup. There are no automated tests for login, authorization boundaries, anonymity, evaluation eligibility, duplicate prevention, imports, transactions, dashboards, or frontend behavior.

Recommended update: establish unit, API integration, and a small Playwright end-to-end suite. Authorization and anonymity tests should be written before refactoring.

#### 11. Frontend session and error behavior need hardening

The JWT is stored in `localStorage`, increasing the impact of any future XSS. Axios does not centrally handle 401/403 responses or normalize errors. Unknown routes always redirect to login, even for authenticated users. There is no application-level error boundary.

Recommended update: adopt the selected secure session strategy, add response interceptors, preserve intended routes, provide role-aware forbidden/not-found pages, and add route-level error boundaries.

#### 12. Reporting bundle is large

The production build succeeds, but the PDF chunk is about 1.48 MB minified (about 496 KB gzip), and Vite reports chunks above its 500 KB warning threshold.

Recommended update: load PDF generation only when requested, review React PDF imports, and define manual vendor chunks where measurement shows a user-facing gain.

### P2 — maintainability and operations

#### 13. Route modules are too large

Assignment, lecturer, and evaluation route files are roughly 28–33 KB each and contain multiple responsibilities.

Recommended update: separate routes, controllers, validation schemas, services, repositories/queries, serializers, and report builders incrementally.

#### 14. Repository hygiene needs improvement

Generated `dist`, runtime logs, upload sessions, and installed dependency artifacts are visible in the repository/worktree. The root `.gitignore` ignores only `backend/.env`.

Recommended update: ignore `node_modules`, `dist`, logs, uploads/import sessions, coverage, and all local environment files while retaining `.env.example`. Remove already tracked generated artifacts in a deliberate cleanup commit.

#### 15. Operational readiness is incomplete

There is no health/readiness distinction, graceful shutdown, structured logging, request correlation, monitoring, backup/restore documentation, CI workflow, deployment runbook, or OpenAPI specification.

Recommended update: add `/health/live` and `/health/ready`, graceful MongoDB/server shutdown, structured logs, dependency/security checks, CI build/test gates, database backup procedures, and an API contract.

#### 16. Accessibility and UX need systematic testing

The UI has many labels and keyboard-aware components, but no automated accessibility checks or tested usability paths for the five roles. Some errors are reduced to a generic “login failed,” which hid the CORS cause during local setup.

Recommended update: add accessible field associations and error announcements consistently, test keyboard/mobile behavior, show safe actionable network errors, and run axe checks on core flows.

## Verification performed

- Frontend production build: passed with a large-chunk warning.
- Backend CSV utility checks: passed.
- Live admin login against the local backend: passed.
- CORS preflight from `http://localhost:5175`: passed after adding the local origin.
- No full API, database integration, frontend unit, or end-to-end test command exists.

## Proposed implementation plan

### Phase 0 — policy decisions and safety net

1. Confirm whether registration users are faculty- or department-scoped.
2. Confirm the anonymity policy and whether identity reveal is ever permitted.
3. Add API integration-test infrastructure and fixtures without using the destructive seed.
4. Capture baseline behavior for each role.

Acceptance: documented access matrix; anonymity rules; isolated test database; critical-path tests run locally and in CI.

### Phase 1 — security and privacy

1. Fix anonymous response serialization and separate participation data.
2. Correct scope enforcement across every route.
3. Require secure production secrets and add rate limiting/security headers.
4. Replace predictable passwords with forced first-login reset.
5. Guard and split the seed workflow.

Acceptance: cross-scope requests return 403; anonymous APIs contain no student identifier; brute-force controls work; production refuses unsafe configuration; seed cannot target production.

### Phase 2 — correctness and data integrity

1. Add centralized validation and consistent async/error handling.
2. Add transactions for profile/account/import operations.
3. Define delete/archive and reference-integrity rules.
4. Add import-session expiry and personal-data cleanup.

Acceptance: malformed input returns consistent 400 responses; failed linked writes roll back; dependent records cannot become silently orphaned.

### Phase 3 — performance and frontend resilience

1. Move analytics to database aggregations and paginate detail endpoints.
2. Add query caps, escaped searches, and measured indexes.
3. Add centralized frontend API errors, forbidden/not-found screens, and error boundaries.
4. Optimize on-demand PDF loading.

Acceptance: defined dataset/load test meets agreed response targets; expired sessions recover cleanly; build has an intentional chunking budget.

### Phase 4 — maintainability and operations

1. Refactor the largest routes behind tests.
2. Add lint/format/type checking or migrate incrementally to TypeScript.
3. Clean generated artifacts and expand `.gitignore`.
4. Add CI, health/readiness, structured logs, monitoring, OpenAPI, backups, and deployment documentation.

Acceptance: every change passes lint, tests, and build in CI; deployment and recovery are documented and repeatable.

## Recommended implementation order

Start with the safety-net tests, anonymity, and access scope. Those changes protect real users and prevent the later refactor from preserving unsafe behavior. Follow with authentication/seed hardening, then validation/transactions, performance, frontend resilience, and architecture cleanup.
