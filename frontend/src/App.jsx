import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const EvaluationsPage = lazy(() => import('./pages/admin/EvaluationsPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'));
const RegistrationDashboard = lazy(() => import('./pages/registration/RegistrationDashboard'));
const FacultyManagementPage = lazy(() => import('./pages/admin/MasterDataPages').then((module) => ({ default: module.FacultyManagementPage })));
const DepartmentManagementPage = lazy(() => import('./pages/admin/MasterDataPages').then((module) => ({ default: module.DepartmentManagementPage })));
const ClassManagementPage = lazy(() => import('./pages/admin/MasterDataPages').then((module) => ({ default: module.ClassManagementPage })));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const MyCoursesPage = lazy(() => import('./pages/student/MyCoursesPage'));
const EvaluationFormPage = lazy(() => import('./pages/student/EvaluationFormPage'));
const SubmittedEvaluationsPage = lazy(() => import('./pages/student/SubmittedEvaluationsPage'));
const ProfilePage = lazy(() => import('./pages/student/ProfilePage'));
const LecturerDashboard = lazy(() => import('./pages/lecturer/LecturerDashboard'));
const LecturerSummaryPage = lazy(() => import('./pages/lecturer/LecturerSummaryPage'));
const LecturerReportsPage = lazy(() => import('./pages/lecturer/LecturerReportsPage'));
const ClassEvaluationPage = lazy(() => import('./pages/lecturer/ClassEvaluationPage'));
const LecturerQuestionsPage = lazy(() => import('./pages/lecturer/LecturerQuestionsPage'));
const AdminClassEvaluationsPage = lazy(() => import('./pages/admin/ClassEvaluationsPage'));

const resourcePage = (name) => lazy(() =>
  import('./pages/admin/ResourceScreens').then((module) => ({ default: module[name] }))
);

const StudentsPage = resourcePage('StudentsPage');
const LecturersPage = resourcePage('LecturersPage');
const CoursesPage = resourcePage('CoursesPage');
const AssignmentsPage = resourcePage('AssignmentsPage');
const QuestionsPage = resourcePage('QuestionsPage');

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-huBg">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-huGreen/25 border-t-huGreen" />
        Loading your workspace...
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute roles={['admin', 'dean']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/evaluations" element={<EvaluationsPage />} />
              <Route path="/admin/class-evaluations" element={<AdminClassEvaluationsPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/analytics" element={<AnalyticsPage />} />
              <Route path="/admin/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/students" element={<StudentsPage />} />
              <Route path="/admin/lecturers" element={<LecturersPage />} />
              <Route path="/admin/courses" element={<CoursesPage />} />
              <Route path="/admin/assignments" element={<AssignmentsPage />} />
              <Route path="/admin/faculties" element={<FacultyManagementPage />} />
              <Route path="/admin/departments" element={<DepartmentManagementPage />} />
              <Route path="/admin/classes" element={<ClassManagementPage />} />
              <Route path="/admin/questions" element={<QuestionsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['registration']} />}>
            <Route element={<AppLayout />}>
              <Route path="/registration" element={<RegistrationDashboard />} />
              <Route path="/registration/students" element={<StudentsPage />} />
              <Route path="/registration/lecturers" element={<LecturersPage />} />
              <Route path="/registration/courses" element={<CoursesPage />} />
              <Route path="/registration/assignments" element={<AssignmentsPage />} />
              <Route path="/registration/questions" element={<QuestionsPage />} />
              <Route path="/registration/reports" element={<ReportsPage />} />
              <Route path="/registration/analytics" element={<AnalyticsPage />} />
              <Route path="/registration/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['student']} />}>
            <Route element={<AppLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/courses" element={<MyCoursesPage />} />
              <Route path="/student/evaluate/:courseCode" element={<EvaluationFormPage />} />
              <Route path="/student/evaluations" element={<SubmittedEvaluationsPage />} />
              <Route path="/student/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['lecturer']} />}>
            <Route element={<AppLayout />}>
              <Route path="/lecturer" element={<LecturerDashboard />} />
              <Route path="/lecturer/summary" element={<LecturerSummaryPage />} />
              <Route path="/lecturer/class-evaluation" element={<ClassEvaluationPage />} />
              <Route path="/lecturer/questions" element={<LecturerQuestionsPage />} />
              <Route path="/lecturer/reports" element={<LecturerReportsPage />} />
              <Route path="/lecturer/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
