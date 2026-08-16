const DEVELOPMENT_JWT_SECRET = 'hucems_dev_secret';

const isProduction = () => process.env.NODE_ENV === 'production';

const getJwtSecret = () => process.env.JWT_SECRET || DEVELOPMENT_JWT_SECRET;

const validateSecurityConfig = () => {
  if (!isProduction()) return;
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || secret === DEVELOPMENT_JWT_SECRET || secret === 'change_this_hucems_secret') {
    throw new Error('JWT_SECRET must be a unique value of at least 32 characters in production');
  }
  if (!process.env.CLIENT_URL) {
    throw new Error('CLIENT_URL is required in production');
  }
};

module.exports = { getJwtSecret, isProduction, validateSecurityConfig };
