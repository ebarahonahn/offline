const jwt = require('jsonwebtoken');
const env = require('./env');

const signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

const signRefreshToken = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });

const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? env.jwt.refreshSecret : env.jwt.secret;
  return jwt.verify(token, secret);
};

module.exports = { signAccessToken, signRefreshToken, verifyToken };
