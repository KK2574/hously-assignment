const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const { requireAuth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
app.use(express.json({ limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const v1 = express.Router();
v1.use('/auth', require('./routes/auth')); // login / register / reset are public; /me etc. guard themselves
v1.use('/dashboard', requireAuth, require('./routes/dashboard'));
v1.use('/properties', requireAuth, require('./routes/properties'));
v1.use('/leads', requireAuth, require('./routes/leads'));
v1.use('/followups', requireAuth, require('./routes/followups'));
v1.use('/visits', requireAuth, require('./routes/visits'));
v1.use('/notifications', requireAuth, require('./routes/notifications'));
app.use('/v1', v1);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
