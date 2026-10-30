# UNFOLD · Live Worksheet Studio

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