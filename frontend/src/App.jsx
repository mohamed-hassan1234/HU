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
const ImportPage = lazy(() => import('./pages/admin/ImportPage'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const MyCoursesPage = lazy(() => import('./pages/student/MyCoursesPage'));
const EvaluationFormPage = lazy(() => import('./pages/student/EvaluationFormPage'));
const SubmittedEvaluationsPage = lazy(() => import('./pages/student/SubmittedEvaluationsPage'));
const ProfilePage = lazy(() => import('./pages/student/ProfilePage'));
const LecturerDashboard = lazy(() => import('./pages/lecturer/LecturerDashboard'));
const LecturerSummaryPage = lazy(() => import('./pages/lecturer/LecturerSummaryPage'));
const LecturerReportsPage = lazy(() => import('./pages/lecturer/LecturerReportsPage'));
const ClassEvaluationPage = lazy(() => import('./pages/lecturer/ClassEvaluationPage'));
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

          <Route element={<ProtectedRoute roles={['admin', 'department_head', 'dean']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/students" element={<StudentsPage />} />
              <Route path="/admin/lecturers" element={<LecturersPage />} />
              <Route path="/admin/courses" element={<CoursesPage />} />
              <Route path="/admin/assignments" element={<AssignmentsPage />} />
              <Route path="/admin/questions" element={<QuestionsPage />} />
              <Route path="/admin/evaluations" element={<EvaluationsPage />} />
              <Route path="/admin/class-evaluations" element={<AdminClassEvaluationsPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/analytics" element={<AnalyticsPage />} />
              <Route path="/admin/profile" element={<ProfilePage />} />
              <Route path="/admin/import" element={<ImportPage />} />
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
