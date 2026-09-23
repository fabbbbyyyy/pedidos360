/**
 * API Gateway (HTTP API) ya validó el JWT de Azure Entra ID usando el
 * authorizer nativo "azureAdAuthorizer" definido en serverless.yml
 * (firma, expiración, issuer y audience). Acá solo leemos los claims
 * que API Gateway deja disponibles en el evento; no se vuelve a
 * verificar el token dentro del handler.
 */
const getUserFromEvent = (event) => {
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims) return null;

  return {
    oid: claims.oid || claims.sub,
    name: claims.name,
    email: claims.preferred_username || claims.email,
    roles: extractRoles(claims),
    raw: claims,
  };
};

const extractRoles = (claims) => {
  const rawRoles = claims.roles;
  if (!rawRoles) return [];
  return Array.isArray(rawRoles) ? rawRoles : rawRoles.split(',').map((r) => r.trim());
};

module.exports = { getUserFromEvent };
