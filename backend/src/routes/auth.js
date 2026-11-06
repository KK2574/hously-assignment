const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const config = require('../config');
const { User } = require('../models');
const { HttpError, asyncHandler, required } = require('../utils');
const { signToken, requireAuth } = require('../middleware/auth');

const normEmail = (v) => String(v).trim().toLowerCase();

router.post('/login', asyncHandler(async (req, res) => {
  required(req.body, ['email', 'password']);
  const user = await User.findOne({ email: normEmail(req.body.email) });
  const ok = user && (await bcrypt.compare(String(req.body.password), user.password));
  if (!ok) throw new HttpError(401, 'Invalid email or password');
  res.json({ token: signToken(user), user });
}));

router.post('/register', asyncHandler(async (req, res) => {
  required(req.body, ['name', 'email', 'phone', 'password']);
  if (String(req.body.password).length < 6) throw new HttpError(422, 'Password must be at least 6 characters');
  const email = normEmail(req.body.email);
  if (await User.exists({ email })) throw new HttpError(409, 'An account with this email already exists');
  const user = await User.create({
    name: String(req.body.name).trim(),
    email,
    phone: String(req.body.phone).trim(),
    password: await bcrypt.hash(String(req.body.password), 10),
  });
  res.status(201).json({ token: signToken(user), user });
}));

router.post('/forgot-password', asyncHandler(async (req, res) => {
  required(req.body, ['email']);
  const user = await User.findOne({ email: normEmail(req.body.email) });
  const code = config.demoResetCode || String(crypto.randomInt(100000, 1000000));
  if (user) {
    user.resetCodeHash = await bcrypt.hash(code, 8);
    user.resetCodeExpires = new Date(Date.now() + 10 * 60_000);
    await user.save();
    // No email service is wired up: without DEMO_RESET_CODE the code is only printed to the server log.
    if (!config.demoResetCode) console.log(`[reset code] ${user.email}: ${code}`);
  }
  // Same response whether or not the account exists, so account existence is not leaked.
  const body = { message: 'If this email is registered, a 6-digit reset code has been sent.' };
  if (config.demoResetCode) body.devHint = `Demo code: ${config.demoResetCode}`;
  res.json(body);
}));

router.post('/reset-password', asyncHandler(async (req, res) => {
  required(req.body, ['email', 'otp', 'newPassword']);
  const user = await User.findOne({ email: normEmail(req.body.email) });
  const valid =
    user && user.resetCodeHash && user.resetCodeExpires > new Date() && (await bcrypt.compare(String(req.body.otp), user.resetCodeHash));
  if (!valid) throw new HttpError(400, 'Invalid or expired reset code');
  if (String(req.body.newPassword).length < 6) throw new HttpError(422, 'Password must be at least 6 characters');
  user.password = await bcrypt.hash(String(req.body.newPassword), 10);
  user.resetCodeHash = undefined;
  user.resetCodeExpires = undefined;
  await user.save();
  res.json({ message: 'Password updated. You can now sign in.' });
}));

router.get('/me', requireAuth, (req, res) => res.json(req.user));

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const b = req.body ?? {};
  const user = req.user;
  if (b.name !== undefined) {
    if (String(b.name).trim().length < 2) throw new HttpError(422, 'Name must be at least 2 characters');
    user.name = String(b.name).trim();
  }
  if (b.phone !== undefined) user.phone = String(b.phone).trim();
  if (b.avatarUrl !== undefined) user.avatarUrl = b.avatarUrl;
  if (b.preferences && typeof b.preferences === 'object') {
    for (const k of ['followUps', 'siteVisits', 'newLeads']) {
      if (typeof b.preferences[k] === 'boolean') user.set(`preferences.${k}`, b.preferences[k]);
    }
  }
  await user.save();
  res.json(user);
}));

router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  required(req.body, ['currentPassword', 'newPassword']);
  if (!(await bcrypt.compare(String(req.body.currentPassword), req.user.password))) {
    throw new HttpError(400, 'Current password is incorrect');
  }
  if (String(req.body.newPassword).length < 6) throw new HttpError(422, 'Password must be at least 6 characters');
  req.user.password = await bcrypt.hash(String(req.body.newPassword), 10);
  await req.user.save();
  res.json({ message: 'Password changed successfully' });
}));

module.exports = router;
