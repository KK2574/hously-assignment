# API reference

Base URL: `EXPO_PUBLIC_API_URL` (default: in-app mock, `https://api.hously.mock/v1`).
All endpoints except `/auth/login`, `/auth/register`, `/auth/forgot-password` and `/auth/reset-password` require `Authorization: Bearer <jwt>`.
Errors are returned as `{ "message": "…" }` with an appropriate status: `400` bad request, `401` missing/expired token, `404` not found, `409` conflict, `422` validation failed.

**Test credentials:** `demo@hously.in` / `Demo@123` — OTP for password reset: `123456`.

## Auth & profile
| Method | Path | Body / notes |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| POST | `/auth/register` | `{ name, email, phone, password }` → `{ token, user }` |
| POST | `/auth/forgot-password` | `{ email }` → sends OTP (simulated) |
| POST | `/auth/reset-password` | `{ email, otp, newPassword }` |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/me` | `{ name?, phone?, avatarUrl?, preferences?: { followUps?, siteVisits?, newLeads? } }` |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` — `400` if current password is wrong |

## Dashboard
`GET /dashboard` — totals (properties, leads, activeLeads, followUpsToday, closedDeals, upcomingVisits, unreadNotifications), `leadsByStage`, `recentActivity`.

## Properties
| Method | Path | Notes |
|---|---|---|
| GET | `/properties` | Query: `search, type, listingType, bhk, status, minPrice, maxPrice, featured, page, limit` → `{ data, meta }` |
| GET | `/properties/:id` | |
| POST | `/properties` | `title, type, listingType, location, price, bhk, area, description, status, images[], featured` |
| PUT | `/properties/:id` | Partial update |
| DELETE | `/properties/:id` | `409` if the property has scheduled visits |

## Leads
| Method | Path | Notes |
|---|---|---|
| GET | `/leads` | Query: `search, stage, source, priority, assignedTo, page, limit` → `{ data, meta }` |
| GET | `/leads/:id` | |
| POST | `/leads` | `name, mobile, email?, source, assignedTo, priority, stage, remarks?` |
| PUT | `/leads/:id` | Partial update |
| PATCH | `/leads/:id/stage` | `{ stage }` |
| DELETE | `/leads/:id` | Also removes the lead's follow-ups and visits |
| GET | `/leads/:id/activities` | Activity history |
| POST | `/leads/:id/notes` | `{ note }` |
| POST | `/leads/simulate` | **Simulated** incoming enquiry (mock only) |

## Follow-ups
| Method | Path | Notes |
|---|---|---|
| GET | `/followups` | Query: `view` = `today \| upcoming \| overdue \| all`, `leadId`, `status` |
| GET | `/followups/:id` | Includes `history[]` |
| POST | `/followups` | `{ leadId, type, scheduledAt (ISO), remarks }` — types: Call, WhatsApp, Meeting, Email |
| PUT | `/followups/:id` | `{ type?, remarks?, scheduledAt? }` (a changed date is recorded as *Rescheduled*) |
| POST | `/followups/:id/complete` | `{ note? }` — `409` if already completed |
| POST | `/followups/:id/reschedule` | `{ scheduledAt, note? }` |
| DELETE | `/followups/:id` | |

Statuses: `Pending`, `Completed`, `Missed` (pending follow-ups more than 24 h late become `Missed`).

## Site visits
| Method | Path | Notes |
|---|---|---|
| GET | `/visits` | Query: `scope` = `upcoming \| past \| all`, `leadId`, `propertyId`, `status` |
| GET | `/visits/:id` | |
| POST | `/visits` | `{ leadId, propertyId, scheduledAt, remarks? }` — `409` if the property already has a visit within an hour; moves an early-stage lead to *Site Visit Scheduled* |
| PUT | `/visits/:id` | `{ scheduledAt?, status?, feedback?, remarks? }` — changing the date sets status *Rescheduled* |
| DELETE | `/visits/:id` | |

Statuses: `Scheduled`, `Completed`, `Cancelled`, `Rescheduled`.

## Notifications
| Method | Path | Notes |
|---|---|---|
| GET | `/notifications` | Query: `unread=true` → `{ data, unreadCount }` |
| PATCH | `/notifications/:id` | `{ read: boolean }` (mark read / unread) |
| POST | `/notifications/read-all` | |
| DELETE | `/notifications/:id` | |

## Data model (summary)
Full TypeScript definitions are in `src/types/index.ts`. Entities: **User** (preferences, avatar), **Property**, **Lead**, **Activity** (per lead), **FollowUp** (with `history[]`), **SiteVisit** (lead + property refs, feedback), **AppNotification**.
Relations: Lead 1—N FollowUp, Lead 1—N SiteVisit, Property 1—N SiteVisit, Lead 1—N Activity.
