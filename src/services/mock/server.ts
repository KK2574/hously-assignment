import type {
  Activity,
  ActivityKind,
  AppNotification,
  DashboardSummary,
  FollowUp,
  FollowUpHistoryAction,
  Lead,
  Paginated,
  Property,
  SiteVisit,
  User,
} from '@/types';
import { CLOSED_STAGES, LEAD_STAGES } from '@/constants';
import { signToken, verifyToken } from '@/utils/jwt';

import { loadDb, saveDb, uid } from './db';
import type { Db, DbUser } from './seed';

// A tiny in-process REST server. Every route below mirrors the endpoint list in the README,
// so swapping in a real backend only requires setting EXPO_PUBLIC_API_URL.

export interface MockRequest {
  method: string;
  path: string; // without base url, e.g. /leads/l1
  query: Record<string, string>;
  body: any;
  token: string | null;
}

export interface MockResponse {
  status: number;
  data: any;
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const ok = (data: any, status = 200): MockResponse => ({ status, data });

const OTP_CODE = '123456';
const otpRequests = new Map<string, number>(); // email -> expiry timestamp

const publicUser = (u: DbUser): User => {
  const { password: _pw, ...rest } = u;
  return rest;
};

function paginate<T>(items: T[], query: Record<string, string>): Paginated<T> {
  const page = Math.max(parseInt(query.page ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit ?? '20', 10) || 20, 1), 100);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: { page, limit, total, totalPages, hasMore: page < totalPages },
  };
}

function addActivity(db: Db, leadId: string, kind: ActivityKind, title: string, description?: string) {
  db.activities.unshift({ id: uid('a'), leadId, kind, title, description, createdAt: new Date().toISOString() });
}

function notify(db: Db, user: DbUser, type: AppNotification['type'], title: string, message: string, refId?: string) {
  const pref =
    type === 'followup' ? user.preferences.followUps : type === 'visit' ? user.preferences.siteVisits : type === 'lead' ? user.preferences.newLeads : true;
  if (!pref) return;
  db.notifications.unshift({ id: uid('n'), type, title, message, read: false, refId, createdAt: new Date().toISOString() });
}

function need<T>(value: T | undefined, label: string): T {
  if (!value) throw new HttpError(404, `${label} not found`);
  return value;
}

function required(body: any, fields: string[]) {
  for (const f of fields) {
    if (body?.[f] === undefined || body?.[f] === null || body?.[f] === '') {
      throw new HttpError(422, `${f} is required`);
    }
  }
}

/** Copies only the allowed keys, so a client can never overwrite id / createdAt etc. */
function pick<T extends object>(body: any, keys: readonly (keyof T)[]): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) if (body?.[k] !== undefined) out[k] = body[k];
  return out;
}

const LEAD_FIELDS = ['name', 'mobile', 'email', 'source', 'assignedTo', 'priority', 'stage', 'remarks'] as const;
const PROPERTY_FIELDS = ['title', 'type', 'listingType', 'location', 'price', 'bhk', 'area', 'description', 'status', 'images', 'featured'] as const;
const MOBILE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const matches = (text: string, q?: string) => !q || text.toLowerCase().includes(q.trim().toLowerCase());

function withLead(db: Db, f: FollowUp): FollowUp {
  const lead = db.leads.find((l) => l.id === f.leadId);
  return { ...f, leadName: lead?.name ?? f.leadName, leadMobile: lead?.mobile ?? f.leadMobile };
}

function withVisitRefs(db: Db, v: SiteVisit): SiteVisit {
  const lead = db.leads.find((l) => l.id === v.leadId);
  const prop = db.properties.find((p) => p.id === v.propertyId);
  return {
    ...v,
    leadName: lead?.name ?? v.leadName,
    leadMobile: lead?.mobile ?? v.leadMobile,
    propertyTitle: prop?.title ?? v.propertyTitle,
    propertyLocation: prop?.location ?? v.propertyLocation,
  };
}

const isOverdue = (f: FollowUp) => f.status === 'Missed' || (f.status === 'Pending' && new Date(f.scheduledAt).getTime() < Date.now());

function isTodayIso(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/** Turns pending follow-ups that are a full day late into "Missed", and creates due reminders. */
function runHousekeeping(db: Db, user: DbUser) {
  const now = Date.now();
  let changed = false;
  for (const f of db.followUps) {
    if (f.status === 'Pending' && new Date(f.scheduledAt).getTime() < now - 24 * 3600_000) {
      f.status = 'Missed';
      f.history.push({ id: uid('h'), action: 'Missed', note: 'Marked missed automatically', at: new Date().toISOString() });
      changed = true;
    }
    if (f.status === 'Pending' && !f.reminded && new Date(f.scheduledAt).getTime() - now < 2 * 3600_000) {
      f.reminded = true;
      notify(db, user, 'followup', 'Follow-up due soon', `${f.type} ${f.leadName} at ${new Date(f.scheduledAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}.`, f.id);
      changed = true;
    }
  }
  for (const v of db.visits) {
    if (v.status === 'Scheduled' && !v.reminded && new Date(v.scheduledAt).getTime() - now < 24 * 3600_000) {
      v.reminded = true;
      notify(db, user, 'visit', 'Site visit coming up', `${v.leadName} — ${v.propertyTitle}.`, v.id);
      changed = true;
    }
  }
  return changed;
}

type Handler = (ctx: { db: Db; user: DbUser | null; params: string[]; req: MockRequest }) => MockResponse | Promise<MockResponse>;

interface Route {
  method: string;
  pattern: RegExp;
  auth: boolean;
  handler: Handler;
}

const routes: Route[] = [];
function route(method: string, path: string, auth: boolean, handler: Handler) {
  const pattern = new RegExp('^' + path.replace(/:[a-zA-Z]+/g, '([^/]+)') + '/?$');
  routes.push({ method, pattern, auth, handler });
}

// ---------------------------------------------------------------- AUTH
route('POST', '/auth/login', false, ({ db, req }) => {
  required(req.body, ['email', 'password']);
  const user = db.users.find((u) => u.email.toLowerCase() === String(req.body.email).trim().toLowerCase());
  if (!user || user.password !== req.body.password) throw new HttpError(401, 'Invalid email or password');
  return ok({ token: signToken(user.id), user: publicUser(user) });
});

route('POST', '/auth/register', false, ({ db, req }) => {
  required(req.body, ['name', 'email', 'phone', 'password']);
  const email = String(req.body.email).trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === email)) throw new HttpError(409, 'An account with this email already exists');
  if (String(req.body.password).length < 6) throw new HttpError(422, 'Password must be at least 6 characters');
  const user: DbUser = {
    id: uid('u'),
    name: String(req.body.name).trim(),
    email,
    phone: String(req.body.phone).trim(),
    password: req.body.password,
    role: 'Sales Executive',
    avatarUrl: null,
    preferences: { followUps: true, siteVisits: true, newLeads: true },
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  return ok({ token: signToken(user.id), user: publicUser(user) }, 201);
});

route('POST', '/auth/forgot-password', false, ({ db, req }) => {
  required(req.body, ['email']);
  const email = String(req.body.email).trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === email);
  // Same response either way so account existence is not leaked.
  if (user) otpRequests.set(email, Date.now() + 10 * 60_000);
  return ok({ message: 'If this email is registered, a 6-digit reset code has been sent.', devHint: `Demo code: ${OTP_CODE}` });
});

route('POST', '/auth/reset-password', false, ({ db, req }) => {
  required(req.body, ['email', 'otp', 'newPassword']);
  const email = String(req.body.email).trim().toLowerCase();
  const expiry = otpRequests.get(email);
  if (!expiry || expiry < Date.now() || req.body.otp !== OTP_CODE) throw new HttpError(400, 'Invalid or expired reset code');
  if (String(req.body.newPassword).length < 6) throw new HttpError(422, 'Password must be at least 6 characters');
  const user = need(db.users.find((u) => u.email.toLowerCase() === email), 'User');
  user.password = req.body.newPassword;
  otpRequests.delete(email);
  return ok({ message: 'Password updated. You can now sign in.' });
});

route('GET', '/auth/me', true, ({ user }) => ok(publicUser(user!)));

route('PATCH', '/auth/me', true, ({ user, req }) => {
  const b = req.body ?? {};
  if (b.name !== undefined) {
    if (String(b.name).trim().length < 2) throw new HttpError(422, 'Name must be at least 2 characters');
    user!.name = String(b.name).trim();
  }
  if (b.phone !== undefined) user!.phone = String(b.phone).trim();
  if (b.avatarUrl !== undefined) user!.avatarUrl = b.avatarUrl;
  if (b.preferences) user!.preferences = { ...user!.preferences, ...b.preferences };
  return ok(publicUser(user!));
});

route('POST', '/auth/change-password', true, ({ user, req }) => {
  required(req.body, ['currentPassword', 'newPassword']);
  if (user!.password !== req.body.currentPassword) throw new HttpError(400, 'Current password is incorrect');
  if (String(req.body.newPassword).length < 6) throw new HttpError(422, 'Password must be at least 6 characters');
  user!.password = req.body.newPassword;
  return ok({ message: 'Password changed successfully' });
});

// ---------------------------------------------------------------- DASHBOARD
route('GET', '/dashboard', true, ({ db }) => {
  const closed: string[] = [...CLOSED_STAGES];
  const leadsByStage = LEAD_STAGES.map((stage) => ({ stage, count: db.leads.filter((l) => l.stage === stage).length }));
  const summary: DashboardSummary = {
    totals: {
      properties: db.properties.length,
      leads: db.leads.length,
      activeLeads: db.leads.filter((l) => !closed.includes(l.stage)).length,
      followUpsToday: db.followUps.filter((f) => f.status === 'Pending' && isTodayIso(f.scheduledAt)).length,
      closedDeals: db.leads.filter((l) => l.stage === 'Converted').length,
      upcomingVisits: db.visits.filter((v) => (v.status === 'Scheduled' || v.status === 'Rescheduled') && new Date(v.scheduledAt).getTime() >= Date.now()).length,
      unreadNotifications: db.notifications.filter((n) => !n.read).length,
    },
    leadsByStage,
    recentActivity: db.activities.slice(0, 8).map((a): Activity => ({ ...a, leadName: db.leads.find((l) => l.id === a.leadId)?.name })),
  };
  return ok(summary);
});

// ---------------------------------------------------------------- PROPERTIES
route('GET', '/properties', true, ({ db, req }) => {
  const q = req.query;
  let items = db.properties.filter((p) => {
    if (q.search && !(matches(p.title, q.search) || matches(p.location, q.search))) return false;
    if (q.type && p.type !== q.type) return false;
    if (q.listingType && p.listingType !== q.listingType) return false;
    if (q.status && p.status !== q.status) return false;
    if (q.featured === 'true' && !p.featured) return false;
    if (q.bhk) {
      const n = Number(q.bhk);
      if (p.bhk === null) return false;
      if (n >= 4 ? p.bhk < 4 : p.bhk !== n) return false;
    }
    if (q.minPrice && p.price < Number(q.minPrice)) return false;
    if (q.maxPrice && p.price > Number(q.maxPrice)) return false;
    return true;
  });
  items = items.sort((a, b) => Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt));
  return ok(paginate(items, q));
});

route('GET', '/properties/:id', true, ({ db, params }) => ok(need(db.properties.find((p) => p.id === params[0]), 'Property')));

function validateProperty(b: any) {
  required(b, ['title', 'type', 'listingType', 'location', 'price', 'area', 'status']);
  if (!(Number(b.price) > 0)) throw new HttpError(422, 'price must be greater than 0');
  if (!(Number(b.area) > 0)) throw new HttpError(422, 'area must be greater than 0');
}

route('POST', '/properties', true, ({ db, req }) => {
  validateProperty(req.body);
  const now = new Date().toISOString();
  const b = req.body;
  const p: Property = {
    id: uid('p'),
    title: b.title,
    type: b.type,
    listingType: b.listingType,
    location: b.location,
    price: Number(b.price),
    bhk: b.bhk ? Number(b.bhk) : null,
    area: Number(b.area),
    description: b.description ?? '',
    status: b.status,
    images: Array.isArray(b.images) ? b.images : [],
    featured: !!b.featured,
    createdAt: now,
    updatedAt: now,
  };
  db.properties.unshift(p);
  return ok(p, 201);
});

route('PUT', '/properties/:id', true, ({ db, params, req }) => {
  const p = need(db.properties.find((x) => x.id === params[0]), 'Property');
  const changes = pick<Property>(req.body, PROPERTY_FIELDS);
  validateProperty({ ...p, ...changes });
  Object.assign(p, changes, {
    price: Number(req.body.price ?? p.price),
    area: Number(req.body.area ?? p.area),
    bhk: req.body.bhk === undefined ? p.bhk : req.body.bhk ? Number(req.body.bhk) : null,
    updatedAt: new Date().toISOString(),
  });
  return ok(p);
});

route('DELETE', '/properties/:id', true, ({ db, params }) => {
  const idx = db.properties.findIndex((p) => p.id === params[0]);
  if (idx < 0) throw new HttpError(404, 'Property not found');
  if (db.visits.some((v) => v.propertyId === params[0] && (v.status === 'Scheduled' || v.status === 'Rescheduled'))) {
    throw new HttpError(409, 'Cancel the scheduled site visits for this property before deleting it');
  }
  db.properties.splice(idx, 1);
  return ok({ success: true });
});

// ---------------------------------------------------------------- LEADS
route('GET', '/leads', true, ({ db, req }) => {
  const q = req.query;
  const items = db.leads
    .filter((l) => {
      if (q.search && !(matches(l.name, q.search) || matches(l.mobile, q.search) || matches(l.email, q.search))) return false;
      if (q.stage && l.stage !== q.stage) return false;
      if (q.source && l.source !== q.source) return false;
      if (q.priority && l.priority !== q.priority) return false;
      if (q.assignedTo && l.assignedTo !== q.assignedTo) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok(paginate(items, q));
});

// Simulated incoming lead (spec 2.8): the app calls this on a timer / from a button to mimic a
// website or Facebook enquiry arriving. NOT part of a real backend.
const SIM_NAMES = ['Kunal Deshmukh', 'Meera Iyer', 'Vikram Patil', 'Anjali Rao', 'Sameer Khan', 'Nisha Verma'];
route('POST', '/leads/simulate', true, ({ db, user }) => {
  const name = SIM_NAMES[Math.floor(Math.random() * SIM_NAMES.length)];
  const source = (['Website', 'Facebook', 'Referral'] as const)[Math.floor(Math.random() * 3)];
  const now = new Date().toISOString();
  const lead: Lead = {
    id: uid('l'),
    name,
    mobile: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
    email: '',
    source,
    assignedTo: user!.name,
    priority: 'Medium',
    stage: 'New',
    remarks: 'Auto-generated enquiry (simulated).',
    createdAt: now,
    updatedAt: now,
  };
  db.leads.unshift(lead);
  addActivity(db, lead.id, 'lead_created', 'New enquiry received', `Source: ${source} (simulated)`);
  notify(db, user!, 'lead', 'New lead received', `${name} enquired via ${source}.`, lead.id);
  return ok(lead, 201);
});

route('GET', '/leads/:id', true, ({ db, params }) => ok(need(db.leads.find((l) => l.id === params[0]), 'Lead')));

function validateLead(b: any) {
  required(b, ['name', 'mobile', 'source', 'stage', 'priority', 'assignedTo']);
  if (String(b.name).trim().length < 2) throw new HttpError(422, 'name must be at least 2 characters');
  if (!MOBILE_RE.test(String(b.mobile).trim())) throw new HttpError(422, 'mobile must be a valid 10-digit Indian number');
  if (b.email && !EMAIL_RE.test(String(b.email).trim())) throw new HttpError(422, 'email is not valid');
  if (!(LEAD_STAGES as readonly string[]).includes(b.stage)) throw new HttpError(422, 'Invalid stage');
}

route('POST', '/leads', true, ({ db, user, req }) => {
  validateLead(req.body);
  const now = new Date().toISOString();
  const b = req.body;
  const lead: Lead = {
    id: uid('l'),
    name: b.name,
    mobile: b.mobile,
    email: b.email ?? '',
    source: b.source,
    assignedTo: b.assignedTo,
    priority: b.priority,
    stage: b.stage,
    remarks: b.remarks ?? '',
    createdAt: now,
    updatedAt: now,
  };
  db.leads.unshift(lead);
  addActivity(db, lead.id, 'lead_created', 'Lead created', `Source: ${lead.source}`);
  notify(db, user!, 'lead', 'New lead added', `${lead.name} (${lead.source}) was added.`, lead.id);
  return ok(lead, 201);
});

route('PUT', '/leads/:id', true, ({ db, params, req }) => {
  const lead = need(db.leads.find((l) => l.id === params[0]), 'Lead');
  const changes = pick<Lead>(req.body, LEAD_FIELDS);
  validateLead({ ...lead, ...changes });
  const prevStage = lead.stage;
  Object.assign(lead, changes, { updatedAt: new Date().toISOString() });
  if (prevStage !== lead.stage) addActivity(db, lead.id, 'stage_changed', 'Stage changed', `${prevStage} → ${lead.stage}`);
  else addActivity(db, lead.id, 'lead_updated', 'Lead details updated');
  return ok(lead);
});

route('PATCH', '/leads/:id/stage', true, ({ db, params, req }) => {
  const lead = need(db.leads.find((l) => l.id === params[0]), 'Lead');
  required(req.body, ['stage']);
  if (!(LEAD_STAGES as readonly string[]).includes(req.body.stage)) throw new HttpError(422, 'Invalid stage');
  const prev = lead.stage;
  lead.stage = req.body.stage;
  lead.updatedAt = new Date().toISOString();
  if (prev !== lead.stage) addActivity(db, lead.id, 'stage_changed', 'Stage changed', `${prev} → ${lead.stage}`);
  return ok(lead);
});

route('DELETE', '/leads/:id', true, ({ db, params }) => {
  const idx = db.leads.findIndex((l) => l.id === params[0]);
  if (idx < 0) throw new HttpError(404, 'Lead not found');
  const id = params[0];
  db.leads.splice(idx, 1);
  db.followUps = db.followUps.filter((f) => f.leadId !== id);
  db.visits = db.visits.filter((v) => v.leadId !== id);
  db.activities = db.activities.filter((a) => a.leadId !== id);
  return ok({ success: true });
});

route('GET', '/leads/:id/activities', true, ({ db, params }) => {
  need(db.leads.find((l) => l.id === params[0]), 'Lead');
  return ok(db.activities.filter((a) => a.leadId === params[0]));
});

route('POST', '/leads/:id/notes', true, ({ db, params, req }) => {
  need(db.leads.find((l) => l.id === params[0]), 'Lead');
  required(req.body, ['note']);
  addActivity(db, params[0], 'note', 'Note added', String(req.body.note).trim());
  return ok(db.activities[0], 201);
});

// ---------------------------------------------------------------- FOLLOW-UPS
route('GET', '/followups', true, ({ db, req }) => {
  const { view = 'all', leadId, status } = req.query;
  const now = Date.now();
  let items = db.followUps.filter((f) => {
    if (leadId && f.leadId !== leadId) return false;
    if (status && f.status !== status) return false;
    if (view === 'today') return f.status === 'Pending' && isTodayIso(f.scheduledAt);
    if (view === 'upcoming') return f.status === 'Pending' && new Date(f.scheduledAt).getTime() >= now && !isTodayIso(f.scheduledAt);
    if (view === 'overdue') return isOverdue(f) && !isTodayIso(f.scheduledAt);
    return true;
  });
  items = items.sort((a, b) =>
    view === 'overdue' || view === 'all' ? b.scheduledAt.localeCompare(a.scheduledAt) : a.scheduledAt.localeCompare(b.scheduledAt),
  );
  return ok(items.map((f) => withLead(db, f)));
});

route('GET', '/followups/:id', true, ({ db, params }) => ok(withLead(db, need(db.followUps.find((f) => f.id === params[0]), 'Follow-up'))));

route('POST', '/followups', true, ({ db, req }) => {
  required(req.body, ['leadId', 'type', 'scheduledAt']);
  const lead = need(db.leads.find((l) => l.id === req.body.leadId), 'Lead');
  if (Number.isNaN(new Date(req.body.scheduledAt).getTime())) throw new HttpError(422, 'scheduledAt is not a valid date');
  const now = new Date().toISOString();
  const id = uid('f');
  const f = {
    id,
    leadId: lead.id,
    leadName: lead.name,
    leadMobile: lead.mobile,
    type: req.body.type,
    scheduledAt: req.body.scheduledAt,
    remarks: req.body.remarks ?? '',
    status: 'Pending' as const,
    completedAt: null,
    history: [{ id: uid('h'), action: 'Scheduled' as const, note: req.body.remarks || 'Follow-up scheduled', at: now }],
    createdAt: now,
    updatedAt: now,
    reminded: false,
  };
  db.followUps.unshift(f);
  addActivity(db, lead.id, 'followup_scheduled', 'Follow-up scheduled', `${f.type} — ${new Date(f.scheduledAt).toLocaleString('en-IN')}`);
  return ok(withLead(db, f), 201);
});

route('PUT', '/followups/:id', true, ({ db, params, req }) => {
  const f = need(db.followUps.find((x) => x.id === params[0]), 'Follow-up');
  const b = req.body ?? {};
  if (b.type) f.type = b.type;
  if (b.remarks !== undefined) f.remarks = b.remarks;
  if (b.scheduledAt && b.scheduledAt !== f.scheduledAt) {
    f.history.push({ id: uid('h'), action: 'Rescheduled', note: `Moved from ${new Date(f.scheduledAt).toLocaleString('en-IN')}`, at: new Date().toISOString() });
    f.scheduledAt = b.scheduledAt;
    f.status = 'Pending';
    f.reminded = false;
  } else {
    f.history.push({ id: uid('h'), action: 'Updated', note: 'Details edited', at: new Date().toISOString() });
  }
  f.updatedAt = new Date().toISOString();
  return ok(withLead(db, f));
});

route('POST', '/followups/:id/complete', true, ({ db, params, req }) => {
  const f = need(db.followUps.find((x) => x.id === params[0]), 'Follow-up');
  if (f.status === 'Completed') throw new HttpError(409, 'This follow-up is already completed');
  const now = new Date().toISOString();
  f.status = 'Completed';
  f.completedAt = now;
  f.updatedAt = now;
  const note = req.body?.note ? String(req.body.note) : 'Marked as completed';
  f.history.push({ id: uid('h'), action: 'Completed', note, at: now });
  addActivity(db, f.leadId, 'followup_completed', 'Follow-up completed', `${f.type} — ${note}`);
  return ok(withLead(db, f));
});

route('POST', '/followups/:id/reschedule', true, ({ db, params, req }) => {
  const f = need(db.followUps.find((x) => x.id === params[0]), 'Follow-up');
  required(req.body, ['scheduledAt']);
  if (Number.isNaN(new Date(req.body.scheduledAt).getTime())) throw new HttpError(422, 'scheduledAt is not a valid date');
  const action: FollowUpHistoryAction = 'Rescheduled';
  f.history.push({
    id: uid('h'),
    action,
    note: `${new Date(f.scheduledAt).toLocaleString('en-IN')} → ${new Date(req.body.scheduledAt).toLocaleString('en-IN')}${req.body.note ? ` · ${req.body.note}` : ''}`,
    at: new Date().toISOString(),
  });
  f.scheduledAt = req.body.scheduledAt;
  f.status = 'Pending';
  f.completedAt = null;
  f.reminded = false;
  f.updatedAt = new Date().toISOString();
  addActivity(db, f.leadId, 'followup_rescheduled', 'Follow-up rescheduled', `${f.type} — ${new Date(f.scheduledAt).toLocaleString('en-IN')}`);
  return ok(withLead(db, f));
});

route('DELETE', '/followups/:id', true, ({ db, params }) => {
  const idx = db.followUps.findIndex((f) => f.id === params[0]);
  if (idx < 0) throw new HttpError(404, 'Follow-up not found');
  db.followUps.splice(idx, 1);
  return ok({ success: true });
});

// ---------------------------------------------------------------- SITE VISITS
route('GET', '/visits', true, ({ db, req }) => {
  const { scope = 'all', leadId, propertyId, status } = req.query;
  const now = Date.now();
  const items = db.visits
    .filter((v) => {
      if (leadId && v.leadId !== leadId) return false;
      if (propertyId && v.propertyId !== propertyId) return false;
      if (status && v.status !== status) return false;
      if (scope === 'upcoming') return v.status === 'Scheduled' || v.status === 'Rescheduled' ? new Date(v.scheduledAt).getTime() >= now - 3600_000 : false;
      if (scope === 'past') return !(v.status === 'Scheduled' || v.status === 'Rescheduled') || new Date(v.scheduledAt).getTime() < now - 3600_000;
      return true;
    })
    .sort((a, b) => (scope === 'upcoming' ? a.scheduledAt.localeCompare(b.scheduledAt) : b.scheduledAt.localeCompare(a.scheduledAt)));
  return ok(items.map((v) => withVisitRefs(db, v)));
});

route('GET', '/visits/:id', true, ({ db, params }) => ok(withVisitRefs(db, need(db.visits.find((v) => v.id === params[0]), 'Site visit'))));

route('POST', '/visits', true, ({ db, user, req }) => {
  required(req.body, ['leadId', 'propertyId', 'scheduledAt']);
  const lead = need(db.leads.find((l) => l.id === req.body.leadId), 'Lead');
  const prop = need(db.properties.find((p) => p.id === req.body.propertyId), 'Property');
  const when = new Date(req.body.scheduledAt).getTime();
  if (Number.isNaN(when)) throw new HttpError(422, 'scheduledAt is not a valid date');
  const clash = db.visits.find((v) => v.propertyId === prop.id && v.status === 'Scheduled' && Math.abs(new Date(v.scheduledAt).getTime() - when) < 60 * 60_000);
  if (clash) throw new HttpError(409, `This property already has a visit scheduled around that time (${clash.leadName})`);
  const now = new Date().toISOString();
  const v = {
    id: uid('v'),
    leadId: lead.id,
    leadName: lead.name,
    leadMobile: lead.mobile,
    propertyId: prop.id,
    propertyTitle: prop.title,
    propertyLocation: prop.location,
    scheduledAt: req.body.scheduledAt,
    status: 'Scheduled' as const,
    feedback: '',
    remarks: req.body.remarks ?? '',
    createdAt: now,
    updatedAt: now,
    reminded: false,
  };
  db.visits.unshift(v);
  if (lead.stage === 'New' || lead.stage === 'Contacted' || lead.stage === 'Interested') {
    const prev = lead.stage;
    lead.stage = 'Site Visit Scheduled';
    addActivity(db, lead.id, 'stage_changed', 'Stage changed', `${prev} → ${lead.stage}`);
  }
  addActivity(db, lead.id, 'visit_scheduled', 'Site visit scheduled', prop.title);
  notify(db, user!, 'visit', 'Site visit scheduled', `${lead.name} — ${prop.title}.`, v.id);
  return ok(withVisitRefs(db, v), 201);
});

route('PUT', '/visits/:id', true, ({ db, params, req }) => {
  const v = need(db.visits.find((x) => x.id === params[0]), 'Site visit');
  const b = req.body ?? {};
  if (b.scheduledAt && b.scheduledAt !== v.scheduledAt) {
    const when = new Date(b.scheduledAt).getTime();
    if (Number.isNaN(when)) throw new HttpError(422, 'scheduledAt is not a valid date');
    const clash = db.visits.find(
      (o) => o.id !== v.id && o.propertyId === v.propertyId && (o.status === 'Scheduled' || o.status === 'Rescheduled') && Math.abs(new Date(o.scheduledAt).getTime() - when) < 60 * 60_000,
    );
    if (clash) throw new HttpError(409, `This property already has a visit scheduled around that time (${clash.leadName})`);
    v.scheduledAt = b.scheduledAt;
    v.status = b.status && b.status !== 'Scheduled' ? b.status : 'Rescheduled';
    v.reminded = false;
  } else if (b.status) {
    v.status = b.status;
  }
  if (b.feedback !== undefined) v.feedback = b.feedback;
  if (b.remarks !== undefined) v.remarks = b.remarks;
  v.updatedAt = new Date().toISOString();
  addActivity(db, v.leadId, 'visit_updated', `Site visit ${v.status.toLowerCase()}`, v.propertyTitle);
  return ok(withVisitRefs(db, v));
});

route('DELETE', '/visits/:id', true, ({ db, params }) => {
  const idx = db.visits.findIndex((v) => v.id === params[0]);
  if (idx < 0) throw new HttpError(404, 'Site visit not found');
  db.visits.splice(idx, 1);
  return ok({ success: true });
});

// ---------------------------------------------------------------- NOTIFICATIONS
route('GET', '/notifications', true, ({ db, req }) => {
  const items = [...db.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = req.query.unread === 'true' ? items.filter((n) => !n.read) : items;
  return ok({ data: filtered, unreadCount: db.notifications.filter((n) => !n.read).length });
});

route('POST', '/notifications/read-all', true, ({ db }) => {
  db.notifications.forEach((n) => (n.read = true));
  return ok({ success: true });
});

route('PATCH', '/notifications/:id', true, ({ db, params, req }) => {
  const n = need(db.notifications.find((x) => x.id === params[0]), 'Notification');
  n.read = req.body?.read ?? true;
  return ok(n);
});

route('DELETE', '/notifications/:id', true, ({ db, params }) => {
  const idx = db.notifications.findIndex((n) => n.id === params[0]);
  if (idx < 0) throw new HttpError(404, 'Notification not found');
  db.notifications.splice(idx, 1);
  return ok({ success: true });
});

// ---------------------------------------------------------------- DISPATCH
export async function handleMockRequest(req: MockRequest): Promise<MockResponse> {
  try {
    const db = await loadDb();
    const match = routes
      .map((r) => ({ r, m: req.path.match(r.pattern) }))
      .find((x) => x.r.method === req.method && x.m);
    if (!match || !match.m) throw new HttpError(404, `Route not found: ${req.method} ${req.path}`);

    let user: DbUser | null = null;
    if (match.r.auth) {
      const payload = req.token ? verifyToken(req.token) : null;
      if (!payload) throw new HttpError(401, 'Session expired. Please sign in again.');
      user = db.users.find((u) => u.id === payload.sub) ?? null;
      if (!user) throw new HttpError(401, 'Account no longer exists');
      runHousekeeping(db, user);
    }

    const res = await match.r.handler({ db, user, params: match.m.slice(1).map(decodeURIComponent), req });
    if (req.method !== 'GET' || match.r.auth) await saveDb();
    return res;
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, data: { message: e.message } };
    return { status: 500, data: { message: 'Unexpected server error' } };
  }
}
