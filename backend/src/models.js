const mongoose = require('mongoose');
const C = require('./constants');

const { Schema } = mongoose;

// Every document is sent to the app as { id, ... } without Mongo internals or secrets.
const jsonOpts = {
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.password;
    delete ret.resetCodeHash;
    delete ret.resetCodeExpires;
    delete ret.reminded;
    delete ret.user;
    return ret;
  },
};
const opts = { timestamps: true, toJSON: jsonOpts };

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    role: { type: String, default: 'Sales Executive' },
    avatarUrl: { type: String, default: null },
    preferences: {
      followUps: { type: Boolean, default: true },
      siteVisits: { type: Boolean, default: true },
      newLeads: { type: Boolean, default: true },
    },
    resetCodeHash: String,
    resetCodeExpires: Date,
  },
  opts,
);

const propertySchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: C.PROPERTY_TYPES, required: true },
    listingType: { type: String, enum: C.LISTING_TYPES, required: true },
    location: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    bhk: { type: Number, default: null },
    area: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    status: { type: String, enum: C.PROPERTY_STATUSES, required: true },
    images: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
  },
  opts,
);
propertySchema.index({ featured: -1, createdAt: -1 });

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    source: { type: String, enum: C.LEAD_SOURCES, required: true },
    assignedTo: { type: String, required: true },
    priority: { type: String, enum: C.LEAD_PRIORITIES, required: true },
    stage: { type: String, enum: C.LEAD_STAGES, required: true },
    remarks: { type: String, default: '' },
  },
  opts,
);
leadSchema.index({ createdAt: -1 });

const activitySchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    kind: { type: String, enum: C.ACTIVITY_KINDS, required: true },
    title: { type: String, required: true },
    description: String,
  },
  opts,
);
activitySchema.index({ createdAt: -1 });

const historySchema = new Schema(
  {
    action: { type: String, enum: C.HISTORY_ACTIONS, required: true },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { toJSON: jsonOpts },
);

const followUpSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    leadName: { type: String, default: '' }, // snapshot, refreshed from the lead on read
    type: { type: String, enum: C.FOLLOWUP_TYPES, required: true },
    scheduledAt: { type: Date, required: true, index: true },
    remarks: { type: String, default: '' },
    status: { type: String, enum: C.FOLLOWUP_STATUSES, default: 'Pending' },
    completedAt: { type: Date, default: null },
    history: { type: [historySchema], default: [] },
    reminded: { type: Boolean, default: false },
  },
  opts,
);

const visitSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    leadName: { type: String, default: '' }, // snapshots, refreshed on read when the source still exists
    propertyTitle: { type: String, default: '' },
    propertyLocation: { type: String, default: '' },
    scheduledAt: { type: Date, required: true, index: true },
    status: { type: String, enum: C.VISIT_STATUSES, default: 'Scheduled' },
    feedback: { type: String, default: '' },
    remarks: { type: String, default: '' },
    reminded: { type: Boolean, default: false },
  },
  opts,
);

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: C.NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    read: { type: Boolean, default: false },
    refId: String,
  },
  opts,
);
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = {
  User: mongoose.model('User', userSchema),
  Property: mongoose.model('Property', propertySchema),
  Lead: mongoose.model('Lead', leadSchema),
  Activity: mongoose.model('Activity', activitySchema),
  FollowUp: mongoose.model('FollowUp', followUpSchema),
  Visit: mongoose.model('Visit', visitSchema),
  Notification: mongoose.model('Notification', notificationSchema),
};
