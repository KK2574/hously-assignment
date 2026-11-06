const { Activity, Notification, FollowUp, Visit } = require('../models');
const { fmtTime } = require('../utils');

async function addActivity(leadId, kind, title, description) {
  return Activity.create({ leadId, kind, title, description });
}

/** Creates an in-app notification, respecting the user's notification preferences. */
async function notify(user, type, title, message, refId) {
  const prefs = user.preferences || {};
  const allowed = type === 'followup' ? prefs.followUps : type === 'visit' ? prefs.siteVisits : type === 'lead' ? prefs.newLeads : true;
  if (allowed === false) return null;
  return Notification.create({ user: user._id, type, title, message, refId: refId ? String(refId) : undefined });
}

const lastRun = new Map();

/**
 * Turns follow-ups that are a day late into "Missed" and creates reminders for things due soon.
 * Throttled per user so it does not run on every request.
 */
async function runHousekeeping(user) {
  const key = String(user._id);
  const now = Date.now();
  if (now - (lastRun.get(key) ?? 0) < 15_000) return;
  lastRun.set(key, now);

  const late = await FollowUp.find({ status: 'Pending', scheduledAt: { $lt: new Date(now - 24 * 3600_000) } });
  for (const f of late) {
    f.status = 'Missed';
    f.history.push({ action: 'Missed', note: 'Marked missed automatically', at: new Date() });
    await f.save();
  }

  const soon = await FollowUp.find({ status: 'Pending', reminded: false, scheduledAt: { $lt: new Date(now + 2 * 3600_000) } });
  for (const f of soon) {
    f.reminded = true;
    await f.save();
    await notify(user, 'followup', 'Follow-up due soon', `${f.type} ${f.leadName} at ${fmtTime(f.scheduledAt)}.`, f.id);
  }

  const visits = await Visit.find({ status: 'Scheduled', reminded: false, scheduledAt: { $lt: new Date(now + 24 * 3600_000) } });
  for (const v of visits) {
    v.reminded = true;
    await v.save();
    await notify(user, 'visit', 'Site visit coming up', `${v.leadName} — ${v.propertyTitle}.`, v.id);
  }
}

module.exports = { addActivity, notify, runHousekeeping };
