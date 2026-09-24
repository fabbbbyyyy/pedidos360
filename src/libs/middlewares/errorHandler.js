const { error: errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const LOCAL_ORIGIN = 'http://localhost:5173';

const getAllowedOrigin = (event) => {
  const requestOrigin = event?.headers?.origin || event?.headers?.Origin;
  const configuredOrigin = process.env.ALLOWED_ORIGIN?.trim();
  const allowedOrigins = [
    LOCAL_ORIGIN,
    ...(configuredOrigin && configuredOrigin !== LOCAL_ORIGIN
      ? [configuredOrigin]
      : []),
  ];

  return allowedOrigins.includes(requestOrigin) ? requestOrigin : LOCAL_ORIGIN;
};

const addCorsOrigin = (response, event) => ({
  ...response,
  headers: {
    ...response.headers,
    'Access-Control-Allow-Origin': getAllowedOrigin(event),
  },
});

const withErrorHandler = (handler) => async (event, context) => {
  try {
    return addCorsOrigin(await handler(event, context), event);
  } catch (err) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });

    if (err.name === 'ZodError') {
      return addCorsOrigin(errorResponse('Datos inválidos', 400, err.errors), event);
    }

    if (err.statusCode) {
      return addCorsOrigin(errorResponse(err.message, err.statusCode), event);
    }

    return addCorsOrigin(errorResponse('Error interno del servidor', 500), event);
  }
};

module.exports = { withErrorHandler };
