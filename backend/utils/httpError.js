const { isProduction } = require('../config/security');

const sendOperationalError = (res, error, fallback = 'Request failed') => {
  const status = error.statusCode || 500;
  const message = status >= 500 && isProduction()
    ? 'Internal server error'
    : error.message || fallback;
  return res.status(status).json({ message });
};

module.exports = { sendOperationalError };
