require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { isProduction, validateSecurityConfig } = require('./config/security');

validateSecurityConfig();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const classRoutes = require('./routes/classRoutes');
const academicYearRoutes = require('./routes/academicYearRoutes');
const academicTermRoutes = require('./routes/academicTermRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const studentRoutes = require('./routes/studentRoutes');
const lecturerRoutes = require('./routes/lecturerRoutes');
const courseRoutes = require('./routes/courseRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const questionRoutes = require('./routes/questionRoutes');
const { router: evaluationRoutes } = require('./routes/evaluationRoutes');
const studentPortalRoutes = require('./routes/studentPortalRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const activityRoutes = require('./routes/activityRoutes');
const classEvaluationRoutes = require('./routes/classEvaluationRoutes');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  strictTransportSecurity: isProduction() ? undefined : false
}));

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5175',
  'https://www.ctes.hu.edu.so',
  'https://ctes.hu.edu.so',
  ...(process.env.CLIENT_URL || '').split(',')
]
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    const normalizedOrigin = origin?.replace(/\/+$/, '');
    if (!origin || allowedOrigins.has(normalizedOrigin)) return callback(null, true);
    const error = new Error(`Origin ${origin} is not allowed by CORS`);
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ name: 'HUCEMS API', status: 'running' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/academic-terms', academicTermRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/lecturers', lecturerRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/student', studentPortalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/class-evaluations', classEvaluationRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, req, res, next) => {
  console.error(error);
  const duplicate = error.code === 11000;
  const duplicateAssignment = duplicate && error.keyPattern?.courseCode && error.keyPattern?.className;
  const status = error.statusCode || (duplicate ? 409 : 500);
  const safeMessage = status >= 500 && isProduction() ? 'Internal server error' : error.message || 'Server error';
  res.status(status).json({
    message: duplicateAssignment
      ? 'This course is already assigned to this class for the selected semester.'
      : duplicate
        ? 'Duplicate record exists'
        : safeMessage
  });
});

const port = process.env.PORT || 5020;

connectDB()
  .then(() => app.listen(port, () => console.log(`HUCEMS API running on port ${port}`)))
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });
