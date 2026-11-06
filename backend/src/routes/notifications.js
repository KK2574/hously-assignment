const router = require('express').Router();
const { Notification } = require('../models');
const { HttpError, asyncHandler, findOrFail, qs } = require('../utils');

router.get('/', asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };
  if (qs(req.query.unread) === 'true') filter.read = false;
  const [data, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(200),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ data, unreadCount });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true });
}));

async function mine(req) {
  const n = await findOrFail(Notification, req.params.id, 'Notification');
  if (String(n.user) !== String(req.user._id)) throw new HttpError(404, 'Notification not found');
  return n;
}

router.patch('/:id', asyncHandler(async (req, res) => {
  const n = await mine(req);
  n.read = req.body?.read ?? true;
  await n.save();
  res.json(n);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const n = await mine(req);
  await n.deleteOne();
  res.json({ success: true });
}));

module.exports = router;
