const router = require('express').Router();
const { Property, Visit } = require('../models');
const { HttpError, asyncHandler, findOrFail, required, pick, qs, escapeRegex, paginate } = require('../utils');

const FIELDS = ['title', 'type', 'listingType', 'location', 'price', 'bhk', 'area', 'description', 'status', 'images', 'featured'];

function validate(b) {
  required(b, ['title', 'type', 'listingType', 'location', 'price', 'area', 'status']);
  if (!(Number(b.price) > 0)) throw new HttpError(422, 'price must be greater than 0');
  if (!(Number(b.area) > 0)) throw new HttpError(422, 'area must be greater than 0');
}

const clean = (b) => ({
  ...pick(b, FIELDS),
  price: Number(b.price),
  area: Number(b.area),
  bhk: b.bhk ? Number(b.bhk) : null,
  images: Array.isArray(b.images) ? b.images.filter((i) => typeof i === 'string') : [],
  featured: !!b.featured,
});

router.get('/', asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = {};
  const search = qs(q.search)?.trim();
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: re }, { location: re }];
  }
  if (qs(q.type)) filter.type = qs(q.type);
  if (qs(q.listingType)) filter.listingType = qs(q.listingType);
  if (qs(q.status)) filter.status = qs(q.status);
  if (qs(q.featured) === 'true') filter.featured = true;
  if (qs(q.bhk)) {
    const n = Number(q.bhk);
    filter.bhk = n >= 4 ? { $gte: 4 } : n; // 4 means "4 and above"
  }
  const price = {};
  if (qs(q.minPrice)) price.$gte = Number(q.minPrice);
  if (qs(q.maxPrice)) price.$lte = Number(q.maxPrice);
  if (Object.keys(price).length) filter.price = price;

  res.json(await paginate(Property, filter, { featured: -1, createdAt: -1 }, q));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await findOrFail(Property, req.params.id, 'Property'));
}));

router.post('/', asyncHandler(async (req, res) => {
  validate(req.body);
  res.status(201).json(await Property.create(clean(req.body)));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const p = await findOrFail(Property, req.params.id, 'Property');
  const merged = { ...p.toJSON(), ...pick(req.body, FIELDS) };
  validate(merged);
  const changes = pick(req.body, FIELDS);
  if (changes.price !== undefined) changes.price = Number(changes.price);
  if (changes.area !== undefined) changes.area = Number(changes.area);
  if (changes.bhk !== undefined) changes.bhk = changes.bhk ? Number(changes.bhk) : null;
  if (changes.featured !== undefined) changes.featured = !!changes.featured;
  if (changes.images !== undefined) changes.images = Array.isArray(changes.images) ? changes.images.filter((i) => typeof i === 'string') : [];
  p.set(changes);
  await p.save();
  res.json(p);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const p = await findOrFail(Property, req.params.id, 'Property');
  const busy = await Visit.exists({ propertyId: p._id, status: { $in: ['Scheduled', 'Rescheduled'] } });
  if (busy) throw new HttpError(409, 'Cancel the scheduled site visits for this property before deleting it');
  await p.deleteOne();
  res.json({ success: true });
}));

module.exports = router;
