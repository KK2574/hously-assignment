require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hously_crm',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  demoResetCode: process.env.DEMO_RESET_CODE || '',
  tzOffsetMinutes: Number(process.env.TZ_OFFSET_MINUTES ?? 330),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

if (!config.jwtSecret) {
  console.error('Missing JWT_SECRET. Copy .env.example to .env and set it.');
  process.exit(1);
}

module.exports = config;
