# Hously CRM — Mini Real Estate CRM (React Native)

A mobile CRM for real-estate teams: manage **properties, leads, follow-ups, site visits** and customer communication from one app.
Built for the *Hously Finntech Realty – React Native Round 2* assignment.

- **Stack:** Expo (SDK 58) · React Native · TypeScript · Expo Router · Axios · React Hook Form + Zod · Context API
- **Platforms:** Android / iOS (also runs on web for quick checks)
- **Backend:** a **built-in mock REST API** (no server to start). The app can be pointed at a real backend by setting one environment variable — see [Backend & API](#backend--api).

---

## Screenshots & demo

> Add before submitting: `docs/screenshots/*.png` and the demo video link.

| Login | Dashboard | Leads | Lead details |
|---|---|---|---|
| _add_ | _add_ | _add_ | _add_ |

| Properties | Property details | Follow-ups | Site visits |
|---|---|---|---|
| _add_ | _add_ | _add_ | _add_ |

**Demo video:** _add link_  ·  **APK / Expo link:** _add link_

---

## Test credentials

| Field | Value |
|---|---|
| Email | `demo@hously.in` |
| Password | `Demo@123` |

On the login screen, the **"Use demo account"** button fills these in. You can also register a new account.

**Forgot password (demo):** enter the email, then use the 6-digit code **`123456`** (the app also shows it in a banner, because there is no mail server).

---

## Features (mapped to the assignment)

| Spec | What is implemented |
|---|---|
| **2.1 Auth** | Login, register, forgot/reset password (email → code → new password), form validation (Zod), JWT stored in the OS keychain (`expo-secure-store`), session restore on app start, protected routes, logout with confirmation |
| **2.2 Dashboard** | Cards for total properties, total leads, active leads, follow-ups due today, closed deals and upcoming visits; leads-by-stage chart; recent activity feed; quick actions (add lead, add property, schedule follow-up, site visits) |
| **2.3 Properties** | Create / view / edit / delete (with confirmation); title, type, location, price, BHK, area, description, status, images (picker, compressed); image gallery with full-screen viewer; featured toggle; search by title/location; filters: type, budget range, Buy/Rent, BHK, status; share via the device share sheet |
| **2.4 Leads** | Create / view / edit / delete; name, mobile, email, source, assigned executive, priority, stage, remarks; sources and stages exactly as specified; search + filters (stage, source, priority, executive); per-lead activity history and notes |
| **2.5 Follow-ups** | Schedule with date, time, type (Call/WhatsApp/Meeting/Email) and remarks; Today / Upcoming / Overdue / All views; statuses Pending / Completed / Missed; complete, reschedule, edit; full history kept per follow-up |
| **2.6 Site visits** | Schedule by choosing lead, property, date and time; statuses Scheduled / Completed / Cancelled / Rescheduled; feedback and remarks; upcoming / past lists; double-booking protection |
| **2.7 Communication** | Phone dialer, WhatsApp (app, with web fallback), email app, copy contact details, share property; missing/invalid numbers and emails are handled with clear messages |
| **2.8 Notifications** | In-app notifications for follow-up reminders, site visits and (simulated) new leads; read/unread toggle, mark all read, delete, history; tap to open the related item |
| **2.9 Profile & settings** | View/edit profile, profile photo upload, change password, notification preferences (per type), dark / light / system theme, logout |

**UX:** loading, empty, success and error states on every screen · retry buttons · confirmation dialogs for destructive actions · pull-to-refresh · debounced search · infinite scroll with pagination · responsive layouts · dark mode · root error boundary.

---

## Prerequisites

- Node.js 20+ and npm
- Expo Go on a phone (or an Android emulator / iOS simulator)
- For an APK: a free [Expo](https://expo.dev) account and EAS CLI (`npm i -g eas-cli`)

## Installation & run

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
npx expo start
```

Then press `a` (Android emulator), `i` (iOS simulator), or scan the QR code with **Expo Go**.
If you see odd behaviour after updating files, run `npx expo start -c` to clear the cache.

### Configuration (optional)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of a real backend (e.g. `https://api.example.com/v1`). **When it is not set, the built-in mock API is used.** |

Create a `.env` file in the project root to set it. Mock behaviour (latency, simulated failures) can be tuned in `src/services/config.ts` — set `MOCK_CONFIG.failureRate` to e.g. `0.3` to see the error and retry states.

## Build an APK

```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview
```

The `preview` profile in `eas.json` produces an installable `.apk`. EAS prints a download link when the build finishes.

---

## Backend & API

The app talks to a REST API through a single service layer (`src/services/`): an Axios instance with a bearer-token interceptor, a 401 handler that logs the user out, and typed service modules per entity.

To keep the project runnable without any setup, the API is **simulated inside the app** (`src/services/mock/`). An Axios adapter answers requests from an in-app server that implements the endpoints below, including JWT-style tokens, validation (400/401/404/409/422), pagination and filtering. Data is seeded on first launch and persisted with AsyncStorage.

### Endpoints

All routes except the first four require `Authorization: Bearer <token>`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Sign in, returns `{ token, user }` |
| POST | `/auth/register` | Create account |
| POST | `/auth/forgot-password` | Request a reset code |
| POST | `/auth/reset-password` | Reset password with the code |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/me` | Update profile / avatar / notification preferences |
| POST | `/auth/change-password` | Change password |
| GET | `/dashboard` | Totals, leads by stage, recent activity |
| GET | `/properties` | List (query: `search`, `type`, `listingType`, `bhk`, `status`, `minPrice`, `maxPrice`, `featured`, `page`, `limit`) |
| GET | `/properties/:id` | Property details |
| POST | `/properties` | Create |
| PUT | `/properties/:id` | Update (partial allowed) |
| DELETE | `/properties/:id` | Delete (409 if visits are still scheduled) |
| GET | `/leads` | List (query: `search`, `stage`, `source`, `priority`, `assignedTo`, `page`, `limit`) |
| GET | `/leads/:id` | Lead details |
| POST | `/leads` | Create |
| PUT | `/leads/:id` | Update |
| PATCH | `/leads/:id/stage` | Change stage |
| DELETE | `/leads/:id` | Delete (also removes its follow-ups, visits and history) |
| GET | `/leads/:id/activities` | Activity history |
| POST | `/leads/:id/notes` | Add a note |
| POST | `/leads/simulate` | **Simulated** incoming lead (demo only) |
| GET | `/followups` | List (query: `view=today\|upcoming\|overdue\|all`, `leadId`, `status`) |
| GET | `/followups/:id` | Details with history |
| POST | `/followups` | Schedule |
| PUT | `/followups/:id` | Edit |
| POST | `/followups/:id/complete` | Complete (optional note) |
| POST | `/followups/:id/reschedule` | Reschedule (keeps history) |
| DELETE | `/followups/:id` | Delete |
| GET | `/visits` | List (query: `scope=upcoming\|past\|all`, `leadId`, `propertyId`, `status`) |
| GET | `/visits/:id` | Details |
| POST | `/visits` | Schedule (409 on a clash for the same property) |
| PUT | `/visits/:id` | Update status / time / feedback / remarks |
| DELETE | `/visits/:id` | Delete |
| GET | `/notifications` | List (`unread=true` to filter) + unread count |
| PATCH | `/notifications/:id` | Mark read / unread |
| POST | `/notifications/read-all` | Mark all read |
| DELETE | `/notifications/:id` | Delete |

Lists of leads and properties return `{ data: [...], meta: { page, limit, total, totalPages, hasMore } }`.
Errors return `{ message }` with an appropriate HTTP status.

### Data model (summary)

- **User** — id, name, email, phone, role, avatarUrl, preferences `{ followUps, siteVisits, newLeads }`
- **Property** — id, title, type, listingType (Buy/Rent), location, price, bhk, area, description, status, images[], featured
- **Lead** — id, name, mobile, email, source, assignedTo, priority, stage, remarks
- **Activity** — id, leadId, kind, title, description, createdAt
- **FollowUp** — id, leadId, type, scheduledAt, remarks, status, history[]
- **SiteVisit** — id, leadId, propertyId, scheduledAt, status, feedback, remarks
- **Notification** — id, type, title, message, read, refId, createdAt

### Mock API limitations (simulated functionality)

Because there is no real server, please note:

- **Simulated:** the backend itself, the JWT signature (a simple hash with the same token shape, not real cryptography), the password-reset email (the code is always `123456` and is shown in the UI), network latency, and **new-lead notifications** (generated by the "Simulate incoming lead" button).
- **Not secure by design:** passwords are stored in plain text in local storage — fine for a demo, never for production.
- **Single device:** data lives on the phone. It is shared by all accounts on that device and is lost if app data is cleared. There is no sync between devices.
- **Images:** photos chosen from the gallery are stored as local file paths, not uploaded anywhere. They can disappear if the OS clears its cache.
- **Notifications** are generated when the app talks to the API (in-app reminders only). There are no push notifications.
- **Not implemented (optional items):** offline sync, push notifications, skeleton loaders, response caching.

---

## Project structure

```
src/
  app/            Expo Router screens (file-based routes)
    (auth)/       login, register, forgot-password
    (tabs)/       dashboard, properties, leads, follow-ups, more
    lead/ property/ followup/ visit/   detail + create/edit screens
  components/     reusable UI (Button, Input, Card, pickers, forms, cards…)
  context/        AuthContext (session), ThemeContext (dark/light)
  hooks/          useFetch, usePaginatedList, useDebounce
  services/       Axios instance, service modules, mock API server + seed data
  utils/          validators (Zod), formatting, contact helpers, JWT helpers
  constants/      domain constants and theme
  types/          shared TypeScript types
```

**Architecture notes**

- **State:** Context API for the two global concerns (auth session, theme); screen data is fetched through small hooks (`useFetch`, `usePaginatedList`) that handle loading / error / refresh and ignore stale responses. No Redux is needed at this size.
- **Navigation:** Expo Router with protected route groups — signed-out users can only reach the auth screens.
- **Single source of truth:** domain values (stages, sources, statuses…) are defined once in `constants/` and used by the types, validators, UI and mock API.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` | Start and open on a device/emulator |
| `npx tsc --noEmit` | Type-check the project |
| `npm run lint` | Lint |
