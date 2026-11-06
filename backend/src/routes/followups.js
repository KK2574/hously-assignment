const router = require('express').Router();
const { FollowUp, Lead } = require('../models');
const { HttpError, asyncHandler, findOrFail, required, qs, dayBounds, fmtDateTime, isValidDate } = require('../utils');
const { addActivity } = require('../services/helpers');

/** Adds live leadName / leadMobile to follow-ups (the stored name is only a fallback snapshot). */
async function present(items) {
  const list = Array.isArray(items) ? items : [items];
  const ids = [...new Set(list.map((f) => String(f.leadId)))];
  const leads = await Lead.find({ _id: { $in: ids } }).select('name mobile');
  const byId = new Map(leads.map((l) => [String(l._id), l]));
  const out = list.map((f) => {
    const l = byId.get(String(f.leadId));
    return { ...f.toJSON(), leadName: l?.name ?? f.leadName, leadMobile: l?.mobile };
  });
  return Array.isArray(items) ? out : out[0];
}

router.get('/', asyncHandler(async (req, res) => {
  const view = qs(req.query.view) || 'all';
  const { start, end } = dayBounds();
  const now = new Date();
  const filter = {};
  if (qs(req.query.leadId)) filter.leadId = qs(req.query.leadId);
  if (qs(req.query.status)) filter.status = qs(req.query.status);

  if (view === 'today') {
    Object.assign(filter, { status: 'Pending', scheduledAt: { $gte: start, $lt: end } });
  } else if (view === 'upcoming') {
    Object.assign(filter, { status: 'Pending', scheduledAt: { $gte: end } });
  } else if (view === 'overdue') {
    filter.$and = [
      { $or: [{ status: 'Missed' }, { status: 'Pending', scheduledAt: { $lt: now } }] },
      { $or: [{ scheduledAt: { $lt: start } }, { scheduledAt: { $gte: end } }] },
    ];
  }
  const dir = view === 'today' || view === 'upcoming' ? 1 : -1;
  res.json(await present(await FollowUp.find(filter).sort({ scheduledAt: dir })));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await present(await findOrFail(FollowUp, req.params.id, 'Follow-up')));
}));

router.post('/', asyncHandler(async (req, res) => {
  required(req.body, ['leadId', 'type', 'scheduledAt']);
  const lead = await findOrFail(Lead, req.body.leadId, 'Lead');
  if (!isValidDate(req.body.scheduledAt)) throw new HttpError(422, 'scheduledAt is not a valid date');
  const f = await FollowUp.create({
    leadId: lead._id,
    leadName: lead.name,
    type: req.body.type,
    scheduledAt: req.body.scheduledAt,
    remarks: req.body.remarks ?? '',
    history: [{ action: 'Scheduled', note: req.body.remarks || 'Follow-up scheduled', at: new Date() }],
  });
  await addActivity(lead._id, 'followup_scheduled', 'Follow-up scheduled', `${f.type} — ${fmtDateTime(f.scheduledAt)}`);
  res.status(201).json(await present(f));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const f = await findOrFail(FollowUp, req.params.id, 'Follow-up');
  const b = req.body ?? {};
  if (b.type) f.type = b.type;
  if (b.remarks !== undefined) f.remarks = b.remarks;
  if (b.scheduledAt && new Date(b.scheduledAt).getTime() !== f.scheduledAt.getTime()) {
    if (!isValidDate(b.scheduledAt)) throw new HttpError(422, 'scheduledAt is not a valid date');
    f.history.push({ action: 'Rescheduled', note: `Moved from ${fmtDateTime(f.scheduledAt)}`, at: new Date() });
    f.scheduledAt = b.scheduledAt;
    f.status = 'Pending';
    f.reminded = false;
  } else {
    f.history.push({ action: 'Updated', note: 'Details edited', at: new Date() });
  }
  await f.save();
  res.json(await present(f));
}));

router.post('/:id/complete', asyncHandler(async (req, res) => {
  const f = await findOrFail(FollowUp, req.params.id, 'Follow-up');
  if (f.status === 'Completed') throw new HttpError(409, 'This follow-up is already completed');
  const note = req.body?.note ? String(req.body.note) : 'Marked as completed';
  f.status = 'Completed';
  f.completedAt = new Date();
  f.history.push({ action: 'Completed', note, at: new Date() });
  await f.save();
  await addActivity(f.leadId, 'followup_completed', 'Follow-up completed', `${f.type} — ${note}`);
  res.json(await present(f));
}));

router.post('/:id/reschedule', asyncHandler(async (req, res) => {
  const f = await findOrFail(FollowUp, req.params.id, 'Follow-up');
  required(req.body, ['scheduledAt']);
  if (!isValidDate(req.body.scheduledAt)) throw new HttpError(422, 'scheduledAt is not a valid date');
  const extra = req.body.note ? ` · ${req.body.note}` : '';
  f.history.push({
    action: 'Rescheduled',
    note: `${fmtDateTime(f.scheduledAt)} → ${fmtDateTime(req.body.scheduledAt)}${extra}`,
    at: new Date(),
  });
  f.scheduledAt = req.body.scheduledAt;
  f.status = 'Pending';
  f.completedAt = null;
  f.reminded = false;
  await f.save();
  await addActivity(f.leadId, 'followup_rescheduled', 'Follow-up rescheduled', `${f.type} — ${fmtDateTime(f.scheduledAt)}`);
  res.json(await present(f));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const f = await findOrFail(FollowUp, req.params.id, 'Follow-up');
  await f.deleteOne();
  res.json({ success: true });
}));

module.exports = router;
