import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import { AssignmentsPage, CoursesPage, LecturersPage, QuestionsPage, StudentsPage } from './pages/admin/ResourceScreens';
import EvaluationsPage from './pages/admin/EvaluationsPage';
import ReportsPage from './pages/admin/ReportsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import ImportPage from './pages/admin/ImportPage';
import SettingsPage from './pages/admin/SettingsPage';
import StudentDashboard from './pages/student/StudentDashboard';
import MyCoursesPage from './pages/student/MyCoursesPage';
import EvaluationFormPage from './pages/student/EvaluationFormPage';
import SubmittedEvaluationsPage from './pages/student/SubmittedEvaluationsPage';
import ProfilePage from './pages/student/ProfilePage';
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import LecturerSummaryPage from './pages/lecturer/LecturerSummaryPage';
import LecturerReportsPage from './pages/lecturer/LecturerReportsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/analytics" element={<AnalyticsPage />} />
              <Route path="/admin/import" element={<ImportPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
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
              <Route path="/lecturer/reports" element={<LecturerReportsPage />} />
              <Route path="/lecturer/download" element={<LecturerReportsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
