module.exports = {
  PROPERTY_TYPES: ['Apartment', 'Villa', 'Row House', 'Plot', 'Commercial', 'Office'],
  LISTING_TYPES: ['Buy', 'Rent'],
  PROPERTY_STATUSES: ['Available', 'Booked', 'Sold', 'Rented'],
  LEAD_SOURCES: ['Website', 'Facebook', 'Referral', 'Walk-in', 'Other'],
  LEAD_STAGES: ['New', 'Contacted', 'Interested', 'Site Visit Scheduled', 'Negotiation', 'Converted', 'Lost'],
  CLOSED_STAGES: ['Converted', 'Lost'],
  LEAD_PRIORITIES: ['Low', 'Medium', 'High'],
  FOLLOWUP_TYPES: ['Call', 'WhatsApp', 'Meeting', 'Email'],
  FOLLOWUP_STATUSES: ['Pending', 'Completed', 'Missed'],
  HISTORY_ACTIONS: ['Scheduled', 'Updated', 'Rescheduled', 'Completed', 'Missed'],
  VISIT_STATUSES: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'],
  ACTIVITY_KINDS: [
    'lead_created', 'stage_changed', 'lead_updated', 'followup_scheduled', 'followup_completed',
    'followup_rescheduled', 'visit_scheduled', 'visit_updated', 'note',
  ],
  NOTIFICATION_TYPES: ['followup', 'visit', 'lead', 'system'],
};
