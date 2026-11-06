# Hously CRM: Express + MongoDB backend

REST API for the Hously CRM app. It implements the same endpoints as the app's built-in mock API (see the endpoint table in the main README), so the app switches between the two by changing one environment variable.

**Live API:** `https://hously-assignment.onrender.com/v1` (health check: `https://hously-assignment.onrender.com/health`)
**Demo login:** `demo@hously.in` / `Demo@123`

## Run locally

```bash
cd backend
npm install
cp .env.example .env        # then set JWT_SECRET and MONGODB_URI
npm run seed                # loads demo data (demo@hously.in / Demo@123)
npm run dev                 # http://localhost:5000
```

Check it: `GET http://localhost:5000/health` returns `{"status":"ok"}`.

**MongoDB:** either install MongoDB Community locally (`mongodb://127.0.0.1:27017/hously_crm`) or create a free cluster on MongoDB Atlas and paste its `mongodb+srv://...` string into `MONGODB_URI`. For Atlas, allow your IP (or `0.0.0.0/0` for a demo) under Network Access.

`npm run seed` **wipes every collection** before loading demo data. It uses whatever `MONGODB_URI` is set, so check which database you are pointing at before running it.

## Point the app at it

In the app's root `.env`:

| Where the app runs | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Android emulator | `http://10.0.2.2:5000/v1` |
| iOS simulator | `http://localhost:5000/v1` |
| Real phone (same Wi-Fi) | `http://<your-PC-LAN-IP>:5000/v1` |
| Built APK | an **HTTPS** URL (see below) |

Restart Expo with `npx expo start -c` after changing it. Leave the variable unset to use the mock API again.

## APK builds need HTTPS

Android release builds block plain `http://` traffic. For the APK, deploy this API somewhere with HTTPS (this project uses Render) with the same environment variables as your `.env` (`MONGODB_URI`, `JWT_SECRET`, and so on). Then bake the URL into the build with an EAS environment variable:

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --value "https://hously-assignment.onrender.com/v1" --environment production --visibility plaintext --type string --scope project
```

Check it saved:

```bash
npx eas-cli@latest env:list --environment production
```

Build the APK against the real backend with the `preview-backend` profile, which reads the `production` environment:

```bash
npx eas-cli@latest build -p android --profile preview-backend
```

The plain `preview` profile has no URL set, so it builds an APK that runs on the built-in mock API.

Free tiers sleep when idle, so the first request after a pause can take 30 to 60 seconds.

## Data model (MongoDB collections)

| Collection | Key fields |
| --- | --- |
| `users` | name, email (unique), password (bcrypt hash), phone, role, avatarUrl, preferences, reset-code hash and expiry |
| `properties` | title, type, listingType, location, price, bhk, area, description, status, images[], featured |
| `leads` | name, mobile, email, source, assignedTo, priority, stage, remarks |
| `activities` | leadId, kind, title, description |
| `followups` | leadId, type, scheduledAt, remarks, status, completedAt, history[{action, note, at}] |
| `visits` | leadId, propertyId, scheduledAt, status, feedback, remarks |
| `notifications` | user, type, title, message, read, refId |

All collections have `createdAt` / `updatedAt`. Mongoose schemas are in `src/models.js`.

## Behaviour worth knowing

- **Auth:** passwords are hashed with bcrypt; the JWT (`sub` = user id) expires after `JWT_EXPIRES_IN`.
- **Password reset:** no email service is connected. With `DEMO_RESET_CODE` set, that fixed code is accepted and returned as `devHint`. With it empty, a random code is printed in the server log.
- **Shared data:** properties, leads, follow-ups and visits are shared by all users (a team CRM). Notifications are per user.
- **Housekeeping:** on authenticated requests (at most every 15 seconds per user) pending follow-ups more than a day late become "Missed", and reminders are created for follow-ups due within 2 hours and visits within 24 hours.
- **Visit clashes:** the API rejects a scheduled visit when the same property already has one scheduled within an hour.
- **"Today":** follow-up day boundaries use `TZ_OFFSET_MINUTES` (330 = IST).
- **Images:** the app sends local file URIs for property photos and the profile picture. Those only display on the phone that picked them. Real cross-device images need a file upload endpoint (multer plus cloud storage); not implemented.
- **Simulated lead:** `POST /v1/leads/simulate` creates a fake incoming enquiry and a notification record for the signed-in user. In the app, the Simulate button on the Notifications screen calls it, then posts a real phone notification using `expo-notifications`. That phone notification is local (fired by the app when you tap the button); notifications while the app is closed would need push (Firebase) support, which is not implemented.