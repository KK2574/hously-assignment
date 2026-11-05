# Hously CRM — Mini Real Estate CRM (React Native)

A mobile CRM for managing property listings, customer leads, follow-ups, site visits and notifications. Built with **Expo (React Native) + TypeScript** for the Hously Finntech Realty Round 2 assignment.

> **Important:** the app runs against a **built-in mock REST API** (no separate server). See [Mock API & limitations](#mock-api--limitations) for exactly what is simulated.

---

## Test credentials

| Field    | Value            |
| -------- | ---------------- |
| Email    | `demo@hously.in` |
| Password | `Demo@123`       |

You can also register a new account from the Register screen.

**Forgot password (demo):** enter `demo@hously.in`, then use the reset code **`123456`** (the code is also shown on screen as a demo hint, since no email is actually sent).

---

## Features

- **Auth:** login, register, forgot/reset password, JWT session, token in secure storage, session restored on restart, protected routes, logout
- **Dashboard:** summary cards (properties, leads, active leads, follow-ups due today, closed deals), lead-stage overview chart, recent activity, quick actions
- **Properties:** create / view / edit / delete (with confirmation), image gallery, featured flag, search, filters (type, budget, Buy/Rent, BHK, status), share sheet, paginated list with debounced search
- **Leads:** CRUD, sources, stages, priority, assigned executive, search and filters, per-lead activity history and notes
- **Follow-ups:** schedule (date, time, type, remarks), Today / Upcoming / Overdue views, complete, reschedule, update, with retained history
- **Site visits:** schedule by lead + property + date/time, statuses, feedback and remarks, upcoming visits
- **Communication:** phone dialer, WhatsApp, email, copy contact details, share property info, graceful handling of missing or invalid contacts
- **Notifications:** in-app notifications for follow-ups, visits and simulated new leads, read/unread, history
- **Profile & settings:** edit profile, profile photo, change password, notification preferences, dark/light theme, logout
- **UX:** loading, empty, error (with retry) and success states; confirmation dialogs; reusable components

---

## Tech stack

| Area        | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| Framework   | Expo SDK 58, React Native 0.88, React 19                  |
| Language    | TypeScript                                                |
| Navigation  | Expo Router (file-based, built on React Navigation)       |
| Networking  | Axios with a service layer (`src/services`)               |
| State       | React Context (`AuthContext`, `ThemeContext`) + custom hooks (`useFetch`, `usePaginatedList`, `useDebounce`) |
| Forms       | react-hook-form + zod validation                          |
| Storage     | `expo-secure-store` (JWT), AsyncStorage (mock database)   |

State management uses Context because the app-wide state is small (auth session and theme). Screen data is fetched per screen through hooks, so a global store like Redux wasn't justified.

---

## Prerequisites

- Node.js 20 or newer and npm
- Android phone or emulator, or iOS simulator
- [Expo Go](https://expo.dev/go) on a physical device (for the quickest run)
- For building the APK: a free [Expo account](https://expo.dev/signup)

## Installation and run

```bash
git clone https://github.com/KK2574/hously-assignment.git
cd hously-assignment
npm install
npx expo start
```

Then scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `a` for an Android emulator / `i` for an iOS simulator.

## Configuration

No configuration is needed. By default the app uses the built-in mock API.

To point the app at a real backend instead, copy `.env.example` to `.env` and set:

```
EXPO_PUBLIC_API_URL=https://your-api.example.com/v1
```

When this variable is set, the mock adapter is disabled and all requests go to that URL with a `Bearer` token. The endpoint list below is the contract a real backend would need to follow.

## Build an Android APK

```bash
npm install -g eas-cli
eas login
eas init
eas build -p android --profile preview
```

When the build finishes, EAS prints a download link for the `.apk`. Install it on an Android device (allow installs from unknown sources).

---

## Mock API & limitations

The mock server lives in `src/services/mock/` and is plugged into Axios as a custom adapter, so screens and services use the same code path as a real HTTP backend (headers, interceptors, status codes, error handling).

**What is simulated**

- **All data is stored on the device** in AsyncStorage, seeded on first launch with sample properties, leads, follow-ups, visits and notifications. It persists across restarts but is **not shared between devices or users**.
- **JWT is generated locally** by the mock server; it is stored securely and used for the `Authorization` header, but it is not cryptographically meaningful.
- **Network latency** (250–650 ms) is simulated. `MOCK_CONFIG.failureRate` in `src/services/config.ts` can be raised to test error and retry states.
- **Forgot password:** no email is sent. The reset code is the fixed demo value `123456`.
- **New-lead notifications** are simulated (`POST /leads/simulate`).
- **Property images** use placeholder photos from picsum.photos for seed data. Images picked from the device are stored as local file URIs, so they only display on that device.
- **Push notifications are not implemented.** Reminders are in-app only.
- **No offline sync.** Data is local, but there is no sync layer.
- Passwords are stored in plain text in the mock database for demo purposes only. A real backend must hash them.

---

## API endpoint list

Base URL: `https://api.hously.mock/v1` (virtual; handled in-app). All routes except the auth ones that are marked "public" require `Authorization: Bearer <token>`. List endpoints accept `page` and `limit` and return `{ data, meta: { page, limit, total, totalPages, hasMore } }`.

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/auth/login` | Log in, returns user and JWT (public) |
| POST | `/auth/register` | Create account (public) |
| POST | `/auth/forgot-password` | Request reset code (public) |
| POST | `/auth/reset-password` | Reset password with code (public) |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/me` | Update profile, avatar, notification preferences |
| POST | `/auth/change-password` | Change password |
| GET | `/dashboard` | Summary counts, lead-stage breakdown, recent activity |
| GET | `/properties` | List with search and filters |
| GET | `/properties/:id` | Property details |
| POST | `/properties` | Create property |
| PUT | `/properties/:id` | Update property |
| DELETE | `/properties/:id` | Delete property |
| GET | `/leads` | List with search and filters |
| POST | `/leads/simulate` | Simulate an incoming new lead |
| GET | `/leads/:id` | Lead details |
| POST | `/leads` | Create lead |
| PUT | `/leads/:id` | Update lead |
| PATCH | `/leads/:id/stage` | Change lead stage |
| DELETE | `/leads/:id` | Delete lead |
| GET | `/leads/:id/activities` | Lead activity history |
| POST | `/leads/:id/notes` | Add a note to a lead |
| GET | `/followups` | List (Today / Upcoming / Overdue via filters) |
| GET | `/followups/:id` | Follow-up details and history |
| POST | `/followups` | Schedule follow-up |
| PUT | `/followups/:id` | Update follow-up |
| POST | `/followups/:id/complete` | Mark completed |
| POST | `/followups/:id/reschedule` | Reschedule |
| DELETE | `/followups/:id` | Delete follow-up |
| GET | `/visits` | List site visits |
| GET | `/visits/:id` | Visit details |
| POST | `/visits` | Schedule visit |
| PUT | `/visits/:id` | Update visit, status, feedback |
| DELETE | `/visits/:id` | Delete visit |
| GET | `/notifications` | Notification history |
| POST | `/notifications/read-all` | Mark all as read |
| PATCH | `/notifications/:id` | Mark one read/unread |
| DELETE | `/notifications/:id` | Delete notification |

**Error handling:** failures return a status code and `{ message }`. Typical codes are 400 (bad request), 401 (unauthorized, logs the user out), 404 (not found) and 422 (validation). The UI shows the message with a retry option.

---

## Data model (core entities)

There is no SQL database. The mock database is a JSON document with these collections, defined in `src/types/index.ts` and seeded in `src/services/mock/seed.ts`:

- `users`: id, name, email, password, phone, role, avatarUrl, preferences, createdAt
- `properties`: id, title, type, listingType (Buy/Rent), location, price, bhk, area, description, status, images, featured
- `leads`: id, name, mobile, email, source, assigned executive, priority, stage, remarks, activities
- `followUps`: id, leadId, date/time, type, status, remarks, history
- `visits`: id, leadId, propertyId, date/time, status, feedback, remarks
- `notifications`: id, type, title, message, read, createdAt

## Project structure

```
src/
├── app/          # Screens and routes (Expo Router): (auth), (tabs), lead, property, followup, visit, ...
├── components/   # Reusable UI (Button, Card, Input, forms, pickers, states)
├── constants/    # Theme tokens and option lists
├── context/      # AuthContext, ThemeContext
├── hooks/        # useFetch, usePaginatedList, useDebounce
├── services/     # Axios client, token storage, service functions
│   └── mock/     # In-app mock REST API (seed data, server, storage)
├── types/        # Shared TypeScript types
└── utils/        # Validators, formatting, contact helpers, JWT helpers
```

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Start and open on Android |
| `npm run ios` | Start and open on iOS |
| `npx tsc --noEmit` | Type-check the project |

## Screenshots and demo

Screenshots are in `docs/screenshots/`. Demo video: _add link here_.

## Resetting demo data

Clear the app's storage (or reinstall the app) to re-seed the mock database.