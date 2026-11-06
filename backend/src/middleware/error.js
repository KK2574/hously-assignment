const { HttpError } = require('../utils');

const notFound = (req, _res, next) => next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(422).json({ message: first?.message || 'Validation failed' });
  }
  if (err.name === 'CastError') return res.status(422).json({ message: `Invalid value for ${err.path}` });
  if (err.code === 11000) return res.status(409).json({ message: 'That value already exists' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body' });
  console.error(err);
  return res.status(500).json({ message: 'Unexpected server error' });
};

module.exports = { notFound, errorHandler };
