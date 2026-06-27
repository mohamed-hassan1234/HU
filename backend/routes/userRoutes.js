const express = require('express');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv, parseOptions } = require('../utils/csv');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const adminOnly = [protect, authorize('admin')];
const roles = ['admin', 'registration', 'student', 'lecturer', 'department_head', 'dean'];

const columns = [
  { header: 'full_name', key: 'fullName' },
  { header: 'username', key: 'loginId' },
  { header: 'email', key: 'email' },
  { header: 'role', key: 'role' },
  { header: 'faculty', key: 'faculty' },
  { header: 'department', key: 'department' },
  { header: 'status', key: 'status' },
  { header: 'last_login', key: 'lastLogin' },
  { header: 'created_date', key: 'createdAt' }
];

const resolveScope = async (body) => {
  const [faculty, department] = await Promise.all([
    body.facultyId ? Faculty.findById(body.facultyId).lean() : null,
    body.departmentId ? Department.findById(body.departmentId).lean() : null
  ]);
  if (body.facultyId && !faculty) throw Object.assign(new Error('Selected faculty was not found'), { statusCode: 400 });
  if (body.departmentId && !department) throw Object.assign(new Error('Selected department was not found'), { statusCode: 400 });
  return {
    facultyId: body.facultyId || department?.faculty || undefined,
    faculty: faculty?.name || department?.facultyName || body.faculty || '',
    departmentId: body.departmentId || undefined,
    department: department?.name || body.department || ''
  };
};

const toUser = async (body, existing = null) => {
  const scope = await resolveScope(body);
  const role = body.role || existing?.role || 'student';
  if (!roles.includes(role)) throw Object.assign(new Error('Invalid user role'), { statusCode: 400 });
  if (['registration', 'department_head'].includes(role) && !scope.departmentId) {
    throw Object.assign(new Error('Faculty and department are required for this role'), { statusCode: 400 });
  }
  if (role === 'dean' && !scope.facultyId) {
    throw Object.assign(new Error('Faculty is required for dean users'), { statusCode: 400 });
  }
  return {
    loginId: body.loginId || body.username || existing?.loginId,
    fullName: body.fullName || body.full_name || existing?.fullName,
    email: body.email || existing?.email,
    role,
    status: body.status || existing?.status || 'active',
    permissions: Array.isArray(body.permissions) ? body.permissions : parseOptions(body.permissions),
    ...scope,
    ...(body.password ? { password: body.password } : {})
  };
};

const sanitize = (user) => {
  const plain = user.toObject ? user.toObject() : user;
  delete plain.password;
  return plain;
};

router.get('/roles', adminOnly, (req, res) => {
  res.json({ data: roles });
});

router.get('/', adminOnly, async (req, res) => {
  const { search = '', role, status, facultyId, departmentId, page = 1, limit = 20 } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { loginId: new RegExp(search, 'i') },
      { fullName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }
  if (role) query.role = role;
  if (status) query.status = status;
  if (facultyId) query.facultyId = facultyId;
  if (departmentId) query.departmentId = departmentId;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.post('/', adminOnly, async (req, res) => {
  const payload = await toUser(req.body);
  if (!payload.loginId || !payload.password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  const user = await User.create(payload);
  await logActivity(req, 'create', 'user', user.loginId, { role: user.role });
  res.status(201).json(sanitize(user));
});

router.put('/:id', adminOnly, async (req, res) => {
  const existing = await User.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'User not found' });
  const payload = await toUser(req.body, existing);
  if (!payload.password) delete payload.password;
  Object.assign(existing, payload);
  await existing.save();
  await logActivity(req, 'update', 'user', existing.loginId, { role: existing.role });
  res.json(sanitize(existing));
});

router.delete('/:id', adminOnly, async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await logActivity(req, 'delete', 'user', user.loginId, { role: user.role });
  res.json({ message: 'User deleted' });
});

router.patch('/:id/status', adminOnly, async (req, res) => {
  const status = req.body.status === 'inactive' ? 'inactive' : 'active';
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  await logActivity(req, status === 'active' ? 'activate' : 'deactivate', 'user', user.loginId);
  res.json(user);
});

router.patch('/:id/reset-password', adminOnly, async (req, res) => {
  const password = req.body.password || '12345678@HU';
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.password = password;
  await user.save();
  await logActivity(req, 'reset_password', 'user', user.loginId);
  res.json({ message: 'Password reset successfully' });
});

router.post('/import-csv', adminOnly, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  for (const row of rows) {
    const payload = await toUser({
      loginId: row.username || row.login_id || row.loginid,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      faculty: row.faculty,
      department: row.department,
      password: row.password || '12345678@HU',
      status: row.status,
      permissions: row.permissions
    });
    if (!payload.loginId) continue;
    const user = await User.findOne({ loginId: payload.loginId });
    if (user) {
      Object.assign(user, payload);
      await user.save();
    } else {
      await User.create(payload);
    }
    imported += 1;
  }
  await logActivity(req, 'import_csv', 'user', 'bulk', { imported });
  res.json({ message: 'Users imported', imported });
});

router.get('/export-csv', adminOnly, async (req, res) => {
  const users = await User.find().select('-password').lean();
  sendCsv(res, 'users.csv', users, columns);
});

module.exports = router;
