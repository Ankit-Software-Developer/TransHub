// src/middleware/errorHandler.js
const { errorResponse } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = Object.keys(err.fields || {});
    return errorResponse(res, `Duplicate entry: A record with this ${fields.join(', ')} already exists`, err.errors, 409);
  }

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const validationErrors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(res, 'Validation error', validationErrors, 422);
  }

  // Joi Validation Error
  if (err.isJoi) {
    const details = err.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return errorResponse(res, 'Invalid request parameters', details, 400);
  }

  // Default Internal Server Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return errorResponse(res, message, process.env.NODE_ENV === 'development' ? err.stack : null, statusCode);
};

module.exports = errorHandler;
