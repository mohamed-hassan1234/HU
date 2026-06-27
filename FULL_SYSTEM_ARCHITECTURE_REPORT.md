# Full System Architecture Report - CTES / HUCEMS

Inspection date: 2026-06-26
Workspace: `C:\Users\hp\Desktop\system HU`

This report documents the authored project source, configuration, runtime logs, assets, generated build output, package lockfiles, and installed dependency folders. Vendor folders (`node_modules`) and generated Vite output (`frontend/dist`) are included in the structure discussion but are not expanded file-by-file as application logic because they are generated third-party artifacts. All application-owned files were inspected.

## 1. Project Overview

### What is this system?

This system is a web-based Course and Teaching Evaluation System for Hormuud University. The backend package is named `hucems-backend`; the frontend package is named `hucems-frontend`; the visible product label in the UI is CTES, "Course and Teaching Evaluation System."

The application allows:

- Students to log in, view assigned courses, complete course/lecturer evaluations, submit ratings, comments, recommendation status, attendance rate, and anonymity preference.
- Lecturers to log in, view their assigned course evaluation analytics, inspect submitted student feedback, add class comments, and submit teacher-side class evaluation reports.
- Admin, department head, and dean users to view university-wide dashboards, manage master data, import/export CSV records, review evaluation submissions, view analytics, and inspect class evaluation reports.

### What problem does it solve?

The project solves the institutional feedback problem around course quality, lecturer performance, class participation, attendance, course completion, and academic quality monitoring. It centralizes evaluation collection and reporting instead of relying on paper forms or disconnected spreadsheets.

### Main objectives

- Maintain core academic master data: students, lecturers, courses, course assignments, evaluation questions.
- Create student and lecturer login accounts tied to institutional IDs.
- Collect one student evaluation per assigned course per student.
- Protect anonymous student feedback while still supporting non-anonymous submissions.
- Aggregate course, lecturer, faculty, department, semester, participation, and class performance analytics.
- Support CSV import/export for operational data loading.
- Provide role-specific dashboards for admins, students, and lecturers.
- Track administrative and system actions in activity logs.

### Users

- Guest: unauthenticated visitor who can only access the login page.
- Student: evaluates assigned courses and manages password/profile.
- Lecturer: views feedback on assigned courses, submits class reports, adds class comments.
- Admin: manages all core records and analytics.
- Department Head: authorized by backend/frontend for admin-style reporting and analytics, but no separate tailored UI.
- Dean: authorized by backend/frontend for admin-style reporting and analytics, but no separate tailored UI.
- System/background process: seeding, logging, CSV cleanup, Mongoose indexing.

### Technologies used

- React 18 with Vite for frontend.
- React Router v7 for routing.
- Tailwind CSS with custom Hormuud University color theme.
- Axios for API communication.
- SweetAlert2 for toast and delete confirmation.
- Recharts for analytics charts.
- TanStack React Table for evaluation table pagination.
- Framer Motion for evaluation wizard and class report micro-interactions.
- Lucide React for icons.
- Express 4 for backend HTTP API.
- MongoDB with Mongoose 8 for persistence.
- JWT for stateless authentication.
- bcryptjs for password hashing.
- multer and csv-parser for CSV uploads.
- morgan for request logging.
- dotenv for environment configuration.
- Node.js built-in test/assert modules for CSV tests.

### Overall architecture

The system is a classic client/server MERN-style architecture:

```text
Browser
  -> React SPA served by Vite/build output
  -> Axios client with Bearer token
  -> Express API under /api/*
  -> Route modules with embedded business logic
  -> Mongoose models
  -> MongoDB database
  -> JSON/CSV response
  -> React state updates and charts/tables/forms
```

There is no separate controller/service/repository layer. Route files perform validation, persistence, aggregation, CSV handling orchestration, and response shaping. This keeps the code compact but concentrates responsibilities in route modules.

## 2. Tech Stack

### Frontend

- `react`, `react-dom`: SPA UI.
- `vite`: dev server and production build tool.
- `@vitejs/plugin-react`: React transform and Fast Refresh.
- `react-router-dom`: browser routing, nested protected routes, role-based route groups.
- `axios`: HTTP client configured in `frontend/src/api/axios.js`.
- `tailwindcss`, `postcss`, `autoprefixer`: styling pipeline.
- `lucide-react`: icon components across navigation, buttons, stats, forms.
- `recharts`: `BarChart`, `AreaChart`, `PieChart`, `LineChart`, responsive analytics.
- `@tanstack/react-table`: table model and pagination for evaluation management.
- `sweetalert2`: toast notifications and delete confirmation dialogs.
- `framer-motion`: animated student evaluation wizard and lecturer class report list.

### Backend

- `express`: HTTP API server.
- `mongoose`: schemas, indexes, CRUD, aggregate-like in-memory shaping.
- `dotenv`: environment variables.
- `cors`: controlled CORS policy for local and production client origins.
- `morgan`: request logs.
- `jsonwebtoken`: JWT signing/verification.
- `bcryptjs`: password hashing and comparison.
- `multer`: multipart file upload storage for CSV files.
- `csv-parser`: CSV import parsing.
- Node `fs`, `path`: upload directory, file cleanup, test temp files.

### Database

MongoDB database, default local URI:

```text
mongodb://127.0.0.1:27017/hucems_db
```

Production requires `MONGO_URI`; otherwise `backend/config/db.js` throws.

### Authentication

JWT Bearer token stored in `localStorage` as `hucems_token`. Passwords are stored hashed in `User` documents. `protect` middleware validates token and reloads active user from MongoDB. `authorize` checks role membership.

### Hosting

The code indicates:

- Frontend dev: `http://localhost:5173`.
- Backend dev: `http://localhost:5020/api`.
- Production frontend/API origin: `https://www.ctes.hu.edu.so` and `https://ctes.hu.edu.so`.
- Frontend production API default: `https://www.ctes.hu.edu.so/api`.
- `CLIENT_URL` can add comma-separated CORS origins.

### Real-time services

No WebSocket, Socket.IO, Server-Sent Events, stream subscriptions, or polling loop exists. The app uses request/response fetches and manual refresh buttons. Logs show browser/HTTP cache `304` behavior, but no realtime channel.

### Charts

Recharts powers dashboard, analytics, class ranking, participation, trend, leaderboard, and heatmap-like visualizations.

### State management

State is local React state plus one context:

- `AuthContext`: global authenticated user/profile/loading/login/logout.
- Page-level `useState`, `useMemo`, `useEffect`.
- Browser `localStorage` token persistence.
- No Redux, Zustand, React Query, SWR, or persistent client cache.

### Styling

Tailwind CSS utility classes with shared custom component classes in `frontend/src/index.css`: `.input`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.panel`, `.glass-panel`, `.brand-gradient`.

### Build tools

Frontend: Vite. Backend: Node directly; `nodemon` for dev. Package lockfiles exist for both apps.

### API communication

`frontend/src/api/axios.js` creates a single Axios instance with:

- `baseURL`: dev `http://localhost:5020/api`, production `https://www.ctes.hu.edu.so/api`, override `VITE_API_URL`.
- `timeout`: 15000 ms.
- Request interceptor adds `Authorization: Bearer <token>` if `hucems_token` exists.

## 3. Project Structure

```text
system HU/
  backend/
    config/
    middleware/
    models/
    routes/
    tests/
    utils/
    node_modules/
    package.json
    package-lock.json
    seed.js
    server.js
    dev.log
    dev.err.log
    runtime.log
    runtime.err.log
  frontend/
    src/
      api/
      components/
      context/
      layouts/
      pages/
        admin/
        auth/
        lecturer/
        student/
      utils/
    dist/
    node_modules/
    package.json
    package-lock.json
    index.html
    vite.config.js
    tailwind.config.js
    postcss.config.js
    hor.png
    image.png
    dev.log
    dev.err.log
    runtime.log
    runtime.err.log
```

### Backend folders

- `backend/config/`: database connection. `db.js` chooses `MONGO_URI`, local fallback in non-production, connects Mongoose, logs host/database.
- `backend/middleware/`: authentication/authorization and CSV upload middleware.
- `backend/models/`: all MongoDB/Mongoose collections.
- `backend/routes/`: Express route modules. These contain endpoint handlers and much of the business logic.
- `backend/utils/`: CSV helpers and activity logging helper.
- `backend/tests/`: CSV utility tests, one `node:test` file and one script runner.
- `backend/node_modules/`: installed third-party backend dependencies.
- `backend/uploads/`: created at runtime by upload middleware if CSV uploads occur; not present in the current inventory unless generated.

### Backend important files

- `server.js`: Express app startup, CORS, JSON parsing, routes, global errors, Mongo connect/listen.
- `seed.js`: resets and seeds users, students, lecturers, courses, assignments, questions, and activity log.
- `package.json`: backend dependencies and scripts.
- `package-lock.json`: locked dependency graph.
- `dev.log`, `runtime.log`: previous server startup/request logs.
- `dev.err.log`: contains an `EADDRINUSE` crash on port 5000 from an earlier run.
- `runtime.err.log`: contains a MongoDB authentication failure from an earlier run.

### Frontend folders

- `frontend/src/api/`: Axios API client.
- `frontend/src/components/`: reusable UI components: protected route, page header, stat card, resource CRUD page, empty state.
- `frontend/src/context/`: authentication context.
- `frontend/src/layouts/`: authenticated app shell/sidebar/header/footer.
- `frontend/src/pages/auth/`: login page.
- `frontend/src/pages/admin/`: admin dashboards, CRUD, reporting, analytics, imports, class evaluations.
- `frontend/src/pages/student/`: student dashboard, course list, evaluation wizard, submitted evaluations, shared profile.
- `frontend/src/pages/lecturer/`: lecturer dashboard, summary, reports, class evaluation form.
- `frontend/src/utils/`: SweetAlert helpers.
- `frontend/dist/`: generated production build output.
- `frontend/node_modules/`: installed third-party frontend dependencies.

### Frontend important files

- `src/main.jsx`: React root mount.
- `src/App.jsx`: all lazy routes and role-protected route groups.
- `src/index.css`: Tailwind imports and reusable class definitions.
- `src/hormuud logo.png`: logo used in login, layout, profile.
- `hor.png`: campus/hero image used by login page.
- `image.png`: static asset in project root; not referenced by inspected source.
- `index.html`: root HTML with `#root`.
- `vite.config.js`: Vite React config and dev port 5173.
- `tailwind.config.js`: theme colors and shadows.
- `postcss.config.js`: Tailwind and Autoprefixer config.
- `package.json`, `package-lock.json`: dependency manifest and lockfile.
- frontend logs: Vite startup/HMR logs; no frontend error logs currently contain errors.

## 4. System Modules

### Authentication Module

- Purpose: login, restore session, password change, route protection.
- Backend files: `routes/authRoutes.js`, `middleware/auth.js`, `models/User.js`.
- Frontend files: `context/AuthContext.jsx`, `components/ProtectedRoute.jsx`, `pages/auth/LoginPage.jsx`, `pages/student/ProfilePage.jsx`.
- APIs: `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/change-password`.
- Database: `users`, plus role-specific profile lookup in `students` or `lecturers`.

### Student Management Module

- Purpose: admin CRUD/import/export of students and student account sync.
- Backend files: `routes/studentRoutes.js`, `models/Student.js`, `models/User.js`.
- Frontend files: `pages/admin/AdminStudentsPage.jsx`, `pages/admin/resourceConfigs.js`.
- APIs: `/api/students`, `/api/students/classes`, `/api/students/import-csv`, `/api/students/export-csv`.
- Database: `students`, `users`, indirectly `courseassignments` and `evaluations`.

### Lecturer Management Module

- Purpose: lecturer CRUD/import/export, lecturer account sync, lecturer dashboard summary/comments.
- Backend files: `routes/lecturerRoutes.js`, `models/Lecturer.js`, `models/User.js`, `models/TeacherComment.js`.
- Frontend files: `ResourcePage`, `resourceConfigs`, lecturer pages.
- APIs: `/api/lecturers`, `/api/lecturers/me/summary`, `/api/lecturers/me/comments`.
- Database: `lecturers`, `users`, `evaluations`, `courseassignments`, `teachercomments`, `students`.

### Course Catalog Module

- Purpose: maintain course list.
- Backend: `routes/courseRoutes.js`, `models/Course.js`.
- Frontend: `ResourcePage`, `coursesConfig`.
- APIs: `/api/courses`, import/export.
- Database: `courses`.

### Course Assignment Module

- Purpose: connect course, lecturer, class, semester, academic year; define evaluation eligibility.
- Backend: `routes/assignmentRoutes.js`, `models/CourseAssignment.js`.
- Frontend: `pages/admin/AdminAssignmentsPage.jsx`.
- APIs: `/api/assignments`, `/api/assignments/:id/participation`, import/export.
- Database: `courseassignments`, validation against `courses`, `lecturers`, `students`, participation from `evaluations`.

### Evaluation Question Module

- Purpose: manage reusable question bank.
- Backend: `routes/questionRoutes.js`, `models/EvaluationQuestion.js`.
- Frontend: `ResourcePage`, `questionsConfig`, `EvaluationFormPage`.
- APIs: `/api/questions`, import/export.
- Database: `evaluationquestions`.

### Student Evaluation Module

- Purpose: collect and report student ratings/comments about courses and lecturers.
- Backend: `routes/evaluationRoutes.js`, `routes/studentPortalRoutes.js`, `models/Evaluation.js`.
- Frontend: student evaluation wizard, admin evaluations/reports/analytics, lecturer dashboards.
- APIs: `/api/evaluations`, `/api/student/submit-evaluation`, `/api/student/evaluated-courses`, `/api/evaluations/reports`, `/api/evaluations/analytics`, `/api/evaluations/export-csv`.
- Database: `evaluations`, with course assignment and student fields denormalized.

### Lecturer Class Evaluation Module

- Purpose: lecturer-side class reports covering performance, attendance, syllabus completion, top students, notes.
- Backend: `routes/classEvaluationRoutes.js`, `models/ClassEvaluation.js`.
- Frontend: `pages/lecturer/ClassEvaluationPage.jsx`, `pages/admin/ClassEvaluationsPage.jsx`.
- APIs: `/api/class-evaluations/options`, `/api/class-evaluations/mine`, `POST /api/class-evaluations`, `/api/class-evaluations/admin`.
- Database: `classevaluations`, `courseassignments`, `students`, `lecturers`.

### Analytics and Dashboard Module

- Purpose: aggregate university, faculty, department, lecturer, course, semester, participation, heatmap, warnings.
- Backend: `getAnalyticsData` in `routes/evaluationRoutes.js`, `routes/dashboardRoutes.js`.
- Frontend: `AdminDashboard`, `ReportsPage`, `AnalyticsPage`, `LecturerDashboard`, `LecturerSummaryPage`, `LecturerReportsPage`.
- APIs: `/api/dashboard/admin`, `/api/evaluations/reports`, `/api/evaluations/analytics`, `/api/lecturers/me/summary`.
- Database: `evaluations`, `students`, `lecturers`, `courses`, `courseassignments`, `activitylogs`, `teachercomments`.

### CSV Module

- Purpose: import/export students, lecturers, courses, assignments, questions, evaluations.
- Backend: `middleware/upload.js`, `utils/csv.js`, route import/export handlers.
- Frontend: `ResourcePage`, `AdminStudentsPage`, `AdminAssignmentsPage`, `ImportPage`.
- APIs: all `import-csv` and `export-csv` endpoints.
- Database: resource-specific collections.

### Activity Logging Module

- Purpose: store audit-ish records for create/update/delete/import/submit/password actions.
- Backend: `utils/logActivity.js`, `models/ActivityLog.js`, `routes/activityRoutes.js`, dashboard activity fetch.
- Frontend: admin dashboard notifications; no dedicated activity page in route tree.
- APIs: `GET /api/activity`, activity included in `GET /api/dashboard/admin`.
- Database: `activitylogs`.

## 5. User Roles

### Guest

- Purpose: unauthenticated visitor.
- Permissions: access `/login`; submit login form.
- Restrictions: all protected routes redirect to login.
- Workflow: open site, see login, enter username/password.
- Accessible APIs: `POST /api/auth/login`; backend root `/`.

### Student

- Purpose: evaluate assigned courses.
- Permissions: view own profile/courses/submitted evaluations; submit one evaluation per assignment; change password.
- Restrictions: cannot manage master data; cannot view other student submissions through `/evaluations/student/:studentId`; cannot access admin/lecturer route groups.
- Workflow: login -> dashboard -> my courses -> evaluation wizard -> submitted evaluations -> profile/logout.
- Accessible pages: `/student`, `/student/courses`, `/student/evaluate/:courseCode`, `/student/evaluations`, `/student/profile`.
- Accessible APIs: `/api/student/my-courses`, `/api/student/evaluated-courses`, `/api/student/submit-evaluation`, `/api/questions`, `/api/auth/me`, `/api/auth/change-password`, `/api/evaluations/student/:ownStudentId`.

### Lecturer

- Purpose: view assigned feedback, add class comments, submit class performance reports.
- Permissions: view own assignments through assignment endpoint, own evaluation summaries, own student feedback, own class evaluation options/reports, own class comments; change password.
- Restrictions: cannot create students/courses/assignments/questions; cannot access student routes; cannot see unrelated lecturers' data where route scoping exists.
- Workflow: login -> lecturer dashboard -> summary/reports -> class evaluation -> comments/profile/logout.
- Accessible pages: `/lecturer`, `/lecturer/summary`, `/lecturer/class-evaluation`, `/lecturer/reports`, `/lecturer/profile`.
- Accessible APIs: `/api/lecturers/me/summary`, `/api/lecturers/me/comments`, `/api/assignments` scoped to self, `/api/evaluations` scoped to self, `/api/evaluations/reports` scoped to self, `/api/evaluations/analytics` scoped to self, `/api/class-evaluations/options`, `/api/class-evaluations/mine`, `POST /api/class-evaluations`, auth endpoints.

### Admin

- Purpose: system operator and master-data manager.
- Permissions: CRUD/import/export students, lecturers, courses, assignments, questions; view evaluations, dashboards, reports, analytics, activity, class evaluations; submit evaluation on behalf of a student via generic evaluation route if `studentId` is provided.
- Restrictions: no frontend UI for user account CRUD beyond auto-created student/lecturer accounts; no role management UI; no hard delete protection for referenced records.
- Workflow: login -> dashboard -> manage records/import -> inspect evaluations/reports/analytics/class evaluations -> profile/logout.
- Accessible pages: all `/admin/*` pages.
- Accessible APIs: most `/api/*` admin-protected endpoints except student-only and lecturer-only endpoints.

### Department Head

- Purpose: management/reporting role.
- Permissions in code: dashboard, lecturers list, courses list, assignments list, participation, evaluations, reports, analytics, class evaluation admin.
- Restrictions: cannot perform admin-only CRUD/import/export; frontend gives admin-style route shell but some sidebar links lead to endpoints that may 403.
- Workflow: login redirects to `/admin/reports`; can navigate admin layout but not all operations are authorized.
- Accessible pages: protected admin route group.
- Accessible APIs: read/report endpoints that include `department_head`.

### Dean

- Purpose: higher-level reporting role.
- Permissions in code: similar to department head; login home `/admin/analytics`.
- Restrictions: no separate dean-specific UI; not authorized for admin-only writes/imports/exports.
- Workflow: login -> analytics/reports/dashboard.
- Accessible pages: protected admin route group.
- Accessible APIs: read/report endpoints that include `dean`.

### System/background

- Purpose: seeding, DB connection, activity logging fallback, CSV cleanup.
- Permissions: code-level operations through scripts/helpers.
- Restrictions: not an HTTP user.
- Workflow: `npm run seed`, server startup, `logActivity` fallback actor `system`.

## 6. Complete User Flow

### Opening website

The browser loads `frontend/index.html`, then `src/main.jsx` mounts `App` into `#root`. `App` wraps routes in `AuthProvider`, `BrowserRouter`, and `Suspense`.

### Loading app

`AuthProvider` checks `localStorage.getItem('hucems_token')`. If a token exists, it calls `GET /auth/me`. While loading, `ProtectedRoute` displays "Loading CTES..." for protected pages. If token is absent or invalid, user is redirected to `/login`.

### Authentication

User submits login form in `LoginPage`. `AuthContext.login` posts `{ loginId, password }` to `/auth/login`. Backend finds active `User`, compares bcrypt password, signs JWT, resolves profile from `Student` or `Lecturer`, and returns `{ token, user, profile }`. Frontend stores token in `localStorage`, updates context, shows toast, and navigates to role home.

### Dashboard

Admin dashboard calls `/dashboard/admin`. Student dashboard calls `/student/my-courses`. Lecturer dashboard calls `/lecturers/me/summary`. Each dashboard renders role-specific metrics and tables/charts.

### Analysis

Admin reports/analytics pages call `/evaluations/reports` and `/evaluations/analytics`. Lecturer dashboard and summary call `/lecturers/me/summary`. Class evaluations admin calls `/class-evaluations/admin`.

### Trading

There is no trading domain in this repository. No market data, orders, execution, SL/TP, portfolio, risk per trade, broker integration, or streaming price service exists. The equivalent operational workflow is education evaluation collection and quality analytics.

### Saving

Forms save through Axios POST/PUT/DELETE. Admin CRUD modals save to resource endpoints. Student evaluation saves to `/student/submit-evaluation`. Lecturer class report saves to `/class-evaluations`. Password change saves to `/auth/change-password`.

### Notifications

User-visible notifications are SweetAlert2 toasts. Admin dashboard notification panel displays activity logs and low-course warning rows. There are no push notifications, email notifications, or realtime notifications.

### Logout

`AppLayout` logout button calls `AuthContext.logout`, removes `hucems_token`, clears user/profile, and navigates to `/login`.

## 7. Page Analysis

### `LoginPage.jsx`

- Purpose: public login page with university branding.
- Inputs: username/login ID, password, show/hide password.
- Outputs: role-based redirect and toast.
- Buttons: show password, sign in.
- Data sources/APIs: `POST /auth/login`.
- Components/hooks: `useAuth`, `useNavigate`, local `useState`, logo and `hor.png`.
- Business logic: redirects authenticated users to `roleHome`; handles loading and error toast.

### `AdminDashboard.jsx`

- Purpose: university-wide operational analytics.
- Inputs: filters for semester, faculty, department, class, lecturer, course, academic year, date range.
- Outputs: stat cards, charts, participation table, rankings, activity/warnings.
- Buttons: refresh analytics, apply filters.
- API: `GET /dashboard/admin`.
- Components: `PageHeader`, `StatCard`, Recharts panels.
- Business logic: manually sends filters; chart rendering from backend analytics.

### `AdminStudentsPage.jsx`

- Purpose: custom student management grouped by class.
- Inputs: search, class filter, student modal fields, CSV file.
- Outputs: grouped student tables, class filter dropdown, CSV download.
- Buttons: filter classes, import, export, add, edit, delete, save.
- APIs: `GET /students`, `GET /students/classes`, `POST /students`, `PUT /students/:id`, `DELETE /students/:id`, import/export.
- Business logic: omits blank password during edit; default student password on create; reloads classes after load.

### `AdminAssignmentsPage.jsx`

- Purpose: assign courses to classes/lecturers and inspect participation.
- Inputs: filters, assignment modal fields, CSV file.
- Outputs: assignments table, participation modal with eligible/submitted/pending students.
- APIs: `GET /assignments`, `GET /courses`, `GET /lecturers`, `GET /students/classes`, `GET /assignments/:id/participation`, CRUD/import/export.
- Business logic: form only submits assignment ID, course code, lecturer ID, class, semester, year, status; backend hydrates names and validates.

### Generic resource pages: `LecturersPage`, `CoursesPage`, `QuestionsPage`

- Purpose: CRUD/import/export through `ResourcePage`.
- Inputs: search, generated modal fields, CSV file.
- Outputs: table and modal.
- APIs: configured endpoint and CSV routes.
- Business logic: field definitions come from `resourceConfigs.js`.

### `EvaluationsPage.jsx`

- Purpose: admin evaluation management table and detail drawer.
- Inputs: filters and date range.
- Outputs: paginated TanStack table, CSV export, drawer with responses/comments.
- APIs: `GET /evaluations`, `GET /evaluations/export-csv`.
- Business logic: hides student name if backend marks anonymous.

### `ReportsPage.jsx`

- Purpose: filtered summary report.
- Inputs: faculty, department, course, lecturer, class, semester, academic year.
- Outputs: stat cards and rankings.
- APIs: `GET /evaluations/reports`, `GET /evaluations/export-csv`.

### `AnalyticsPage.jsx`

- Purpose: chart-focused analytics view.
- Inputs: none in UI.
- Outputs: lecturer/course/department/participation/semester/heatmap visualizations.
- API: `GET /evaluations/analytics`.

### `ImportPage.jsx`

- Purpose: central CSV upload page.
- Inputs: CSV files for students, lecturers, courses, assignments, questions.
- Outputs: success/error toasts.
- APIs: five import endpoints.
- Business logic: displays required header formats.

### `ClassEvaluationsPage.jsx`

- Purpose: admin review of lecturer class reports.
- Inputs: filters for faculty, department, class, lecturer, semester, academic year.
- Outputs: class rankings, best university class, faculty winners, submissions list, report drawer.
- API: `GET /class-evaluations/admin`.

### `StudentDashboard.jsx`

- Purpose: student overview.
- Inputs: none.
- Outputs: assigned/evaluated/pending/course cards and course list.
- API: `GET /student/my-courses`.

### `MyCoursesPage.jsx`

- Purpose: full assigned-course table.
- Inputs: none.
- Outputs: course status and evaluate links.
- API: `GET /student/my-courses`.

### `EvaluationFormPage.jsx`

- Purpose: student evaluation wizard.
- Inputs: course selection, question ratings, overall ratings, recommendation, attendance, comments, anonymous checkbox.
- Outputs: evaluation submission, completion animation, redirect.
- APIs: `GET /student/my-courses`, `GET /questions?activeOnly=true`, `POST /student/submit-evaluation`.
- Business logic: filters question categories to four allowed core categories; requires each rating before next; prevents evaluating an already evaluated course by redirect.

### `SubmittedEvaluationsPage.jsx`

- Purpose: list student's submitted evaluations.
- Inputs: none.
- Outputs: submitted course cards with course/lecturer ratings.
- API: `GET /student/evaluated-courses`.

### `ProfilePage.jsx`

- Purpose: shared role profile and password update.
- Inputs: current password, new password, confirmation.
- Outputs: official profile details and password strength UI.
- API: `PUT /auth/change-password`.
- Business logic: frontend requires length, upper/lowercase, number, symbol, confirmation match; backend repeats checks and returns new token.

### `LecturerDashboard.jsx`

- Purpose: lecturer analytics and feedback workspace.
- Inputs: selected class, class comment category/comment.
- Outputs: metrics, rankings, course performance, insights, submitted evaluations, class analysis, top students, saved comments.
- APIs: `GET /lecturers/me/summary`, `POST /lecturers/me/comments`.
- Business logic: comments only allowed for assigned classes; backend enforces.

### `LecturerSummaryPage.jsx`

- Purpose: compact evaluation summary.
- Inputs: none.
- Outputs: stat cards and reusable course table.
- API: `GET /lecturers/me/summary`.

### `LecturerReportsPage.jsx`

- Purpose: course-level report summary for lecturer.
- Inputs: none.
- Outputs: course satisfaction and department comparison panels.
- API: `GET /evaluations/reports`; backend scopes lecturer automatically.

### `ClassEvaluationPage.jsx`

- Purpose: lecturer self-report of assigned class/course.
- Inputs: assignment, performance, participation, attendance, course status/completion, top students, notes.
- Outputs: submitted/updated class evaluation and saved reports list.
- APIs: `GET /class-evaluations/options`, `GET /class-evaluations/mine`, `POST /class-evaluations`.
- Business logic: existing report pre-fills form; top student duplicates disabled in UI and validated in backend; one report per assignment/lecturer upsert.

## 8. Component Analysis

### `ProtectedRoute.jsx`

- Purpose: role-gated nested routes.
- Props: `roles`.
- State: none; reads `useAuth`.
- Lifecycle: renders loading, redirect, or `<Outlet>`.
- Dependencies: `react-router-dom`, `AuthContext`.
- Reusable: yes, used for admin/student/lecturer route groups.

### `AppLayout.jsx`

- Purpose: authenticated shell with sidebar, header, footer, mobile menu.
- Props: none.
- State: mobile sidebar `open`.
- Dependencies: `NavLink`, `Outlet`, `useAuth`, `lucide-react`, logo.
- Reusable: role-aware layout for all protected pages.
- Business logic: chooses nav links by role; department head/dean fall through to admin links.

### `ResourcePage.jsx`

- Purpose: reusable CRUD/import/export table page.
- Props: `title`, `subtitle`, `endpoint`, `fields`, `columns`, `csvEndpoint`.
- State: rows, search, loading, editing, form, modal state.
- Lifecycle: loads once on mount; reloads after save/delete/import.
- Dependencies: Axios, SweetAlert helpers, `EmptyState`, `PageHeader`.
- Reusable: yes for lecturer/course/question resources.
- Caveat: `useEffect` ignores `search` dependency intentionally; search only applies on button/Enter.

### `PageHeader.jsx`

- Purpose: page title, breadcrumb home link, action area.
- Props: `title`, `subtitle`, `actions`.
- State: none.
- Dependencies: `useLocation`, `Link`, icons.
- Reusable: used across pages.

### `StatCard.jsx`

- Purpose: small metric card with optional icon/accent.
- Props: `title`, `value`, `icon`, `accent`.
- State: none.
- Reusable: dashboards and reports.

### `EmptyState.jsx`

- Purpose: empty table/list placeholder.
- Props: `title`.
- State: none.
- Reusable: resource and list pages.

### Local page components

Many pages define local presentational components:

- `AdminDashboard`: `ParticipationChart`, `AssignmentParticipation`, `ChartPanel`, `Ranking`, `Notifications`.
- `EvaluationsPage`: `EvaluationDrawer`, `Info`.
- `ReportsPage`: `Ranking`.
- `AnalyticsPage`: `ChartPanel`.
- `ClassEvaluationsPage`: `ReportDrawer`, `WinnerMetric`, `Detail`, `Note`.
- `EvaluationFormPage`: `WizardHeader`, `SliderRating`, `Overall`, `Select`, `Comment`, `Badge`, `CompletionScreen`.
- `ProfilePage`: `ProfileDetail`, `PasswordField`.
- `LecturerDashboard`: `CoursePerformance`, `TeacherEvaluations`, `CourseTable`, `CommentList`, `Insights`, `ClassAnalysis`, `Metric`, `TopStudents`.
- `ClassEvaluationPage`: `Segment`, `RangeField`, `TextField`, `Info`, `SummaryRow`.

These are not exported except `CourseTable`, which is reused by `LecturerSummaryPage`.

## 9. Backend Analysis

### Server startup

`server.js` loads env, creates Express app, enables proxy trust, configures CORS, body parsers, morgan, root health response, route mounts, 404 handler, error handler, then connects MongoDB and listens on `process.env.PORT || 5020`.

### Routes

Routes are mounted as:

- `/api/auth`
- `/api/students`
- `/api/lecturers`
- `/api/courses`
- `/api/assignments`
- `/api/questions`
- `/api/evaluations`
- `/api/student`
- `/api/dashboard`
- `/api/activity`
- `/api/class-evaluations`

### Controllers/services

There are no separate controller or service folders. Route modules act as controllers and services. Reusable helpers exist for CSV parsing/export and activity logging.

### Validation

Validation is split:

- Mongoose schema validation for required fields/enums/ranges/unique indexes.
- Route-level manual validation for login, password rules, assignment uniqueness/class existence, student/lecturer comment scopes, class report top students.
- Frontend required fields and simple password rules.

### Middleware

- `protect`: verifies JWT, loads active user.
- `authorize`: role whitelist check.
- `upload.single('file')`: CSV upload to `backend/uploads`.
- Express JSON/urlencoded parsing.
- CORS and morgan.

### Authentication and authorization

JWT verifies request identity. `authorize` checks `req.user.role`. Routes often scope data further for lecturers and students.

### Error handling

Global handler returns duplicate-friendly messages and duplicate assignment special case. Several routes also catch and return errors locally. Async route handlers mostly rely on Express 4 behavior, but because many do not wrap in `try/catch`, unexpected rejected promises can bypass standard handling unless caught by Express wrapper behavior is manually present; Express 4 does not automatically catch async rejections in all cases.

## 10. API Analysis

### Auth

| Method | URL | Auth | Request | Response | Purpose | Used by |
|---|---|---|---|---|---|---|
| GET | `/` | none | none | `{ name, status }` | API health | manual |
| POST | `/api/auth/login` | none | `{ loginId, password }` | `{ token, user, profile }` | login | `LoginPage` |
| GET | `/api/auth/me` | any active user | Bearer token | `{ user, profile }` | restore session | `AuthContext` |
| PUT | `/api/auth/change-password` | any active user | `{ currentPassword, newPassword, confirmPassword }` | `{ message, token }` | password update | `ProfilePage` |

### Students

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/students/classes` | admin | unique class list |
| GET | `/api/students` | admin | paginated/search/filter students |
| POST | `/api/students` | admin | create student and user |
| PUT | `/api/students/:id` | admin | update student and user |
| DELETE | `/api/students/:id` | admin | delete student and user |
| POST | `/api/students/import-csv` | admin | import students |
| GET | `/api/students/export-csv` | admin | export students |
| GET | `/api/students/me/courses` | student | duplicate student course endpoint; not used by frontend |

Student request fields: `studentId/student_id`, `fullName/full_name`, `faculty`, `department`, `className/class_name`, `password`, `status`. Response includes student documents or pagination object.

### Student portal

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/student/my-courses` | student | assigned courses plus evaluated status |
| GET | `/api/student/evaluated-courses` | student | own submitted evaluations |
| POST | `/api/student/submit-evaluation` | student | submit evaluation |

Evaluation request includes `assignmentId` or `courseCode`, responses, overall ratings, recommendation, attendance, comments, anonymous flag.

### Lecturers

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/lecturers` | admin/department_head/dean | list/search lecturers |
| POST | `/api/lecturers` | admin | create lecturer and user |
| PUT | `/api/lecturers/:id` | admin | update lecturer and user |
| DELETE | `/api/lecturers/:id` | admin | delete lecturer and user |
| POST | `/api/lecturers/import-csv` | admin | import lecturers |
| GET | `/api/lecturers/export-csv` | admin | export lecturers |
| GET | `/api/lecturers/me/comments` | lecturer | own saved comments, optional class filter |
| POST | `/api/lecturers/me/comments` | lecturer | create class comment |
| GET | `/api/lecturers/me/summary` | lecturer | aggregate dashboard summary |

### Courses

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/courses` | admin/department_head/dean | list/search courses |
| POST | `/api/courses` | admin | create course |
| PUT | `/api/courses/:id` | admin | update course |
| DELETE | `/api/courses/:id` | admin | delete course |
| POST | `/api/courses/import-csv` | admin | import courses |
| GET | `/api/courses/export-csv` | admin | export courses |

### Assignments

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/assignments` | admin/department_head/dean/lecturer | list assignments; lecturer scoped |
| GET | `/api/assignments/:id/participation` | admin/department_head/dean | roster participation detail |
| POST | `/api/assignments` | admin | create assignment |
| PUT | `/api/assignments/:id` | admin | update assignment |
| DELETE | `/api/assignments/:id` | admin | delete assignment |
| POST | `/api/assignments/import-csv` | admin | import assignments |
| GET | `/api/assignments/export-csv` | admin | export assignments |

Assignment creation validates selected course exists, selected lecturer exists, active students exist for class, and course/class/semester/year combination is unique.

### Questions

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/questions` | any active user | list questions, optional activeOnly/category/search |
| POST | `/api/questions` | admin | create question |
| PUT | `/api/questions/:id` | admin | update question |
| DELETE | `/api/questions/:id` | admin | delete question |
| POST | `/api/questions/import-csv` | admin | import questions |
| GET | `/api/questions/export-csv` | admin | export questions |

### Evaluations

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/evaluations` | admin/department_head/dean/lecturer | list submitted evaluations; lecturer scoped |
| POST | `/api/evaluations` | admin/student | create evaluation |
| GET | `/api/evaluations/student/:studentId` | protected | get student evaluations; student limited to own ID |
| GET | `/api/evaluations/reports` | admin/department_head/dean/lecturer | report summary; lecturer scoped |
| GET | `/api/evaluations/analytics` | admin/department_head/dean/lecturer | chart analytics; lecturer scoped |
| GET | `/api/evaluations/export-csv` | admin/department_head/dean/lecturer | export filtered evaluations; lecturer scoped |

### Dashboard and activity

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/dashboard/admin` | admin/department_head/dean | analytics plus last 10 activities |
| GET | `/api/activity` | admin | last 100 activity logs |

### Class evaluations

| Method | URL | Auth | Purpose |
|---|---|---|---|
| GET | `/api/class-evaluations/options` | lecturer | assignments with active students for form |
| GET | `/api/class-evaluations/mine` | lecturer | own class evaluation reports |
| POST | `/api/class-evaluations` | lecturer | upsert class evaluation report |
| GET | `/api/class-evaluations/admin` | admin/department_head/dean | all reports, class rankings, faculty winners |

## 11. Database Analysis

### `users`

Fields:

- `loginId`: unique string, required.
- `password`: hashed string, required.
- `role`: enum `admin`, `student`, `lecturer`, `department_head`, `dean`.
- `status`: enum `active`, `inactive`.
- timestamps.

Usage: authentication and authorization. Password hashing occurs in pre-save hook. `findById(...).select('-password')` prevents password leak in `protect`.

### `students`

Fields:

- `studentId`: unique required string.
- `fullName`, `faculty`, `department`, `className`: required strings.
- `password`: hidden field, not used for login by auth; account password is in `users`.
- `status`: active/inactive.
- timestamps.

Usage: eligibility, profile, class roster, analytics filters, assignment validation.

### `lecturers`

Fields:

- `lecturerId`: unique required string.
- `fullName`: required.
- `password`: hidden field; separate from `users`.
- `status`: active/inactive.
- timestamps.

Usage: lecturer profiles, assignment validation, rankings, account creation.

### `courses`

Fields:

- `courseCode`: unique required string.
- `courseName`: required.
- `creditHours`: number, default 3.
- `status`: active/inactive.
- timestamps.

Usage: catalog and assignment hydration.

### `courseassignments`

Fields:

- `assignmentId`: unique required string.
- `courseCode`, `courseName`, `className`, `semester`, `academicYear`, `lecturerId`, `lecturerName`.
- `status`: active/inactive.
- timestamps.

Indexes:

- Unique compound: `{ courseCode, className, semester, academicYear }`.

Usage: evaluation eligibility, lecturer assigned courses/classes, participation denominator.

### `evaluationquestions`

Fields:

- `questionId`: unique required string.
- `questionText`, `category`.
- `inputType`: enum `likert`, `star`, `radio`, `textarea`.
- `options`: string array.
- `order`: number.
- `status`: active/inactive.
- timestamps.

Usage: student evaluation wizard.

### `evaluations`

Fields:

- `assignment`: ObjectId ref `CourseAssignment`.
- `assignmentId`, `studentId`, `courseCode`, `courseName`, `lecturerId`, `lecturerName`, `faculty`, `department`, `className`, `semester`, `academicYear`.
- `responses`: array of `{ questionId, questionText, category, answer, rating }`.
- `courseOverallRating`: 1-5.
- `lecturerOverallRating`: 1-5.
- `recommendation`: `Yes`, `Maybe`, `No`.
- `attendanceRate`: `75-100%`, `50-74%`, `Less than 50%`.
- `comments`: `valuable`, `improve`, `missing`, `other`.
- `sentiment`: `positive`, `neutral`, `negative`.
- `anonymous`: boolean default true.
- `submittedAt`: Date.
- timestamps.

Indexes:

- Unique `{ studentId, assignment }`.
- Unique `{ studentId, courseCode, semester, academicYear }`.

Usage: core evaluation records and analytics source.

### `classevaluations`

Fields:

- `assignment`: ObjectId ref `CourseAssignment`.
- assignment/course/lecturer/class/faculty/department/semester/year denormalized fields.
- `classPerformance`: `excellent`, `good`, `average`, `poor`.
- `courseStatus`: `completed`, `in_progress`, `remaining`.
- `courseCompletion`: 0-100.
- `attendanceQuality`: quality enum.
- `attendancePercent`: 0-100.
- `participationQuality`: quality enum.
- `topStudents`: up to three `{ position, studentId, studentName }`.
- `strengths`, `improvements`, `announcement`.
- `overallScore`: 0-5.
- `submittedAt`.
- timestamps.

Indexes:

- Unique `{ assignment, lecturerId }`.

Usage: lecturer class reports and admin class rankings.

### `teachercomments`

Fields:

- `lecturerId`: required indexed.
- `lecturerName`.
- `className`: required indexed.
- `comment`: required.
- `category`: enum `attendance`, `participation`, `coverage`, `assignments`, `practical`, `general`.
- timestamps.

Usage: lecturer dashboard comments.

### `activitylogs`

Fields:

- `actorLoginId`, `actorRole`, `action`, `entity`, `entityId`, `details`.
- timestamps.

Usage: admin dashboard notifications and audit trail.

## 12. Authentication

### Login

`POST /api/auth/login` requires `loginId` and `password`. Backend checks active `User`, compares bcrypt password, signs JWT with `{ id, role, loginId }`, and returns safe user plus profile.

### Logout

Client-only. `AuthContext.logout` removes `hucems_token` from `localStorage`; backend does not blacklist JWTs.

### JWT

Signed by `jsonwebtoken` with `JWT_SECRET || 'hucems_dev_secret'`; expiry `JWT_EXPIRES_IN || '7d'`.

### Sessions

No server-side sessions. Stateless JWT only.

### Refresh tokens

No refresh token exists. Password change returns a new access token. Expired tokens require login.

### Protected routes

Frontend `ProtectedRoute` gates route groups. Backend `protect` and `authorize` enforce real security.

### Permissions

Permissions are role whitelist-based at route level, with some data scoping for students and lecturers.

## 13. State Management

- React local state controls forms, filters, modals, drawers, loading states, selected rows, charts.
- `AuthContext` stores `user`, `profile`, `loading`, `login`, `logout`.
- Token state persists in `localStorage`.
- Axios request interceptor synchronizes current token into each request.
- No centralized server-state caching; pages manually load and reload.
- No optimistic updates; writes reload data afterward.
- No websocket synchronization.

## 14. Real-Time Features

No realtime features are implemented. There are no WebSocket, Socket.IO, EventSource, background polling intervals, live subscriptions, or reconnect logic. "Live" dashboards are manual-refresh dashboards.

## 15. Business Logic

### Evaluation eligibility

Student course eligibility comes from active course assignments matching the student's `className`. Evaluation creation finds assignment by `assignmentId` or `courseCode` and current student's class.

### Duplicate prevention

`Evaluation` prevents duplicate student submissions through unique indexes and explicit `findOne({ studentId, assignment })`. `CourseAssignment` prevents duplicate course/class/semester/year assignments.

### Evaluation scoring

Student question responses are stored as answer and numeric rating. Overall course and lecturer ratings are stored separately and used for analytics. Backend does not validate every question was answered; frontend enforces wizard step completion.

### Sentiment inference

`inferSentiment` checks comment text for simple positive/negative keyword hits and average of course/lecturer scores. Average >= 4 or more positive hits -> positive; average < 3 or more negative hits -> negative; otherwise neutral.

### Participation calculation

Assignment participation counts active students in assignment class as eligible and evaluations for that assignment as submitted. Rates are `submitted / eligible * 100`.

### Analytics calculation

`getAnalyticsData` builds filters, loads evaluations/students/lecturers/courses/assignments, computes totals, averages, leaderboard arrays, course satisfaction, department/faculty comparison, semester trends, participation chart, low courses, warnings, and heatmap rows.

### Lecturer ranking

Lecturer ranking averages `lecturerOverallRating` per lecturer, includes active lecturers with no evaluations at zero, sorts by average then total evaluations.

### Lecturer summary

`/lecturers/me/summary` aggregates assigned classes/courses, rankings, course comments, non-anonymous top student stats, class summaries, evaluation details, and insights.

### Class evaluation overall score

`calculateOverall` uses:

```text
classPerformance score * 0.4
+ courseCompletion/20 * 0.3
+ attendancePercent/20 * 0.3
```

Quality score mapping: excellent 5, good 4, average 3, poor 2.

### CSV rules

Headers are lowercased and BOM-trimmed. Arrays export as pipe-separated values. CSV responses include UTF-8 BOM. Uploaded CSV files are deleted after parse success/error.

## 16. Trading Workflow

No trading workflow exists. The project does not contain trading, market data, order execution, stop loss, take profit, risk management, live prices, or broker APIs.

The closest domain workflow is:

```text
CourseAssignment defines eligibility
  -> Student sees course
  -> Student answers questions and submits evaluation
  -> Evaluation is persisted and de-duplicated
  -> Analytics/report endpoints aggregate results
  -> Admin/lecturer dashboards display insights
  -> Lecturer submits class evaluation
  -> Admin reviews class rankings
```

## 17. Frontend to Backend Communication

Every frontend request uses the shared Axios instance. Authorization is automatic via interceptor.

Common request flows:

- Login: `LoginPage` -> `AuthContext.login` -> `POST /auth/login`.
- Session restore: `AuthProvider.useEffect` -> `GET /auth/me`.
- Student courses: student pages -> `GET /student/my-courses`.
- Student submit: `EvaluationFormPage` -> `POST /student/submit-evaluation`.
- Admin dashboard: `AdminDashboard` -> `GET /dashboard/admin`.
- Admin CRUD: resource pages -> corresponding GET/POST/PUT/DELETE.
- CSV import: `FormData(file)` -> `POST */import-csv`.
- CSV export: `GET */export-csv` with `responseType: 'blob'`, browser creates object URL and clicks anchor.
- Lecturer dashboard: `GET /lecturers/me/summary`, `POST /lecturers/me/comments`.
- Class reports: lecturer form -> class evaluation endpoints; admin page -> `/class-evaluations/admin`.

Caching is browser/HTTP cache only as indicated by `304` logs. No application cache invalidation strategy exists.

## 18. Security

### Present controls

- JWT Bearer authentication.
- bcrypt password hashing.
- Active/inactive account enforcement.
- Role-based authorization middleware.
- CORS allowlist.
- JSON body limit of 2 MB.
- CSV file type filter by MIME or `.csv` extension.
- Mongoose schema validation and unique indexes.
- Password complexity enforced on password change.
- Anonymous evaluation handling in reports/lecturer views.

### Security risks

- Fallback JWT secret `hucems_dev_secret` is unsafe if production env is misconfigured.
- JWT stored in `localStorage` is vulnerable to XSS token theft.
- No rate limiting on login or API endpoints.
- No CSRF protection is needed for Bearer token in header but XSS remains high impact.
- No input sanitization against NoSQL/operator injection for all fields; regex search uses raw input.
- CSV upload does not limit file size explicitly.
- Uploaded filenames include original filename; safer normalization would reduce path/name issues, although multer destination controls directory.
- No Helmet/security headers.
- No account lockout, MFA, refresh token rotation, password reset workflow, or audit detail for failed logins.
- Hard deletes can orphan existing evaluations/assignments because referential integrity is not enforced.
- Admin route group exposes department_head/dean to UI operations that may fail with 403, creating confusing access surface.
- `ActivityLog` is audit-like but not tamper-proof and not comprehensive.

## 19. Performance

### Existing optimizations

- Frontend lazy routes reduce initial bundle.
- Vite production build code splitting is active.
- Recharts `ResponsiveContainer` used.
- MongoDB unique indexes on key duplicate-sensitive records.
- Basic pagination exists for list endpoints.
- Dashboards fetch aggregated data in single endpoint calls.

### Performance concerns

- Analytics loads many collections and aggregates in application memory instead of MongoDB aggregation pipelines.
- `GET /evaluations` returns all matching evaluations without pagination.
- `ResourcePage` requests limit 100; student page requests limit 1000.
- Regex search is unindexed and can scan collections.
- `hor.png` is about 2.2 MB in production build output.
- No React Query/cache deduplication; repeated navigation refetches.
- Many dashboard charts render large arrays directly if data grows.
- No indexes on common analytics filters such as faculty, department, className, lecturerId, semester, academicYear in `Evaluation`.

## 20. File Dependency Map

### Backend dependency tree

```text
server.js
  -> config/db.js
  -> routes/authRoutes.js
       -> models/User, Student, Lecturer, CourseAssignment
       -> middleware/auth
       -> utils/logActivity
  -> routes/studentRoutes.js
       -> models/Student, User, Evaluation, CourseAssignment
       -> middleware/auth, upload
       -> utils/csv, logActivity
  -> routes/lecturerRoutes.js
       -> models/Lecturer, User, Evaluation, Student, CourseAssignment, TeacherComment
       -> middleware/auth, upload
       -> utils/csv, logActivity
  -> routes/courseRoutes.js
       -> models/Course
       -> middleware/auth, upload
       -> utils/csv, logActivity
  -> routes/assignmentRoutes.js
       -> models/CourseAssignment, Course, Lecturer, Student, Evaluation
       -> middleware/auth, upload
       -> utils/csv, logActivity
  -> routes/questionRoutes.js
       -> models/EvaluationQuestion
       -> middleware/auth, upload
       -> utils/csv, logActivity
  -> routes/evaluationRoutes.js
       -> models/Evaluation, EvaluationQuestion, CourseAssignment, Student, Lecturer, Course
       -> middleware/auth
       -> utils/csv, logActivity
  -> routes/studentPortalRoutes.js
       -> models/Evaluation, Student, CourseAssignment
       -> middleware/auth
       -> createEvaluation from evaluationRoutes
  -> routes/dashboardRoutes.js
       -> models/ActivityLog
       -> getAnalyticsData from evaluationRoutes
  -> routes/activityRoutes.js
       -> models/ActivityLog
       -> middleware/auth
  -> routes/classEvaluationRoutes.js
       -> models/ClassEvaluation, CourseAssignment, Lecturer, Student
       -> middleware/auth
       -> utils/logActivity
```

### Frontend dependency tree

```text
main.jsx
  -> App.jsx
     -> AuthProvider
     -> BrowserRouter/Routes
     -> ProtectedRoute
     -> AppLayout
     -> lazy pages

api/axios.js
  -> used by AuthContext, ResourcePage, all data pages

AuthContext.jsx
  -> api/axios
  -> localStorage

AppLayout.jsx
  -> AuthContext
  -> logo
  -> role-specific nav arrays
  -> Outlet renders current page

ResourcePage.jsx
  -> api/axios
  -> alerts.js
  -> PageHeader, EmptyState
  -> resourceConfigs via ResourceScreens

Pages
  -> PageHeader, StatCard, EmptyState as needed
  -> api/axios for HTTP
  -> Recharts/TanStack/Framer/Lucide where needed
```

## 21. Complete Execution Flow

### Login button

```text
LoginPage.submit
  -> AuthContext.login(loginId, password)
  -> api.post('/auth/login')
  -> axios interceptor attaches token only if existing
  -> server.js route /api/auth
  -> authRoutes POST /login
  -> User.findOne({ loginId })
  -> user.comparePassword(password)
  -> signToken(user)
  -> getProfile(user)
      student: Student.findOne
      lecturer: Lecturer.findOne + CourseAssignment.find + Student.find
  -> response { token, user, profile }
  -> AuthContext stores token/user/profile
  -> LoginPage toast
  -> navigate(roleHome[role])
  -> ProtectedRoute allows route
  -> AppLayout renders role shell
```

### Student clicks "Submit Evaluation"

```text
EvaluationFormPage.submit
  -> api.post('/student/submit-evaluation', payload)
  -> axios adds Bearer token
  -> server.js /api/student
  -> studentPortalRoutes router.use(protect, authorize('student'))
  -> createEvaluation from evaluationRoutes
  -> Student.findOne({ studentId: req.user.loginId })
  -> CourseAssignment.findOne({ assignmentId/courseCode, className, active })
  -> Evaluation.findOne({ studentId, assignment })
  -> inferSentiment(req.body)
  -> Evaluation.create(denormalized payload)
  -> logActivity(submit, evaluation)
  -> response 201 evaluation
  -> frontend sets completed
  -> toast success
  -> timeout navigate('/student/evaluations')
  -> SubmittedEvaluationsPage loads /student/evaluated-courses
```

### Admin clicks "Add Assignment" save

```text
AdminAssignmentsPage.save
  -> api.post('/assignments', form)
  -> assignmentRoutes POST /
  -> hydrateAssignment(toAssignment(req.body))
      Course.findOne(courseCode)
      Lecturer.findOne(lecturerId)
  -> ensureStudentsExistForAssignment(className)
  -> ensureUniqueAssignment(courseCode, className, semester, academicYear)
  -> CourseAssignment.create(payload)
  -> logActivity(create, assignment)
  -> response 201
  -> toast success
  -> reload assignments
```

### Lecturer submits class evaluation

```text
ClassEvaluationPage.submit
  -> api.post('/class-evaluations', form)
  -> classEvaluationRoutes POST /
  -> CourseAssignment.findOne({ _id, lecturerId: req.user.loginId, active })
  -> Student.find({ className, active })
  -> validate top student count, uniqueness, class membership
  -> Lecturer.findOne({ lecturerId })
  -> build payload with denormalized assignment/student faculty/department
  -> calculateOverall(payload)
  -> ClassEvaluation.findOneAndUpdate({ assignment, lecturerId }, payload, upsert)
  -> logActivity(submit, class_evaluation)
  -> response 201
  -> frontend toast and reload options/reports
```

### Admin applies dashboard filters

```text
AdminDashboard.load
  -> api.get('/dashboard/admin', { params: filters })
  -> dashboardRoutes GET /admin
  -> getAnalyticsData(req.query)
      buildFilter
      Evaluation.find(filter)
      Student.find(studentFilter)
      Lecturer.find(active)
      Course.find(active)
      CourseAssignment.find(assignmentFilter)
      compute totals/rankings/charts/warnings
  -> ActivityLog.find().sort().limit(10)
  -> response analytics + activity
  -> frontend renders StatCard/Recharts/tables
```

## 22. System Diagram

### High-level

```text
[User Browser]
  |
  | loads
  v
[React/Vite SPA]
  |
  | Axios JSON / multipart / blob
  v
[Express API /api/*]
  |
  | protect + authorize
  v
[Route Modules with Business Logic]
  |
  | Mongoose models
  v
[MongoDB hucems_db]
  |
  | documents
  v
[Route response JSON/CSV]
  |
  v
[React state -> tables/charts/forms]
```

### Domain data connections

```text
User(loginId, role)
  -> Student(studentId = loginId)
  -> Lecturer(lecturerId = loginId)

Student(className)
  -> CourseAssignment(className)
  -> Evaluation(studentId, assignment)

Course
  -> CourseAssignment(courseCode/courseName)
  -> Evaluation(courseCode/courseName)

Lecturer
  -> CourseAssignment(lecturerId/lecturerName)
  -> Evaluation(lecturerId/lecturerName)
  -> TeacherComment
  -> ClassEvaluation

EvaluationQuestion
  -> Evaluation.responses[]

ActivityLog
  <- CRUD/import/submit/password actions
```

## 23. Project Strengths

- Clear domain model for academic evaluations.
- Role-based routing and backend authorization are present.
- Student/lecturer accounts are synchronized from master records.
- CSV import/export is implemented across major master data.
- Student duplicate evaluations are blocked by code and indexes.
- Assignment duplicate prevention is handled by compound index and route validation.
- Dashboards provide useful analytics without extra setup.
- Frontend route lazy-loading is already in place.
- Shared `ResourcePage` reduces CRUD duplication.
- Password change has strong complexity checks.
- CORS allowlist is configured for local and production domains.
- CSV utility has focused tests and passed verification.
- Production frontend build passed.

## 24. Project Weaknesses

- Business logic is concentrated in route files, especially `evaluationRoutes.js` and `lecturerRoutes.js`.
- No controller/service/repository layering.
- No API schema validation library such as Joi/Zod/Yup/express-validator.
- No comprehensive backend test coverage beyond CSV.
- No frontend tests.
- No database migration/versioning strategy.
- Analytics are calculated in application memory.
- No rate limiting or Helmet.
- No refresh token/session revocation.
- Department head/dean roles are only partially productized.
- User management for admin/department/dean is missing.
- Hard deletes can orphan denormalized or referenced records.
- No real-time updates despite dashboard-style UI.

## 25. Bugs and Potential Bugs

- `backend/dev.err.log` shows an earlier `EADDRINUSE` crash on port 5000; current code defaults to 5020, but environment `PORT=5000` can still collide.
- `backend/runtime.err.log` shows a MongoDB authentication failure from an earlier run; production/local env credentials need verification.
- `department_head` and `dean` can access admin frontend route group but many sidebar operations call admin-only endpoints and will fail.
- `Student` schema has no `semester` or `academicYear`, but `seed.js` includes those fields; strict Mongoose default ignores them. `ProfilePage` references `profile?.semester`, which will usually be unavailable.
- `Lecturer` route hashes `Lecturer.password` manually while `User.password` is separately hashed by hook; duplicated password fields can drift.
- `ResourcePage` question `options` edit form receives arrays but input expects string; submitting an edited question with unchanged array works because backend accepts arrays, but the input display may show array coercion.
- `EvaluationFormPage` only includes four allowed categories and excludes seeded overall questions `F1-F4`; overall fields are handled separately, but admin-created questions outside allowed categories will not appear to students.
- Backend `createEvaluation` casts overall ratings with `Number(...)`; missing values can become `NaN` and rely on Mongoose behavior rather than explicit route validation.
- Express 4 async route errors are not uniformly wrapped in `try/catch`; unexpected promise rejections may not consistently reach the error handler.
- `GET /api/evaluations/reports` counts assignments using `faculty` and `department` filters even `CourseAssignment` schema has no such fields, so participation denominator can be inaccurate for those filters.
- `GET /api/evaluations` is unpaginated and can grow large.
- CSV uploads lack explicit file size limit.
- `frontend/hor.png` is large and increases build size.
- `image.png` appears unused.
- Browser cache 304 behavior appears in logs; without cache-control strategy, stale dashboard responses may confuse users after writes.

## 26. Enterprise-Level Improvements

- Introduce layered backend architecture: routes -> controllers -> services -> repositories.
- Add request validation with Zod/Joi and shared DTO definitions.
- Add MongoDB aggregation pipelines for analytics and indexed filter fields.
- Add rate limiting, Helmet, stricter CORS/env checks, and login throttling.
- Require `JWT_SECRET` in production and remove insecure fallback outside development.
- Consider httpOnly secure cookies or short-lived access token plus refresh token rotation.
- Add admin user/role management UI.
- Productize department head/dean with read-only navigation and scoped filters.
- Add soft deletes/status changes instead of hard deletes for referenced academic data.
- Add referential integrity checks before deleting courses, lecturers, students, and assignments.
- Add pagination to evaluation/admin analytics endpoints.
- Add audit log coverage for failed logins, exports, and sensitive reads.
- Add backend tests for auth, permissions, CRUD, evaluation submission, duplicate prevention, class evaluations.
- Add frontend tests for route guards, forms, and key workflows.
- Add OpenAPI documentation.
- Add centralized error boundary and Axios response interceptor for auth expiry.
- Optimize images and enforce asset budgets.
- Add Docker/dev compose for MongoDB plus backend/frontend.
- Add CI pipeline: lint, test, build, dependency audit.
- Add observability: structured logs, request IDs, metrics, error tracking.

## 27. Clean Architecture Score

| Category | Score | Reason |
|---|---:|---|
| Architecture | 68/100 | Clear client/server/domain boundaries, but route files mix controller/service/repository concerns. |
| Code Quality | 72/100 | Readable and pragmatic; duplication and long route/page files reduce clarity. |
| Maintainability | 65/100 | Good naming and structure, but business logic needs extraction and tests. |
| Scalability | 58/100 | Fine for small/medium data; in-memory analytics and unpaginated endpoints will strain growth. |
| Security | 60/100 | JWT/RBAC/bcrypt/CORS exist; rate limiting, headers, token strategy, validation hardening are missing. |
| Performance | 64/100 | Lazy frontend routes and basic pagination exist; analytics/image/query optimization needed. |
| Documentation | 45/100 | No existing system docs/API docs found before this report. |
| Testing | 30/100 | CSV utility tests only; core workflows untested. |
| Overall | 63/100 | A functional institutional evaluation platform with solid foundations, needing enterprise hardening and layering. |

## 28. Final System Summary for a New Senior Developer

This repository is a React/Express/MongoDB evaluation platform. The frontend is a Vite SPA under `frontend/`, and the backend is an Express API under `backend/`. The product lets Hormuud University collect course and teaching feedback from students, show analytics to administrators, and let lecturers inspect their feedback and submit class-performance reports.

Start with `frontend/src/App.jsx`: it defines three protected route groups. Admin-like users (`admin`, `department_head`, `dean`) use `/admin/*`; students use `/student/*`; lecturers use `/lecturer/*`. `AuthProvider` in `context/AuthContext.jsx` owns login/session state. It restores sessions by calling `/auth/me` when a token exists in `localStorage`. `api/axios.js` attaches the token to every API request.

The main UI shell is `AppLayout.jsx`. It picks sidebar links based on role, renders a sticky header with profile identity, and exposes logout. Most pages are ordinary React function components with local state. Admin master data screens are either generic `ResourcePage` screens configured by `resourceConfigs.js` or custom pages where the workflow needs richer behavior, such as students grouped by class and course assignments with participation modals.

On the backend, `server.js` is the root. It configures CORS, JSON parsing, request logging, route mounting, and global errors, then connects to MongoDB through `config/db.js`. Auth is handled by `routes/authRoutes.js` and `middleware/auth.js`. The `User` model stores login credentials and roles; `Student` and `Lecturer` store institutional profiles. A user's `loginId` matches `studentId` or `lecturerId` for role-specific profiles.

The central academic record is `CourseAssignment`. It links a course, lecturer, class, semester, and academic year. Students become eligible to evaluate a course when their `Student.className` matches an active assignment. The student portal calls `/student/my-courses`, gets those assignments plus evaluated status, and submits through `/student/submit-evaluation`. That endpoint reuses `createEvaluation` from `evaluationRoutes.js`, verifies the student and assignment, blocks duplicate submissions, denormalizes assignment/student data into an `Evaluation`, calculates simple sentiment, logs activity, and returns the saved document.

Admin reporting depends heavily on `getAnalyticsData` in `evaluationRoutes.js`. That function loads evaluations, active students, lecturers, courses, and assignments, then builds totals, rankings, course satisfaction, department/faculty comparisons, semester trends, participation charts, leaderboards, low-course warnings, and heatmap rows. `dashboardRoutes.js` wraps that analytics payload with recent activity logs for the admin dashboard.

Lecturer dashboards use `/lecturers/me/summary`, which is another large aggregation endpoint. It scopes to the logged-in lecturer, builds assigned class/course lists, ranks the lecturer across the university/faculty, summarizes courses and comments, computes top students from non-anonymous evaluations, builds class summaries, returns detailed evaluations with anonymous protection, and creates human-readable insights.

The second evaluation stream is lecturer class evaluation. `ClassEvaluationPage.jsx` loads lecturer assignment options and previous reports. The lecturer selects an assignment, rates class performance/attendance/participation, records course progress, chooses up to three top students, and submits notes. `classEvaluationRoutes.js` validates assignment ownership, validates top student membership, calculates an overall score, and upserts one report per assignment/lecturer. Admins review these through `ClassEvaluationsPage.jsx` using `/class-evaluations/admin`, which returns raw reports, class rankings, faculty winners, and totals.

CSV handling is reusable. `middleware/upload.js` stores CSV uploads in `backend/uploads`; `utils/csv.js` parses lowercased/BOM-normalized headers, deletes temporary files, escapes CSV exports, adds a UTF-8 BOM, and converts pipe-delimited options. Students, lecturers, courses, assignments, and questions all have import/export endpoints. The CSV test runner passed and verifies BOM, escaping, multiline text, arrays, header normalization, parsing, and cleanup.

The project works and builds, but the next senior-level work should focus on extracting business logic out of routes, adding validation and tests, hardening security, fixing role/UI mismatches, improving analytics performance, documenting APIs, and replacing hard deletes with safer lifecycle/status behavior.

## Verification Performed

- `node --check backend\server.js`: passed.
- `node --check backend\routes\evaluationRoutes.js`: passed.
- `node --check backend\routes\lecturerRoutes.js`: passed.
- `node --check backend\routes\classEvaluationRoutes.js`: passed.
- `npm run test:csv` in `backend`: passed after running outside the Windows sandbox runner.
- `npm run build` in `frontend`: passed; production build generated `frontend/dist`.
