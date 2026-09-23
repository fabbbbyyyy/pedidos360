const { error: errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const withErrorHandler = (handler) => async (event, context) => {
  try {
    return await handler(event, context);
  } catch (err) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });

    if (err.name === 'ZodError') {
      return errorResponse('Datos inválidos', 400, err.errors);
    }

    if (err.statusCode) {
      return errorResponse(err.message, err.statusCode);
    }

    return errorResponse('Error interno del servidor', 500);
  }
};

module.exports = { withErrorHandler };
