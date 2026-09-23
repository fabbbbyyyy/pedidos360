const { getUserFromEvent } = require('./auth');
const logger = require('../utils/logger'); // ajusta el path si es necesario

const requireRoles = (...allowedRoles) => (handler) => async (event, context) => {
  const user = getUserFromEvent(event);

  logger.info('DEBUG requireRoles', {
    rawClaims: event?.requestContext?.authorizer?.jwt?.claims,
    userRoles: user?.roles,
    allowedRoles,
  });

  if (!user) {
    const err = new Error('No se pudo identificar al usuario autenticado');
    err.statusCode = 401;
    throw err;
  }

  const authorized = user.roles.some((r) => allowedRoles.includes(r));
  if (!authorized) {
    const err = new Error('No tienes permisos para esta operación');
    err.statusCode = 403;
    throw err;
  }

  event.user = user;
  return handler(event, context);
};

module.exports = { requireRoles };