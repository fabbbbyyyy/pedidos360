/**
 * API Gateway (HTTP API) ya validó el JWT de Azure Entra ID usando el
 * authorizer nativo "azureAdAuthorizer" definido en serverless.yml
 * (firma, expiración, issuer y audience). Acá solo leemos los claims
 * que API Gateway deja disponibles en el evento; no se vuelve a
 * verificar el token dentro del handler.
 */
const resolveClaimValue = (claims, ...keys) => {
  for (const key of keys) {
    if (!key) continue;
    if (claims[key] !== undefined && claims[key] !== null && claims[key] !== '') {
      return claims[key];
    }
  }
  return null;
};

const resolveCustomerId = (claims = {}) => resolveClaimValue(
  claims,
  'oid',
  'sub',
  'customerId',
  'custom:customerId',
  'http://schemas.microsoft.com/identity/claims/objectidentifier',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
);

const resolveTenantId = (claims = {}) => resolveClaimValue(
  claims,
  'tid',
  'tenantId',
  'tenant'
);

const getUserFromEvent = (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims) return null;

  const customerId = resolveCustomerId(claims);
  return {
    oid: customerId,
    customerId,
    tenantId: resolveTenantId(claims) || 'default',
    name: claims.name,
    email: claims.preferred_username || claims.email || claims.upn,
    roles: extractRoles(claims),
    raw: claims,
  };
};

const extractRoles = (claims) => {
  const rawRoles = claims.roles || claims.role || claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  if (!rawRoles) return [];

  if (Array.isArray(rawRoles)) return rawRoles.map(String);

  if (typeof rawRoles === 'string') {
    const cleaned = rawRoles.replace(/^\[|\]$/g, '');
    return cleaned
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }

  return [];
};

const ensureClientCreateRequest = (user, payload = {}) => {
  if (!user || !(user.roles || []).includes('cliente')) return payload;
  if (Object.prototype.hasOwnProperty.call(payload, 'customerId')) {
    const err = new Error('No se permite sobrescribir customerId en la creación de pedidos para clientes');
    err.statusCode = 400;
    throw err;
  }
  return payload;
};

const authorizeOrderAccess = (user, order = {}) => {
  if (!user || !order) return false;

  if ((user.roles || []).includes('cliente')) {
    return order.customerId === user.customerId;
  }

  if ((user.roles || []).includes('admin') || (user.roles || []).includes('operador')) {
    if (!user.tenantId || !order.tenantId) return true;
    return order.tenantId === user.tenantId;
  }

  return false;
};

module.exports = {
  getUserFromEvent,
  resolveCustomerId,
  resolveTenantId,
  ensureClientCreateRequest,
  authorizeOrderAccess,
  extractRoles,
};
