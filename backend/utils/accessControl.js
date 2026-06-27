const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const ClassGroup = require('../models/Class');

const ADMIN_ROLE = 'admin';
const REGISTRATION_ROLE = 'registration';
const FACULTY_SCOPED_ROLE = 'dean';
const DEPARTMENT_SCOPED_ROLES = ['registration', 'department_head'];
const ACADEMIC_MANAGER_ROLES = ['admin', 'registration'];
const REPORTING_ROLES = ['admin', 'registration', 'department_head', 'dean', 'lecturer'];

const objectId = (value) => (mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : value);
const idString = (value) => (value ? String(value._id || value) : '');
const isAdmin = (user) => user?.role === ADMIN_ROLE;
const isRegistration = (user) => user?.role === REGISTRATION_ROLE;

const userFacultyId = (user) => idString(user?.facultyId || user?.faculty);
const userDepartmentId = (user) => idString(user?.departmentId || user?.department);

const scopedQuery = (req, query = {}) => {
  const next = { ...query };
  if (isAdmin(req.user) || req.user?.role === 'lecturer' || req.user?.role === 'student') return next;
  if (req.user?.role === FACULTY_SCOPED_ROLE) {
    const facultyId = userFacultyId(req.user);
    next.facultyId = facultyId || '__none__';
  }
  if (DEPARTMENT_SCOPED_ROLES.includes(req.user?.role)) {
    const departmentId = userDepartmentId(req.user);
    next.departmentId = departmentId || '__none__';
  }
  return next;
};

const assertCanAccessDepartment = (req, departmentId) => {
  if (isAdmin(req.user)) return;
  const ownDepartmentId = userDepartmentId(req.user);
  if (!ownDepartmentId || idString(departmentId) !== ownDepartmentId) {
    const error = new Error('You can only access records from your assigned department');
    error.statusCode = 403;
    throw error;
  }
};

const assertCanAccessFaculty = (req, facultyId) => {
  if (isAdmin(req.user)) return;
  if (req.user?.role === FACULTY_SCOPED_ROLE) {
    const ownFacultyId = userFacultyId(req.user);
    if (!ownFacultyId || idString(facultyId) !== ownFacultyId) {
      const error = new Error('You can only access records from your assigned faculty');
      error.statusCode = 403;
      throw error;
    }
    return;
  }
  assertCanAccessDepartment(req, req.user.departmentId);
};

const hydrateFacultyDepartment = async ({ facultyId, departmentId, classId, fallback = {} }) => {
  let classRecord = null;
  if (classId) classRecord = await ClassGroup.findById(classId).lean();

  const resolvedDepartmentId = departmentId || classRecord?.department;
  const department = resolvedDepartmentId ? await Department.findById(resolvedDepartmentId).lean() : null;
  const resolvedFacultyId = facultyId || department?.faculty || classRecord?.faculty;
  const faculty = resolvedFacultyId ? await Faculty.findById(resolvedFacultyId).lean() : null;

  if (classId && !classRecord) throw Object.assign(new Error('Selected class was not found'), { statusCode: 400 });
  if (resolvedDepartmentId && !department) throw Object.assign(new Error('Selected department was not found'), { statusCode: 400 });
  if (resolvedFacultyId && !faculty) throw Object.assign(new Error('Selected faculty was not found'), { statusCode: 400 });

  return {
    facultyId: resolvedFacultyId ? idString(resolvedFacultyId) : fallback.facultyId,
    departmentId: resolvedDepartmentId ? idString(resolvedDepartmentId) : fallback.departmentId,
    classId: classId ? idString(classId) : fallback.classId,
    faculty: faculty?.name || classRecord?.facultyName || fallback.faculty,
    department: department?.name || classRecord?.departmentName || fallback.department,
    className: classRecord?.className || fallback.className,
    semester: fallback.semester || classRecord?.semester,
    academicYear: fallback.academicYear || classRecord?.academicYear
  };
};

module.exports = {
  ADMIN_ROLE,
  REGISTRATION_ROLE,
  ACADEMIC_MANAGER_ROLES,
  REPORTING_ROLES,
  DEPARTMENT_SCOPED_ROLES,
  FACULTY_SCOPED_ROLE,
  isAdmin,
  isRegistration,
  userFacultyId,
  userDepartmentId,
  scopedQuery,
  assertCanAccessDepartment,
  assertCanAccessFaculty,
  hydrateFacultyDepartment,
  objectId,
  idString
};
