const test = require('node:test');
const assert = require('node:assert/strict');

const {
  scopedQuery,
  assertCanAccessDepartment
} = require('../utils/accessControl');
const {
  anonymousEvaluation,
  anonymousExportRow
} = require('../utils/evaluationPrivacy');
const { validateSecurityConfig } = require('../config/security');
const { sendOperationalError } = require('../utils/httpError');
const { validateSemesterForTerm } = require('../utils/academicCalendar');
const { targetsAssignment } = require('../utils/evaluationCampaign');

test('anonymous evaluation responses remove the student identifier', () => {
  const result = anonymousEvaluation({
    studentId: 'ST001',
    anonymous: true,
    courseCode: 'CS101',
    comments: { valuable: 'Clear explanations' }
  }, 'Student Name');

  assert.equal(result.studentId, undefined);
  assert.equal(result.studentName, 'Anonymous');
  assert.equal(result.courseCode, 'CS101');
});

test('non-anonymous evaluation responses include the resolved student name', () => {
  const result = anonymousEvaluation({
    studentId: 'ST001',
    anonymous: false,
    courseCode: 'CS101'
  }, 'Student Name');

  assert.equal(result.studentId, 'ST001');
  assert.equal(result.studentName, 'Student Name');
});

test('anonymous CSV rows blank the student identifier without mutating the source', () => {
  const source = { studentId: 'ST001', anonymous: true, courseCode: 'CS101' };
  const result = anonymousExportRow(source);

  assert.equal(result.studentId, '');
  assert.equal(source.studentId, 'ST001');
});

test('registration queries are forced to the account department', () => {
  const result = scopedQuery({
    user: { role: 'registration', facultyId: 'FAC-1', departmentId: 'DEP-1' }
  }, { status: 'active', departmentId: 'DEP-OTHER' });

  assert.deepEqual(result, { status: 'active', departmentId: 'DEP-1' });
});

test('dean queries are forced to the account faculty', () => {
  const result = scopedQuery({
    user: { role: 'dean', facultyId: 'FAC-1' }
  }, { status: 'active', facultyId: 'FAC-OTHER' });

  assert.deepEqual(result, { status: 'active', facultyId: 'FAC-1' });
});

test('registration mutation rejects a different department', () => {
  const req = { user: { role: 'registration', departmentId: 'DEP-1' } };

  assert.throws(
    () => assertCanAccessDepartment(req, 'DEP-2'),
    (error) => error.statusCode === 403
  );
  assert.doesNotThrow(() => assertCanAccessDepartment(req, 'DEP-1'));
});

test('production refuses an unsafe JWT secret', () => {
  const original = {
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    clientUrl: process.env.CLIENT_URL
  };
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'change_this_hucems_secret';
  process.env.CLIENT_URL = 'https://ctes.example.edu';
  try {
    assert.throws(() => validateSecurityConfig(), /JWT_SECRET/);
    process.env.JWT_SECRET = 'a-unique-production-secret-that-is-longer-than-32-characters';
    assert.doesNotThrow(() => validateSecurityConfig());
  } finally {
    if (original.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original.nodeEnv;
    if (original.jwtSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original.jwtSecret;
    if (original.clientUrl === undefined) delete process.env.CLIENT_URL; else process.env.CLIENT_URL = original.clientUrl;
  }
});

test('production error responses hide internal server details', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  let response;
  const res = {
    status(status) {
      response = { status };
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    }
  };
  try {
    sendOperationalError(res, new Error('database topology and secret details'));
    assert.deepEqual(response, { status: 500, body: { message: 'Internal server error' } });
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
  }
});

test('shared terms enforce odd and even class semesters', () => {
  assert.equal(validateSemesterForTerm({ semester: 3, termNumber: 1, totalSemesters: 8 }).valid, true);
  assert.equal(validateSemesterForTerm({ semester: 4, termNumber: 2, totalSemesters: 8 }).valid, true);
  assert.equal(validateSemesterForTerm({ semester: 4, termNumber: 1, totalSemesters: 8 }).valid, false);
  assert.equal(validateSemesterForTerm({ semester: 9, termNumber: 1, totalSemesters: 8 }).valid, false);
});

test('evaluation campaign targets apply at university and organizational scopes', () => {
  const assignment = { facultyId: 'fac-1', departmentId: 'dep-1', classId: 'class-1' };
  assert.equal(targetsAssignment({ targetType: 'all', targetIds: [] }, assignment), true);
  assert.equal(targetsAssignment({ targetType: 'faculty', targetIds: ['fac-1'] }, assignment), true);
  assert.equal(targetsAssignment({ targetType: 'department', targetIds: ['dep-2'] }, assignment), false);
  assert.equal(targetsAssignment({ targetType: 'class', targetIds: ['class-1'] }, assignment), true);
});
