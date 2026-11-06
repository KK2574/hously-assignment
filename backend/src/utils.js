const config = require('./config');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const ID_RE = /^[a-f\d]{24}$/i;
const isId = (v) => typeof v === 'string' && ID_RE.test(v);

/** Finds a document by id, answering 404 for unknown or malformed ids. */
async function findOrFail(Model, id, label) {
  const doc = isId(id) ? await Model.findById(id) : null;
  if (!doc) throw new HttpError(404, `${label} not found`);
  return doc;
}

function required(body, fields) {
  for (const f of fields) {
    const v = body?.[f];
    if (v === undefined || v === null || v === '') throw new HttpError(422, `${f} is required`);
  }
}

/** Copies only the allowed keys so a client can never overwrite id, createdAt, etc. */
function pick(body, keys) {
  const out = {};
  for (const k of keys) if (body?.[k] !== undefined) out[k] = body[k];
  return out;
}

/** Query-string values are only trusted when they are plain strings (blocks ?x[$ne]=y injection). */
const qs = (v) => (typeof v === 'string' && v !== '' ? v : undefined);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function paginate(Model, filter, sort, query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const [total, items] = await Promise.all([
    Model.countDocuments(filter),
    Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
  ]);
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return { data: items, meta: { page, limit, total, totalPages, hasMore: page < totalPages } };
}

/** Start (inclusive) and end (exclusive) of "today" in the configured timezone. */
function dayBounds() {
  const off = config.tzOffsetMinutes * 60_000;
  const DAY = 86_400_000;
  const startLocal = Math.floor((Date.now() + off) / DAY) * DAY;
  const start = new Date(startLocal - off);
  return { start, end: new Date(start.getTime() + DAY) };
}

const fmtDateTime = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });

const isValidDate = (v) => !Number.isNaN(new Date(v).getTime());

module.exports = { HttpError, asyncHandler, isId, findOrFail, required, pick, qs, escapeRegex, paginate, dayBounds, fmtDateTime, fmtTime, isValidDate };
