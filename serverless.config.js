const LOCAL_ORIGIN = 'http://localhost:5173';
const configuredOrigin = process.env.ALLOWED_ORIGIN?.trim();

module.exports = {
  allowedOrigins: [
    LOCAL_ORIGIN,
    ...(configuredOrigin && configuredOrigin !== LOCAL_ORIGIN
      ? [configuredOrigin]
      : []),
  ],
};