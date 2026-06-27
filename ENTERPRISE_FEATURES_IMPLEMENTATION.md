# Enterprise University Management Features

Implemented on top of the existing CTES / HUCEMS architecture without removing existing evaluation functionality.

## New Backend Modules

- `Faculty`: university faculty master data.
- `Department`: belongs to one faculty.
- `Class`: belongs to one faculty, one department, one semester, and one academic year.
- Extended `User`: full name, email, `registration` role, faculty/department scope, permissions, last login.
- Extended `Student`, `Lecturer`, `Course`, `CourseAssignment`, `Evaluation`, and `ClassEvaluation` with `facultyId`, `departmentId`, and class IDs where relevant.

## New APIs

- `/api/users`: admin-only user management CRUD, activation, deactivation, password reset, import, export.
- `/api/faculties`: faculty CRUD for admin; scoped read for reporting roles.
- `/api/departments`: department CRUD for admin; scoped read for registration/dean/department head.
- `/api/classes`: class CRUD for admin; scoped read for registration/dean/department head/lecturer.
- `/api/dashboard/registration`: department-scoped dashboard for registration officers.

## New Frontend Pages

- Admin User Management: `/admin/users`
- Faculty Management: `/admin/faculties`
- Department Management: `/admin/departments`
- Class Management: `/admin/classes`
- Registration Dashboard: `/registration`

Registration officer routes reuse existing student, lecturer, assignment, question, report, and analytics screens, with backend data isolation applied.

## Role Behavior

### Admin

Admin keeps global access and can manage users, faculties, departments, classes, students, lecturers, assignments, questions, reports, and analytics.

### Registration Officer

Role key: `registration`

Registration officers are assigned to one faculty and one department. Backend queries automatically scope student, lecturer, assignment, evaluation, report, analytics, class evaluation, and dashboard data by `departmentId`.

Allowed:

- Register/edit/delete students in own department.
- Register/edit/delete lecturers in own department.
- Create/edit/delete course assignments in own department.
- Manage evaluation questions.
- View own department reports and analytics.
- View own department dashboard.

Blocked:

- User management.
- Faculty/department/class master-data management.
- Other departments.
- Global analytics.

## Student Registration Change

Student creation/editing now uses dependent dropdowns:

```text
Faculty -> Department -> Class
```

The backend hydrates readable fields (`faculty`, `department`, `className`) from selected IDs so old reports and UI remain compatible.

## Migration

Run after deploying the new code against an existing database:

```bash
cd backend
npm run migrate:enterprise
```

The migration creates missing faculty/department/class master records from existing string fields and backfills IDs into students, lecturers, courses, assignments, evaluations, class evaluations, and users.

## Seed Data

`npm run seed` now creates:

- A computing faculty.
- An IT department.
- A BIT-4A class.
- Existing admin, students, lecturers, courses, assignments, questions.
- A sample registration officer:

```text
Username: reg-it
Password: Reg12345!
```

## Verification

- Backend syntax checks passed for all modified and new route files.
- Frontend production build passed.
- Existing CSV utility test passed.
