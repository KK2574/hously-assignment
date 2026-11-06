const router = require('express').Router();
const { Visit, Lead, Property } = require('../models');
const { HttpError, asyncHandler, findOrFail, required, qs, isValidDate } = require('../utils');
const { addActivity, notify } = require('../services/helpers');

const HOUR = 3600_000;
const OPEN = ['Scheduled', 'Rescheduled'];

/** Adds live lead / property details (stored values are only a fallback snapshot). */
async function present(items) {
  const list = Array.isArray(items) ? items : [items];
  const [leads, props] = await Promise.all([
    Lead.find({ _id: { $in: [...new Set(list.map((v) => String(v.leadId)))] } }).select('name mobile'),
    Property.find({ _id: { $in: [...new Set(list.map((v) => String(v.propertyId)))] } }).select('title location'),
  ]);
  const L = new Map(leads.map((l) => [String(l._id), l]));
  const P = new Map(props.map((p) => [String(p._id), p]));
  const out = list.map((v) => {
    const l = L.get(String(v.leadId));
    const p = P.get(String(v.propertyId));
    return {
      ...v.toJSON(),
      leadName: l?.name ?? v.leadName,
      leadMobile: l?.mobile,
      propertyTitle: p?.title ?? v.propertyTitle,
      propertyLocation: p?.location ?? v.propertyLocation,
    };
  });
  return Array.isArray(items) ? out : out[0];
}

router.get('/', asyncHandler(async (req, res) => {
  const scope = qs(req.query.scope) || 'all';
  const filter = {};
  for (const k of ['leadId', 'propertyId', 'status']) if (qs(req.query[k])) filter[k] = qs(req.query[k]);
  const cutoff = new Date(Date.now() - HOUR);
  if (scope === 'upcoming') {
    Object.assign(filter, { status: filter.status && OPEN.includes(filter.status) ? filter.status : { $in: OPEN }, scheduledAt: { $gte: cutoff } });
  } else if (scope === 'past') {
    filter.$and = [...(filter.$and ?? []), { $or: [{ status: { $nin: OPEN } }, { scheduledAt: { $lt: cutoff } }] }];
  }
  const dir = scope === 'upcoming' ? 1 : -1;
  res.json(await present(await Visit.find(filter).sort({ scheduledAt: dir })));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await present(await findOrFail(Visit, req.params.id, 'Site visit')));
}));

router.post('/', asyncHandler(async (req, res) => {
  required(req.body, ['leadId', 'propertyId', 'scheduledAt']);
  const lead = await findOrFail(Lead, req.body.leadId, 'Lead');
  const prop = await findOrFail(Property, req.body.propertyId, 'Property');
  if (!isValidDate(req.body.scheduledAt)) throw new HttpError(422, 'scheduledAt is not a valid date');
  const when = new Date(req.body.scheduledAt).getTime();

  const clash = await Visit.findOne({
    propertyId: prop._id,
    status: 'Scheduled',
    scheduledAt: { $gt: new Date(when - HOUR), $lt: new Date(when + HOUR) },
  });
  if (clash) throw new HttpError(409, `This property already has a visit scheduled around that time (${clash.leadName})`);

  const v = await Visit.create({
    leadId: lead._id,
    propertyId: prop._id,
    leadName: lead.name,
    propertyTitle: prop.title,
    propertyLocation: prop.location,
    scheduledAt: req.body.scheduledAt,
    remarks: req.body.remarks ?? '',
  });

  if (['New', 'Contacted', 'Interested'].includes(lead.stage)) {
    const prev = lead.stage;
    lead.stage = 'Site Visit Scheduled';
    await lead.save();
    await addActivity(lead._id, 'stage_changed', 'Stage changed', `${prev} → ${lead.stage}`);
  }
  await addActivity(lead._id, 'visit_scheduled', 'Site visit scheduled', prop.title);
  await notify(req.user, 'visit', 'Site visit scheduled', `${lead.name} — ${prop.title}.`, v.id);
  res.status(201).json(await present(v));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const v = await findOrFail(Visit, req.params.id, 'Site visit');
  const b = req.body ?? {};
  if (b.scheduledAt && new Date(b.scheduledAt).getTime() !== v.scheduledAt.getTime()) {
    if (!isValidDate(b.scheduledAt)) throw new HttpError(422, 'scheduledAt is not a valid date');
    const when = new Date(b.scheduledAt).getTime();
    const clash = await Visit.findOne({
      _id: { $ne: v._id },
      propertyId: v.propertyId,
      status: { $in: OPEN },
      scheduledAt: { $gt: new Date(when - HOUR), $lt: new Date(when + HOUR) },
    });
    if (clash) throw new HttpError(409, `This property already has a visit scheduled around that time (${clash.leadName})`);
    v.scheduledAt = b.scheduledAt;
    v.status = b.status && b.status !== 'Scheduled' ? b.status : 'Rescheduled';
    v.reminded = false;
  } else if (b.status) {
    v.status = b.status;
  }
  if (b.feedback !== undefined) v.feedback = b.feedback;
  if (b.remarks !== undefined) v.remarks = b.remarks;
  await v.save();
  await addActivity(v.leadId, 'visit_updated', `Site visit ${v.status.toLowerCase()}`, v.propertyTitle);
  res.json(await present(v));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const v = await findOrFail(Visit, req.params.id, 'Site visit');
  await v.deleteOne();
  res.json({ success: true });
}));

module.exports = router;
