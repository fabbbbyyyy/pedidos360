const log = (level, message, meta = {}) => {
  console.log(
    JSON.stringify({
      level,
      message,
      ...meta,
      timestamp: new Date().toISOString(),
    })
  );
};

module.exports = {
  info: (message, meta) => log('INFO', message, meta),
  warn: (message, meta) => log('WARN', message, meta),
  error: (message, meta) => log('ERROR', message, meta),
};
