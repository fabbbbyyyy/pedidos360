const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  },
  body: JSON.stringify(body),
});

const success = (data, statusCode = 200) =>
  buildResponse(statusCode, { success: true, data });

const error = (message, statusCode = 500, details) =>
  buildResponse(statusCode, { success: false, error: message, details });

module.exports = { success, error };
