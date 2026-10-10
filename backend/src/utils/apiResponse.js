// src/utils/apiResponse.js

const successResponse = (res, message = 'Success', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const paginatedResponse = (res, message = 'Success', data = [], pagination = {}, statusCode = 200) => {
  const paginationObj = {
    page: pagination.page || 1,
    limit: pagination.limit || 20,
    total: pagination.total !== undefined ? pagination.total : data.length,
    pages: pagination.pages || Math.ceil((pagination.total !== undefined ? pagination.total : data.length) / (pagination.limit || 20)),
    ...(pagination.summary ? { summary: pagination.summary } : {}),
    ...pagination,
  };

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: paginationObj,
    meta: paginationObj,
  });
};

const errorResponse = (res, message = 'An error occurred', errors = [], statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
  });
};

module.exports = {
  successResponse,
  paginatedResponse,
  errorResponse,
};
