const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

const success = (data, statusCode = 200) =>
  buildResponse(statusCode, { success: true, data });

const error = (message, statusCode = 500, details) =>
  buildResponse(statusCode, { success: false, error: message, details });

module.exports = { success, error };
