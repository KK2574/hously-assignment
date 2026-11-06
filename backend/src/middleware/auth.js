const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const { HttpError, asyncHandler } = require('../utils');
const { runHousekeeping } = require('../services/helpers');

const signToken = (user) => jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  let payload = null;
  try {
    payload = token ? jwt.verify(token, config.jwtSecret) : null;
  } catch {
    payload = null;
  }
  if (!payload) throw new HttpError(401, 'Session expired. Please sign in again.');
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  req.user = user;
  await runHousekeeping(user).catch((e) => console.error('housekeeping failed', e.message));
  next();
});

module.exports = { signToken, requireAuth };
