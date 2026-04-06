require('dotenv').config();

const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[ENV] Variable requerida no definida: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  db: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    poolMin:  parseInt(process.env.DB_POOL_MIN) || 2,
    poolMax:  parseInt(process.env.DB_POOL_MAX) || 10,
  },
  jwt: {
    secret:         process.env.JWT_SECRET,
    expiresIn:      process.env.JWT_EXPIRES_IN || '8h',
    refreshSecret:  process.env.JWT_REFRESH_SECRET,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  frontendUrl:   process.env.FRONTEND_URL || 'http://localhost:4200',
  bcryptRounds:  parseInt(process.env.BCRYPT_ROUNDS) || 12,
};
