import ResourcePage from '../../components/ResourcePage';
import AdminAssignmentsPage from './AdminAssignmentsPage';
import AdminStudentsPage from './AdminStudentsPage';
import { coursesConfig, lecturersConfig, questionsConfig } from './resourceConfigs';

export const StudentsPage = () => <AdminStudentsPage />;
export const LecturersPage = () => (
  <ResourcePage
    {...lecturersConfig}
    bulkImport={{
      title: 'Lecturers',
      endpoint: '/lecturers',
      addLabel: 'Add Lecturer',
      importLabel: 'Bulk Import Lecturers',
      templateLabel: 'Download Lecturer Template',
      exportLabel: 'Export Lecturers',
      templateFileName: 'lecturer-import-template.xlsx',
      exportFileName: 'lecturers.xlsx'
    }}
  />
);
export const CoursesPage = () => <ResourcePage {...coursesConfig} />;
export const AssignmentsPage = () => <AdminAssignmentsPage />;
export const QuestionsPage = () => <ResourcePage {...questionsConfig} />;
