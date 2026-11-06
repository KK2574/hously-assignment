const config = require('./config');
const { connectDb } = require('./db');
const app = require('./app');

connectDb()
  .then(() => app.listen(config.port, '0.0.0.0', () => console.log(`Hously API listening on port ${config.port}`)))
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
