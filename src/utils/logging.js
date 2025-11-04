function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta
  };
  
  console.log(JSON.stringify(logEntry));
}

function info(message, meta = {}) {
  log('info', message, meta);
}

function error(message, meta = {}) {
  log('error', message, meta);
}

function warn(message, meta = {}) {
  log('warn', message, meta);
}

function debug(message, meta = {}) {
  if (process.env.NODE_ENV === 'development') {
    log('debug', message, meta);
  }
}

module.exports = {
  info,
  error,
  warn,
  debug
};