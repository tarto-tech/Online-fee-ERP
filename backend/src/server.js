require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const { initRedis } = require('./config/cache');
const logger = require('./utils/logger');
const Admin = require('./models/Admin');
const { sendDueDateReminders } = require('./services/reminderService');

const PORT = process.env.PORT || 5000;

const seedDefaultAdmin = async () => {
  if (!process.env.ADMIN_DEFAULT_EMAIL || !process.env.ADMIN_DEFAULT_PASSWORD) {
    logger.warn('ADMIN_DEFAULT_EMAIL or ADMIN_DEFAULT_PASSWORD not set — skipping seed');
    return;
  }
  const exists = await Admin.findOne({ email: process.env.ADMIN_DEFAULT_EMAIL });
  if (!exists) {
    await Admin.create({
      name: 'Super Admin',
      email: process.env.ADMIN_DEFAULT_EMAIL,
      password: process.env.ADMIN_DEFAULT_PASSWORD,
      role: 'super_admin',
    });
    logger.info('Default admin created');
  } else {
    logger.info('Default admin already exists — skipping seed');
  }
};

const startServer = async () => {
  try {
    // Log startup
    logger.info('Starting College ERP Backend...');
    logger.info(`Node version: ${process.version}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Port: ${PORT}`);

    // Connect to database
    logger.info('Connecting to MongoDB...');
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Connect to Redis (optional, falls back to in-memory)
    await initRedis();

    // Verify SMTP connection
    try {
      const { verifyConnection } = require('./services/emailService');
      await verifyConnection();
    } catch (err) {
      logger.warn(`SMTP verification failed: ${err.message} — emails will not be delivered`);
    }

    // Seed default admin
    logger.info('Checking default admin...');
    await seedDefaultAdmin();

    // Run due date reminder every day at 9 AM
    const scheduleReminders = () => {
      const now = new Date();
      const next9AM = new Date(now);
      next9AM.setHours(9, 0, 0, 0);
      if (next9AM <= now) next9AM.setDate(next9AM.getDate() + 1);
      const msUntil9AM = next9AM - now;
      setTimeout(() => {
        sendDueDateReminders();
        setInterval(sendDueDateReminders, 24 * 60 * 60 * 1000);
      }, msUntil9AM);
      logger.info(`Due date reminders scheduled — next run at ${next9AM.toLocaleTimeString()}`);
    };
    scheduleReminders();

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`✅ Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err?.stack || err?.message || err}`);
      shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('Failed to start server:');
    logger.error(error.stack || error.message || error);
    process.exit(1);
  }
};

startServer().catch((error) => {
  logger.error('Fatal error during startup:');
  logger.error(error.stack || error.message || error);
  process.exit(1);
});
