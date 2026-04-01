const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const logger = require('./utils/logger');

// Routes
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const studentAuthRoutes = require('./routes/studentAuthRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const feeStructureRoutes = require('./routes/feeStructureRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const feeWaiverRoutes = require('./routes/feeWaiverRoutes');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL, process.env.STUDENT_PORTAL_URL].filter(Boolean)
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

// Rate limiting (only in production)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: { status: 'fail', message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { status: 'fail', message: 'Too many login attempts, please try again later' },
  });

  // OTP-specific limiter: 5 requests per 10 minutes per IP
  const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { status: 'fail', message: 'Too many OTP requests, please try again after 10 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', limiter);
  app.use('/api/auth', authLimiter);
  app.use('/api/auth/student/send-otp', otpLimiter);
  app.use('/api/auth/student/verify-otp', otpLimiter);
}

// Webhook needs raw Buffer for signature verification — must come before json parser
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
// All other routes use JSON
app.use((req, res, next) => {
  if (req.path === '/api/payments/webhook') return next();
  express.json({ limit: '10kb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize MongoDB queries
app.use(mongoSanitize());

// Compression
app.use(compression());

// HTTP logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// API Routes
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/auth/student', studentAuthRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/fee-structures', feeStructureRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/fee-waivers', feeWaiverRoutes);

// Logout + Refresh (works for both admin and student)
const { protect, logout, refresh } = require('./middleware/auth');
app.post('/api/auth/logout', protect, logout);
app.post('/api/auth/refresh', refresh);

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;
