// Domain constants. Types in `@/types` are derived from these arrays so the UI,
// validators and the (mock) API always agree on the allowed values.

export const PROPERTY_TYPES = ['Apartment', 'Villa', 'Row House', 'Plot', 'Commercial', 'Office'] as const;
export const LISTING_TYPES = ['Buy', 'Rent'] as const;
export const PROPERTY_STATUSES = ['Available', 'Booked', 'Sold', 'Rented'] as const;
export const BHK_OPTIONS = [1, 2, 3, 4] as const; // 4 means "4+" in filters

export const LEAD_SOURCES = ['Website', 'Facebook', 'Referral', 'Walk-in', 'Other'] as const;
export const LEAD_STAGES = [
  'New',
  'Contacted',
  'Interested',
  'Site Visit Scheduled',
  'Negotiation',
  'Converted',
  'Lost',
] as const;
export const CLOSED_STAGES = ['Converted', 'Lost'] as const;
export const LEAD_PRIORITIES = ['Low', 'Medium', 'High'] as const;

export const FOLLOWUP_TYPES = ['Call', 'WhatsApp', 'Meeting', 'Email'] as const;
export const FOLLOWUP_STATUSES = ['Pending', 'Completed', 'Missed'] as const;
export const FOLLOWUP_VIEWS = ['today', 'upcoming', 'overdue', 'all'] as const;

export const VISIT_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'] as const;

/** Sales executives a lead can be assigned to (mock directory). */
export const EXECUTIVES = ['Aarav Mehta', 'Priya Sharma', 'Rohan Kulkarni', 'Sneha Joshi'] as const;

export const STAGE_COLORS: Record<(typeof LEAD_STAGES)[number], string> = {
  New: '#2563EB',
  Contacted: '#0891B2',
  Interested: '#7C3AED',
  'Site Visit Scheduled': '#D97706',
  Negotiation: '#DB2777',
  Converted: '#16A34A',
  Lost: '#6B7280',
};

export const PRIORITY_COLORS: Record<(typeof LEAD_PRIORITIES)[number], string> = {
  Low: '#6B7280',
  Medium: '#D97706',
  High: '#DC2626',
};

export const PROPERTY_STATUS_COLORS: Record<(typeof PROPERTY_STATUSES)[number], string> = {
  Available: '#16A34A',
  Booked: '#D97706',
  Sold: '#6B7280',
  Rented: '#7C3AED',
};

export const FOLLOWUP_STATUS_COLORS: Record<(typeof FOLLOWUP_STATUSES)[number], string> = {
  Pending: '#D97706',
  Completed: '#16A34A',
  Missed: '#DC2626',
};

export const VISIT_STATUS_COLORS: Record<(typeof VISIT_STATUSES)[number], string> = {
  Scheduled: '#2563EB',
  Completed: '#16A34A',
  Cancelled: '#6B7280',
  Rescheduled: '#D97706',
};

/** Ionicons names used for follow-up types. */
export const FOLLOWUP_TYPE_ICONS: Record<(typeof FOLLOWUP_TYPES)[number], string> = {
  Call: 'call-outline',
  WhatsApp: 'logo-whatsapp',
  Meeting: 'people-outline',
  Email: 'mail-outline',
};

export const PASSWORD_MIN_LENGTH = 6;
