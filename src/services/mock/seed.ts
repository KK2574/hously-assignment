import type {
  Activity,
  AppNotification,
  FollowUp,
  Lead,
  Property,
  SiteVisit,
  User,
} from '@/types';

export interface DbUser extends User {
  password: string; // plain text ONLY because this is a mock database
}

export interface Db {
  users: DbUser[];
  properties: Property[];
  leads: Lead[];
  activities: Activity[];
  followUps: (FollowUp & { reminded?: boolean })[];
  visits: (SiteVisit & { reminded?: boolean })[];
  notifications: AppNotification[];
}

export const DEMO_EMAIL = 'demo@hously.in';
export const DEMO_PASSWORD = 'Demo@123';

/** Date relative to now: day offset + a fixed hour/minute. */
function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const img = (seed: string, n = 3) =>
  Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/hously-${seed}-${i + 1}/900/600`);

export function buildSeed(): Db {
  const created = ago(60 * 24 * 20);

  const users: DbUser[] = [
    {
      id: 'u_demo',
      name: 'Aarav Mehta',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      phone: '9876543210',
      role: 'Senior Sales Executive',
      avatarUrl: null,
      preferences: { followUps: true, siteVisits: true, newLeads: true },
      createdAt: created,
    },
  ];

  const p = (
    id: string,
    title: string,
    type: Property['type'],
    listingType: Property['listingType'],
    location: string,
    price: number,
    bhk: number | null,
    area: number,
    status: Property['status'],
    description: string,
    featured = false,
  ): Property => ({
    id,
    title,
    type,
    listingType,
    location,
    price,
    bhk,
    area,
    description,
    status,
    featured,
    images: img(id),
    createdAt: created,
    updatedAt: created,
  });

  const properties: Property[] = [
    p('p1', '3 BHK Luxury Apartment', 'Apartment', 'Buy', 'Baner, Pune', 12_500_000, 3, 1450, 'Available',
      'Spacious east-facing apartment with modular kitchen, clubhouse, swimming pool and two covered parkings.', true),
    p('p2', '2 BHK Modern Flat near IT Park', 'Apartment', 'Rent', 'Hinjewadi Phase 1, Pune', 28_000, 2, 1050, 'Available',
      'Semi-furnished flat, 5 minutes from Rajiv Gandhi Infotech Park. 24x7 security and power backup.'),
    p('p3', '4 BHK Premium Villa', 'Villa', 'Buy', 'Koregaon Park, Pune', 48_500_000, 4, 3200, 'Available',
      'Independent villa with private garden, home theatre room and a 3-car garage in a prime, quiet lane.', true),
    p('p4', '1 BHK Compact Studio', 'Apartment', 'Rent', 'Wakad, Pune', 16_000, 1, 600, 'Rented',
      'Fully furnished studio ideal for working professionals, close to Wakad bridge and Hinjewadi.'),
    p('p5', 'Commercial Office Space', 'Office', 'Rent', 'Viman Nagar, Pune', 95_000, null, 1800, 'Available',
      'Ready-to-move office on the 4th floor with 20 workstations, conference room and 4 parking slots.'),
    p('p6', 'NA Residential Plot', 'Plot', 'Buy', 'Kharadi, Pune', 9_800_000, null, 2400, 'Available',
      'Clear-title NA plot in a gated layout with internal roads, water and drainage. Close to EON IT Park.'),
    p('p7', '3 BHK Row House', 'Row House', 'Buy', 'Kothrud, Pune', 21_000_000, 3, 1900, 'Booked',
      'Corner row house with terrace garden, vastu compliant, walking distance to schools and the metro.'),
    p('p8', '2 BHK Ready Possession Flat', 'Apartment', 'Buy', 'Hadapsar, Pune', 6_800_000, 2, 980, 'Sold',
      'Ready possession flat in a well-maintained society with garden, gym and children’s play area.'),
  ];

  const l = (
    id: string,
    name: string,
    mobile: string,
    email: string,
    source: Lead['source'],
    priority: Lead['priority'],
    stage: Lead['stage'],
    remarks: string,
    assignedTo: string,
    daysAgo: number,
  ): Lead => ({
    id,
    name,
    mobile,
    email,
    source,
    assignedTo,
    priority,
    stage,
    remarks,
    createdAt: ago(60 * 24 * daysAgo),
    updatedAt: ago(60 * 24 * Math.max(daysAgo - 2, 0)),
  });

  const leads: Lead[] = [
    l('l1', 'Rohit Deshpande', '9823012345', 'rohit.d@example.com', 'Website', 'High', 'Interested', 'Wants 3 BHK in Baner, budget up to 1.3 Cr.', 'Aarav Mehta', 9),
    l('l2', 'Sneha Kulkarni', '9822098765', 'sneha.k@example.com', 'Facebook', 'Medium', 'Contacted', 'Looking for a rental near Hinjewadi.', 'Priya Sharma', 7),
    l('l3', 'Vikram Joshi', '9890123456', 'vikram.j@example.com', 'Referral', 'High', 'Site Visit Scheduled', 'Referred by an existing client. Interested in villas.', 'Aarav Mehta', 12),
    l('l4', 'Anjali Patil', '9881234567', 'anjali.p@example.com', 'Walk-in', 'Low', 'New', 'Walked in on Saturday, asked about plots.', 'Rohan Kulkarni', 1),
    l('l5', 'Manish Agarwal', '9765432109', 'manish.a@example.com', 'Website', 'High', 'Negotiation', 'Negotiating price on the Kothrud row house.', 'Aarav Mehta', 15),
    l('l6', 'Pooja Nair', '9923456780', 'pooja.n@example.com', 'Other', 'Medium', 'Converted', 'Booked the Hadapsar flat. Documentation done.', 'Sneha Joshi', 25),
    l('l7', 'Farhan Sheikh', '9970123456', 'farhan.s@example.com', 'Facebook', 'Low', 'Lost', 'Went with another builder.', 'Priya Sharma', 20),
    l('l8', 'Kavita Rane', '9860012345', 'kavita.r@example.com', 'Referral', 'Medium', 'Interested', 'Needs office space for 15-20 people.', 'Rohan Kulkarni', 5),
    l('l9', 'Sandeep Bhosale', '9850098765', '', 'Walk-in', 'Medium', 'Contacted', 'Prefers WhatsApp over calls.', 'Sneha Joshi', 3),
    l('l10', 'Divya Menon', '9730011223', 'divya.m@example.com', 'Website', 'High', 'New', 'Enquired about the Kharadi plot via website form.', 'Aarav Mehta', 0),
  ];

  const f = (
    id: string,
    leadId: string,
    type: FollowUp['type'],
    scheduledAt: string,
    remarks: string,
    status: FollowUp['status'] = 'Pending',
  ): FollowUp & { reminded?: boolean } => {
    const lead = leads.find((x) => x.id === leadId)!;
    const done = status === 'Completed';
    return {
      id,
      leadId,
      leadName: lead.name,
      leadMobile: lead.mobile,
      type,
      scheduledAt,
      remarks,
      status,
      completedAt: done ? scheduledAt : null,
      history: [
        { id: `${id}_h1`, action: 'Scheduled', note: remarks || 'Follow-up scheduled', at: ago(60 * 24 * 2) },
        ...(done ? [{ id: `${id}_h2`, action: 'Completed' as const, note: 'Customer confirmed interest.', at: scheduledAt }] : []),
      ],
      createdAt: ago(60 * 24 * 2),
      updatedAt: ago(60 * 24),
      reminded: true,
    };
  };

  const followUps = [
    f('f1', 'l1', 'Call', at(0, 17, 30), 'Share floor plans and final pricing for the Baner 3 BHK.'),
    f('f2', 'l2', 'WhatsApp', at(0, 19, 0), 'Send photos of the Hinjewadi flat.'),
    f('f3', 'l5', 'Meeting', at(1, 11, 0), 'Final negotiation meeting at the office.'),
    f('f4', 'l8', 'Email', at(2, 10, 30), 'Email office-space brochure and quotation.'),
    f('f5', 'l4', 'Call', at(-1, 16, 0), 'Call back regarding plot options.', 'Missed'),
    f('f6', 'l9', 'WhatsApp', at(-2, 12, 0), 'Share Wakad rental options.', 'Missed'),
    f('f7', 'l3', 'Call', at(-1, 11, 0), 'Confirm villa site-visit slot.', 'Completed'),
    f('f8', 'l10', 'Call', at(3, 15, 0), 'Introductory call about the Kharadi plot.'),
  ];

  const v = (
    id: string,
    leadId: string,
    propertyId: string,
    scheduledAt: string,
    status: SiteVisit['status'],
    feedback = '',
    remarks = '',
  ): SiteVisit & { reminded?: boolean } => {
    const lead = leads.find((x) => x.id === leadId)!;
    const prop = properties.find((x) => x.id === propertyId)!;
    return {
      id,
      leadId,
      leadName: lead.name,
      leadMobile: lead.mobile,
      propertyId,
      propertyTitle: prop.title,
      propertyLocation: prop.location,
      scheduledAt,
      status,
      feedback,
      remarks,
      createdAt: ago(60 * 24 * 3),
      updatedAt: ago(60 * 24),
      reminded: true,
    };
  };

  const visits = [
    v('v1', 'l3', 'p3', at(1, 15, 0), 'Scheduled', '', 'Client will come with spouse.'),
    v('v2', 'l1', 'p1', at(2, 11, 30), 'Scheduled', '', 'Show the model flat on the 8th floor.'),
    v('v3', 'l5', 'p7', at(-3, 16, 0), 'Completed', 'Liked the layout and terrace. Concerned about the price.', ''),
    v('v4', 'l7', 'p5', at(-5, 12, 0), 'Cancelled', 'Customer went with another option.', ''),
  ];

  const activities: Activity[] = [
    { id: 'a1', leadId: 'l10', kind: 'lead_created', title: 'Lead created', description: 'Source: Website', createdAt: ago(25) },
    { id: 'a2', leadId: 'l1', kind: 'followup_scheduled', title: 'Follow-up scheduled', description: 'Call — today', createdAt: ago(90) },
    { id: 'a3', leadId: 'l3', kind: 'visit_scheduled', title: 'Site visit scheduled', description: '4 BHK Premium Villa', createdAt: ago(60 * 5) },
    { id: 'a4', leadId: 'l5', kind: 'stage_changed', title: 'Stage changed', description: 'Interested → Negotiation', createdAt: ago(60 * 9) },
    { id: 'a5', leadId: 'l3', kind: 'followup_completed', title: 'Follow-up completed', description: 'Call — Customer confirmed interest.', createdAt: ago(60 * 26) },
    { id: 'a6', leadId: 'l6', kind: 'stage_changed', title: 'Stage changed', description: 'Negotiation → Converted', createdAt: ago(60 * 24 * 4) },
    { id: 'a7', leadId: 'l1', kind: 'lead_created', title: 'Lead created', description: 'Source: Website', createdAt: ago(60 * 24 * 9) },
    { id: 'a8', leadId: 'l3', kind: 'lead_created', title: 'Lead created', description: 'Source: Referral', createdAt: ago(60 * 24 * 12) },
  ];

  const notifications: AppNotification[] = [
    { id: 'n1', type: 'lead', title: 'New lead received', message: 'Divya Menon enquired about the Kharadi plot via Website.', read: false, refId: 'l10', createdAt: ago(25) },
    { id: 'n2', type: 'followup', title: 'Follow-up due today', message: 'Call Rohit Deshpande at 5:30 PM.', read: false, refId: 'f1', createdAt: ago(120) },
    { id: 'n3', type: 'visit', title: 'Site visit tomorrow', message: 'Vikram Joshi — 4 BHK Premium Villa at 3:00 PM.', read: false, refId: 'v1', createdAt: ago(60 * 6) },
    { id: 'n4', type: 'followup', title: 'Missed follow-up', message: 'Call back Anjali Patil was missed yesterday.', read: true, refId: 'f5', createdAt: ago(60 * 20) },
    { id: 'n5', type: 'system', title: 'Welcome to Hously CRM', message: 'Manage properties, leads, follow-ups and site visits in one place.', read: true, createdAt: ago(60 * 24 * 5) },
  ];

  return { users, properties, leads, activities, followUps, visits, notifications };
}
