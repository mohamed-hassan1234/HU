import ResourcePage from '../../components/ResourcePage';
import AdminAssignmentsPage from './AdminAssignmentsPage';
import AdminStudentsPage from './AdminStudentsPage';
import { coursesConfig, lecturersConfig, questionsConfig } from './resourceConfigs';

export const StudentsPage = () => <AdminStudentsPage />;
export const LecturersPage = () => <ResourcePage {...lecturersConfig} />;
export const CoursesPage = () => <ResourcePage {...coursesConfig} />;
export const AssignmentsPage = () => <AdminAssignmentsPage />;
export const QuestionsPage = () => <ResourcePage {...questionsConfig} />;
