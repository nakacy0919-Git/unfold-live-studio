# UNFOLD · Live Worksheet Studio (v0.3)

**Talk. Reveal. Learn.** A beautiful live workshop worksheet studio.

## Features
- Responsive device previews for **phone (390 × 844), tablet (820 × 1180), and desktop (1366 × 820)**. Preview each inside an isolated viewport without changing the published session.
- Rotate phone/tablet previews; toggle between live published view and a private draft preview of the selected section. Draft preview never publishes a section.
- Desktop presenter studio and mobile audience view.
- Reveal sections live, QR sharing, local notes + export.
- Editable text, video, image, link, audio, QR, reflection and quote blocks.
- Reorder content, rename sections, customizable accent colors, JSON backup.
- Password-protected presenter cloud synchronization via Vercel Blob.
- Public endpoint excludes unpublished sections.

## Deployment
- Deploy to a Vercel project using Node.js 22 or newer.
- Connect a private Vercel Blob store, which installs `BLOB_READ_WRITE_TOKEN`.
- Add encrypted `UNFOLD_ADMIN_KEY` to Vercel project server environment.
- Open `/` to edit; click **クラウド接続** and enter the server admin key.
- Participants open `/?audience=1` through a QR code.
- Audience polls every six seconds for updated public content.

Do not commit credentials to GitHub. Never share an admin key inside participant QR links.

## Important prototype limitations
Only one lecture is active at a time. Browser local changes are not shared until admin cloud connection. Not load-tested at 300 attendees; a streaming/push backend (Firestore/Supabase etc.) will be better for large events. Media inputs currently accept URLs rather than direct upload. Participant notes stay on their own device. Back up via JSON before editing extensively.
## Cloud Firestore push mode (prepared; activation required)

UNFOLD now supports Firestore push updates through `onSnapshot` for audience devices. **The Firestore backend is NOT active until you configure a dedicated Firebase project and server credentials.** Until then, Vercel Blob plus 6-second polling continues working.

### Firebase console

1. In [Firebase Console](https://console.firebase.google.com/), create a dedicated Firebase project for UNFOLD. Register one **Web app**. Create a Cloud Firestore database (Native mode).
2. Open Firestore → Rules, paste and publish [firestore.rules](firestore.rules). The rules grant public GET access to **only** `unfoldLive/main`, deny client writes, and deny all other document access. **Do not apply this deny-all ruleset to an existing shared Firebase project.**
3. In Firebase Project settings → Service accounts, generate a service account private key for the dedicated project. Keep this JSON **secret**; do not paste into chat or commit it.
4. In the existing **Vercel project** → Settings → Environment Variables, configure:
   - `FIREBASE_PROJECT_ID` — Firebase web config projectId
   - `FIREBASE_API_KEY` — Firebase web app apiKey (public identifier)
   - `FIREBASE_APP_ID` — Firebase web app appId (public identifier)
   - `FIREBASE_AUTH_DOMAIN` — Firebase web app authDomain (optional, defaults to <project>.firebaseapp.com)
   - `FIREBASE_MESSAGING_SENDER_ID` — optional
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — complete **private** service account JSON as an **encrypted environment variable**, only stored in Vercel
   Retain the current `UNFOLD_ADMIN_KEY` and `BLOB_READ_WRITE_TOKEN` untouched.
5. Redeploy the existing Vercel project after adding environment variables. Open `/api/firebase-config` — `enabled:true` confirms the web app has the public configuration (this does not by itself prove Firestore permissions are correct).
6. Connect the presenter with the existing admin key. Publish or edit once to seed `unfoldLive/main`. Audience clients subscribe via Firestore; no polling is needed while the listener is healthy.
7. Test with two devices and both published and unpublished sections. Check Firebase console rules and quota usage before a large event.

### How security works

`api/session.js` accepts edits with the server-validated presenter key. The complete, private workshop JSON remains in the private Vercel Blob store. The server publishes **only** the already-open sections to Firestore. The audience reads the one read-only `unfoldLive/main` Firestore document directly using the modular Firebase Web SDK (without sign-in). Firestore security rules are at **document granularity**, so private and public content must remain separate. Never store private draft sections in the public document.

When Firebase configuration is absent or the Firestore listener fails, the audience falls back to the existing 6-second Vercel Blob polling behavior.

### Limitations and next tests

- One live session per project (multi-workshop rooms are a future feature).
- Firestore configuration, rules publishing, and privileged credentials must be provisioned in the Firebase account before the push path becomes live.
- The 300-attendee load test is not complete; measure listener counts, reconnect behavior, Firestore reads, and cost.
- The original admin-key flow remains for now. Introduce session authentication/rotation before opening this as a multi-presenter service.
