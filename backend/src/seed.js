// Wipes the database and loads demo data. Run with: npm run seed
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('./config');
const { connectDb } = require('./db');
const { User, Property, Lead, Activity, FollowUp, Visit, Notification } = require('./models');

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const at = (days, hour, minute = 0) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const img = (seed) => `https://picsum.photos/seed/${seed}/800/600`;

async function main() {
  await connectDb();
  await Promise.all([User, Property, Lead, Activity, FollowUp, Visit, Notification].map((m) => m.deleteMany({})));

  const user = await User.create({
    name: 'Demo Executive',
    email: 'demo@hously.in',
    password: await bcrypt.hash('Demo@123', 10),
    phone: '9876543210',
    role: 'Sales Executive',
  });

  const properties = await Property.insertMany([
    { title: '3 BHK Sea-View Apartment', type: 'Apartment', listingType: 'Buy', location: 'Baner, Pune', price: 12500000, bhk: 3, area: 1450, description: 'Spacious apartment with a balcony and covered parking.', status: 'Available', images: [img('p1a'), img('p1b')], featured: true },
    { title: '2 BHK Starter Flat', type: 'Apartment', listingType: 'Buy', location: 'Wakad, Pune', price: 6800000, bhk: 2, area: 980, description: 'Close to the IT park and the expressway.', status: 'Available', images: [img('p2a')], featured: false },
    { title: 'Luxury Villa with Garden', type: 'Villa', listingType: 'Buy', location: 'Koregaon Park, Pune', price: 42000000, bhk: 4, area: 3200, description: 'Private garden, home theatre and a three-car garage.', status: 'Booked', images: [img('p3a'), img('p3b')], featured: true },
    { title: '1 BHK Furnished Rental', type: 'Apartment', listingType: 'Rent', location: 'Hinjewadi, Pune', price: 22000, bhk: 1, area: 620, description: 'Fully furnished, 5 minutes from the metro.', status: 'Available', images: [img('p4a')], featured: false },
    { title: 'NA Plot, Hill Facing', type: 'Plot', listingType: 'Buy', location: 'Lonavala', price: 5400000, bhk: null, area: 2400, description: 'Clear title, ready for construction.', status: 'Available', images: [img('p5a')], featured: false },
    { title: 'Commercial Office Space', type: 'Office', listingType: 'Rent', location: 'Viman Nagar, Pune', price: 95000, bhk: null, area: 1800, description: 'Open-plan floor with a reception and a meeting room.', status: 'Rented', images: [img('p6a')], featured: false },
  ]);

  const leadData = [
    ['Rohan Mehta', '9822011111', 'rohan.mehta@example.com', 'Website', 'High', 'Interested', 'Wants a 3 BHK near Baner.'],
    ['Priya Sharma', '9822022222', 'priya.s@example.com', 'Facebook', 'Medium', 'Site Visit Scheduled', 'Visiting with her family this week.'],
    ['Amit Kulkarni', '9822033333', '', 'Referral', 'High', 'Negotiation', 'Asked for a final price on the villa.'],
    ['Sneha Joshi', '9822044444', 'sneha.j@example.com', 'Walk-in', 'Low', 'New', ''],
    ['Rahul Desai', '9822055555', '', 'Website', 'Medium', 'Converted', 'Booked the Wakad flat.'],
    ['Neha Patil', '9822066666', 'neha.p@example.com', 'Other', 'Low', 'Lost', 'Budget did not match.'],
  ];
  const leads = await Lead.insertMany(
    leadData.map(([name, mobile, email, source, priority, stage, remarks]) => ({ name, mobile, email, source, priority, stage, remarks, assignedTo: user.name })),
  );
  await Activity.insertMany(leads.map((l) => ({ leadId: l._id, kind: 'lead_created', title: 'Lead created', description: `Source: ${l.source}` })));

  const mk = (lead, type, when, remarks, status = 'Pending', extra = []) => ({
    leadId: lead._id,
    leadName: lead.name,
    type,
    scheduledAt: when,
    remarks,
    status,
    completedAt: status === 'Completed' ? when : null,
    history: [{ action: 'Scheduled', note: remarks || 'Follow-up scheduled', at: new Date() }, ...extra],
  });
  await FollowUp.insertMany([
    mk(leads[0], 'Call', at(0, 17), 'Share floor plans and the price sheet.'),
    mk(leads[1], 'WhatsApp', at(0, 19), 'Confirm the visit time.'),
    mk(leads[2], 'Meeting', at(2, 11), 'Final negotiation meeting.'),
    mk(leads[3], 'Email', at(4, 10), 'Send the brochure.'),
    mk(leads[0], 'Call', at(-0.5, 9), 'Intro call.', 'Completed', [{ action: 'Completed', note: 'Spoke for 10 minutes', at: new Date() }]),
    mk(leads[3], 'Call', at(-1, 15), 'Callback requested.'),
  ]);

  const visit = (lead, prop, when, status, feedback = '') => ({
    leadId: lead._id, propertyId: prop._id, leadName: lead.name, propertyTitle: prop.title, propertyLocation: prop.location,
    scheduledAt: when, status, feedback, remarks: '',
  });
  await Visit.insertMany([
    visit(leads[1], properties[0], at(1, 11), 'Scheduled'),
    visit(leads[0], properties[1], at(3, 16), 'Scheduled'),
    visit(leads[4], properties[1], at(-5, 12), 'Completed', 'Liked the layout and booked it.'),
  ]);

  await Notification.insertMany([
    { user: user._id, type: 'followup', title: 'Follow-up due soon', message: 'Call Rohan Mehta today at 5:00 PM.' },
    { user: user._id, type: 'visit', title: 'Site visit coming up', message: 'Priya Sharma — 3 BHK Sea-View Apartment.' },
    { user: user._id, type: 'lead', title: 'New lead received', message: 'Sneha Joshi walked in.', read: true },
  ]);

  console.log('Seeded. Login: demo@hously.in / Demo@123');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
