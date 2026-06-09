export const statusOptions = ['active', 'inactive'];
export const facultyDefault = 'Faculty of Information Technology';
export const departmentDefault = 'Information Technology';

export const studentsConfig = {
  title: 'Students',
  subtitle: 'Manage student records, accounts, classes, and CSV imports.',
  endpoint: '/students',
  fields: [
    { name: 'studentId', label: 'Student ID' },
    { name: 'fullName', label: 'Full Name' },
    { name: 'faculty', label: 'Faculty', defaultValue: facultyDefault },
    { name: 'department', label: 'Department', defaultValue: departmentDefault },
    { name: 'className', label: 'Class Name', defaultValue: 'BIT-4A' },
    { name: 'password', label: 'Password', type: 'password', defaultValue: '123456' },
    { name: 'status', label: 'Status', type: 'select', options: statusOptions, defaultValue: 'active' }
  ],
  columns: [
    { key: 'studentId', label: 'Student ID' },
    { key: 'fullName', label: 'Name' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'department', label: 'Department' },
    { key: 'className', label: 'Class' },
    { key: 'status', label: 'Status' }
  ]
};

export const lecturersConfig = {
  title: 'Lecturers',
  subtitle: 'Manage lecturer profiles and lecturer login accounts.',
  endpoint: '/lecturers',
  fields: [
    { name: 'lecturerId', label: 'Lecturer ID' },
    { name: 'fullName', label: 'Full Name' },
    { name: 'password', label: 'Login Password', type: 'password' },
    { name: 'status', label: 'Status', type: 'select', options: statusOptions, defaultValue: 'active' }
  ],
  columns: [
    { key: 'lecturerId', label: 'Lecturer ID' },
    { key: 'fullName', label: 'Name' },
    { key: 'status', label: 'Status' }
  ]
};

export const coursesConfig = {
  title: 'Courses',
  subtitle: 'Manage course catalog records and CSV imports.',
  endpoint: '/courses',
  fields: [
    { name: 'courseCode', label: 'Course Code' },
    { name: 'courseName', label: 'Course Name' },
    { name: 'creditHours', label: 'Credit Hours', type: 'number', defaultValue: 3 },
    { name: 'status', label: 'Status', type: 'select', options: statusOptions, defaultValue: 'active' }
  ],
  columns: [
    { key: 'courseCode', label: 'Code' },
    { key: 'courseName', label: 'Course' },
    { key: 'creditHours', label: 'Credits' },
    { key: 'status', label: 'Status' }
  ]
};

export const assignmentsConfig = {
  title: 'Course Assignments',
  subtitle: 'Assign courses to classes, semesters, academic years, and lecturers.',
  endpoint: '/assignments',
  fields: [
    { name: 'assignmentId', label: 'Assignment ID' },
    { name: 'courseCode', label: 'Course Code' },
    { name: 'courseName', label: 'Course Name' },
    { name: 'className', label: 'Class Name', defaultValue: 'BIT-4A' },
    { name: 'semester', label: 'Semester', defaultValue: 'Semester 2 - 2024/2025' },
    { name: 'academicYear', label: 'Academic Year', defaultValue: '2024/2025' },
    { name: 'lecturerId', label: 'Lecturer ID' },
    { name: 'lecturerName', label: 'Lecturer Name' },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], defaultValue: 'active' }
  ],
  columns: [
    { key: 'assignmentId', label: 'ID' },
    { key: 'courseCode', label: 'Code' },
    { key: 'courseName', label: 'Course' },
    { key: 'className', label: 'Class' },
    { key: 'semester', label: 'Semester' },
    { key: 'lecturerName', label: 'Lecturer' },
    { key: 'status', label: 'Status' }
  ]
};

export const questionsConfig = {
  title: 'Evaluation Questions',
  subtitle: 'Maintain question bank grouped by evaluation category.',
  endpoint: '/questions',
  fields: [
    { name: 'questionId', label: 'Question ID' },
    { name: 'questionText', label: 'Question Text', type: 'textarea' },
    { name: 'category', label: 'Category', defaultValue: 'Teaching & Instruction Quality' },
    { name: 'inputType', label: 'Input Type', type: 'select', options: ['likert', 'star', 'radio', 'textarea'], defaultValue: 'likert' },
    { name: 'options', label: 'Options (use | separator)' },
    { name: 'order', label: 'Order', type: 'number' },
    { name: 'status', label: 'Status', type: 'select', options: statusOptions, defaultValue: 'active' }
  ],
  columns: [
    { key: 'questionId', label: 'ID' },
    { key: 'questionText', label: 'Question' },
    { key: 'category', label: 'Category' },
    { key: 'inputType', label: 'Type' },
    { key: 'order', label: 'Order' },
    { key: 'status', label: 'Status' }
  ]
};
