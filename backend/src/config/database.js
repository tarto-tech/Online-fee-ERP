const mongoose = require('mongoose');
const logger = require('../utils/logger');

const getMongoUriConfig = () => {
  // In production, try MONGODB_URI first, then fall back to MONGODB_URI_PROD
  if (process.env.NODE_ENV === 'production') {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;
    return {
      envKey: process.env.MONGODB_URI ? 'MONGODB_URI' : 'MONGODB_URI_PROD',
      uri,
    };
  }

  // In development, use MONGODB_URI
  return {
    envKey: 'MONGODB_URI',
    uri: process.env.MONGODB_URI,
  };
};

const isLocalMongoUri = (uri = '') => /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?/i.test(uri);

const getMongoConnectionHint = (uri, error) => {
  const errorCode = error?.cause?.code || error?.code;

  if (isLocalMongoUri(uri) && errorCode === 'ECONNREFUSED') {
    return 'Start your local MongoDB service on port 27017 or update backend/.env to use a reachable MongoDB URI.';
  }

  if (errorCode === 'ENOTFOUND') {
    return 'Check the MongoDB hostname in backend/.env and make sure it resolves from this machine.';
  }

  return null;
};

const connectDB = async () => {
  const { envKey, uri } = getMongoUriConfig();

  if (!uri) {
    logger.error(`MongoDB connection failed: ${envKey} is not set`);
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);

    const hint = getMongoConnectionHint(uri, error);
    if (hint) {
      logger.error(`MongoDB hint: ${hint}`);
    }

    process.exit(1);
  }
};

module.exports = connectDB;
