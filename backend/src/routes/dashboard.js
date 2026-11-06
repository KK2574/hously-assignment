const router = require('express').Router();
const { Property, Lead, Activity, FollowUp, Visit, Notification } = require('../models');
const { LEAD_STAGES, CLOSED_STAGES } = require('../constants');
const { asyncHandler, dayBounds } = require('../utils');

router.get('/', asyncHandler(async (req, res) => {
  const { start, end } = dayBounds();
  const [properties, leads, byStage, followUpsToday, upcomingVisits, unread, activities] = await Promise.all([
    Property.countDocuments(),
    Lead.countDocuments(),
    Lead.aggregate([{ $group: { _id: '$stage', count: { $sum: 1 } } }]),
    FollowUp.countDocuments({ status: 'Pending', scheduledAt: { $gte: start, $lt: end } }),
    Visit.countDocuments({ status: { $in: ['Scheduled', 'Rescheduled'] }, scheduledAt: { $gte: new Date() } }),
    Notification.countDocuments({ user: req.user._id, read: false }),
    Activity.find().sort({ createdAt: -1 }).limit(8),
  ]);

  const counts = Object.fromEntries(byStage.map((s) => [s._id, s.count]));
  const leadsByStage = LEAD_STAGES.map((stage) => ({ stage, count: counts[stage] ?? 0 }));
  const closedCount = CLOSED_STAGES.reduce((n, s) => n + (counts[s] ?? 0), 0);

  const leadDocs = await Lead.find({ _id: { $in: activities.map((a) => a.leadId) } }).select('name');
  const names = new Map(leadDocs.map((l) => [String(l._id), l.name]));

  res.json({
    totals: {
      properties,
      leads,
      activeLeads: leads - closedCount,
      followUpsToday,
      closedDeals: counts.Converted ?? 0,
      upcomingVisits,
      unreadNotifications: unread,
    },
    leadsByStage,
    recentActivity: activities.map((a) => ({ ...a.toJSON(), leadName: names.get(String(a.leadId)) })),
  });
}));

module.exports = router;
