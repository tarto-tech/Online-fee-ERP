const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists`, 409);
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new AppError(messages.join(', '), 422);
};

const handleJWTError = () => new AppError('Invalid token. Please login again', 401);
const handleJWTExpiredError = () => new AppError('Token expired. Please login again', 401);

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err, message: err.message };

  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (error.statusCode === 500) {
    logger.error(`Unhandled error: ${err.stack || err.message}`);
  }

  res.status(error.statusCode).json({
    status: error.status,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
