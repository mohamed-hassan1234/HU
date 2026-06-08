import ResourcePage from '../../components/ResourcePage';
import AdminAssignmentsPage from './AdminAssignmentsPage';
import { coursesConfig, lecturersConfig, questionsConfig, studentsConfig } from './resourceConfigs';

export const StudentsPage = () => <ResourcePage {...studentsConfig} />;
export const LecturersPage = () => <ResourcePage {...lecturersConfig} />;
export const CoursesPage = () => <ResourcePage {...coursesConfig} />;
export const AssignmentsPage = () => <AdminAssignmentsPage />;
export const QuestionsPage = () => <ResourcePage {...questionsConfig} />;
