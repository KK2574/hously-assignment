const router = require('express').Router();
const { Lead, Activity, FollowUp, Visit } = require('../models');
const { LEAD_STAGES } = require('../constants');
const { HttpError, asyncHandler, findOrFail, required, pick, qs, escapeRegex, paginate } = require('../utils');
const { addActivity, notify } = require('../services/helpers');

const FIELDS = ['name', 'mobile', 'email', 'source', 'assignedTo', 'priority', 'stage', 'remarks'];
const MOBILE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(b) {
  required(b, ['name', 'mobile', 'source', 'stage', 'priority', 'assignedTo']);
  if (String(b.name).trim().length < 2) throw new HttpError(422, 'name must be at least 2 characters');
  if (!MOBILE_RE.test(String(b.mobile).trim())) throw new HttpError(422, 'mobile must be a valid 10-digit Indian number');
  if (b.email && !EMAIL_RE.test(String(b.email).trim())) throw new HttpError(422, 'email is not valid');
  if (!LEAD_STAGES.includes(b.stage)) throw new HttpError(422, 'Invalid stage');
}

router.get('/', asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = {};
  const search = qs(q.search)?.trim();
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: re }, { mobile: re }, { email: re }];
  }
  for (const k of ['stage', 'source', 'priority', 'assignedTo']) if (qs(q[k])) filter[k] = qs(q[k]);
  res.json(await paginate(Lead, filter, { createdAt: -1 }, q));
}));

// Simulated incoming enquiry (assignment section 2.8). Not something a production CRM would expose.
const SIM_NAMES = ['Kunal Deshmukh', 'Meera Iyer', 'Vikram Patil', 'Anjali Rao', 'Sameer Khan', 'Nisha Verma'];
router.post('/simulate', asyncHandler(async (req, res) => {
  const name = SIM_NAMES[Math.floor(Math.random() * SIM_NAMES.length)];
  const source = ['Website', 'Facebook', 'Referral'][Math.floor(Math.random() * 3)];
  const lead = await Lead.create({
    name,
    mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
    email: '',
    source,
    assignedTo: req.user.name,
    priority: 'Medium',
    stage: 'New',
    remarks: 'Auto-generated enquiry (simulated).',
  });
  await addActivity(lead._id, 'lead_created', 'New enquiry received', `Source: ${source} (simulated)`);
  await notify(req.user, 'lead', 'New lead received', `${name} enquired via ${source}.`, lead.id);
  res.status(201).json(lead);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await findOrFail(Lead, req.params.id, 'Lead'));
}));

router.post('/', asyncHandler(async (req, res) => {
  validate(req.body);
  const data = pick(req.body, FIELDS);
  data.email = data.email ?? '';
  const lead = await Lead.create(data);
  await addActivity(lead._id, 'lead_created', 'Lead created', `Source: ${lead.source}`);
  await notify(req.user, 'lead', 'New lead added', `${lead.name} (${lead.source}) was added.`, lead.id);
  res.status(201).json(lead);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const lead = await findOrFail(Lead, req.params.id, 'Lead');
  const changes = pick(req.body, FIELDS);
  validate({ ...lead.toJSON(), ...changes });
  const prev = lead.stage;
  lead.set(changes);
  await lead.save();
  if (prev !== lead.stage) await addActivity(lead._id, 'stage_changed', 'Stage changed', `${prev} → ${lead.stage}`);
  else await addActivity(lead._id, 'lead_updated', 'Lead details updated');
  res.json(lead);
}));

router.patch('/:id/stage', asyncHandler(async (req, res) => {
  const lead = await findOrFail(Lead, req.params.id, 'Lead');
  required(req.body, ['stage']);
  if (!LEAD_STAGES.includes(req.body.stage)) throw new HttpError(422, 'Invalid stage');
  const prev = lead.stage;
  lead.stage = req.body.stage;
  await lead.save();
  if (prev !== lead.stage) await addActivity(lead._id, 'stage_changed', 'Stage changed', `${prev} → ${lead.stage}`);
  res.json(lead);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const lead = await findOrFail(Lead, req.params.id, 'Lead');
  await Promise.all([
    FollowUp.deleteMany({ leadId: lead._id }),
    Visit.deleteMany({ leadId: lead._id }),
    Activity.deleteMany({ leadId: lead._id }),
  ]);
  await lead.deleteOne();
  res.json({ success: true });
}));

router.get('/:id/activities', asyncHandler(async (req, res) => {
  const lead = await findOrFail(Lead, req.params.id, 'Lead');
  res.json(await Activity.find({ leadId: lead._id }).sort({ createdAt: -1 }));
}));

router.post('/:id/notes', asyncHandler(async (req, res) => {
  const lead = await findOrFail(Lead, req.params.id, 'Lead');
  required(req.body, ['note']);
  res.status(201).json(await addActivity(lead._id, 'note', 'Note added', String(req.body.note).trim()));
}));

module.exports = router;
