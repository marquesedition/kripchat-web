# KripChat

KripChat is a secure, real-time mobile chat for hackers and security teams. It is built with Expo SDK 55, React Native, TypeScript, Expo Router, Zustand, Supabase Auth/Postgres/Realtime, Expo Notifications, BlurView, GlassEffect, and Reanimated.

## Features

- Email/password auth with persisted Supabase sessions
- Username, avatar URL, push token, and presence profile fields
- Realtime 1:1 conversations with optimistic message sending
- Paginated message history and Supabase Realtime inserts
- Typing indicator using Realtime broadcast channels
- Mobile-first Liquid Glass UI: iOS GlassEffect with Android BlurView fallback
- Dark cybersecurity visual system with neon green/blue accents
- MVP security: RLS policies, input validation, anti-spam send throttling, and an E2EE-ready data boundary

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env
```

3. Fill in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

4. Apply the Supabase migration in `supabase/migrations/202604220001_kripchat_schema.sql`.

5. Start Expo:

```bash
npx expo start

For web development:

```bash
npm run web
```

## Deploy Web To `kripchat.com`

This repo is set up to deploy the web app to GitHub Pages on every push to `main`.

Production structure:

- Custom domain: `https://kripchat.com`
- `CNAME` file: `kripchat.com`
- Build output: Expo static export to `dist/`
- Workflow: `.github/workflows/deploy-pages.yml`

Repository setup required in GitHub:

1. In the repo settings, enable GitHub Pages with GitHub Actions as the source.
2. Add these repository secrets:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

3. If the repo needs auto-enablement for Pages, also add:

```text
PAGES_ADMIN_PAT
```

Local production export:

```bash
npm run web:export
```

DNS for `kripchat.com` on GitHub Pages:

- `A` -> `185.199.108.153`
- `A` -> `185.199.109.153`
- `A` -> `185.199.110.153`
- `A` -> `185.199.111.153`
- Optional `TXT` verification -> value provided by GitHub for this domain

Notes:

- `app.json` uses `"web.output": "static"` so Expo exports a `dist/` folder ready for Pages.
- `public/CNAME` ensures the custom domain is preserved in the deployed artifact.
- `eas.json` remains available for iOS and Android cloud builds.

## Build iOS And Android

Cloud builds for both stores can be created with EAS Build:

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli build --platform android --profile production
```

Useful profiles:

- `development`: development client
- `preview`: internal testing build
- `production`: store-ready build with auto-incrementing version code/build number

After the first successful production builds, you can submit them with EAS Submit or upload them manually to App Store Connect and Google Play Console.
```

## Supabase Notes

Enable Realtime for the `messages` table in Supabase so chat inserts arrive instantly. The migration creates RLS policies that only let authenticated conversation members read and send messages. User creation is handled by the `handle_new_user` trigger, which copies the registered username into `profiles`.

## Project Structure

```text
app/                  Expo Router screens and navigation
components/           Reusable glass UI components
features/auth/        Auth service and Zustand store
features/chat/        Chat service, types, and Zustand store
hooks/                Presence and typing realtime hooks
lib/                  Supabase client, theme, validation, anti-spam helpers
services/             Push notification setup
supabase/migrations/  Database schema, RLS, and helper RPCs
```

## E2EE Readiness

Messages are plain text in this MVP so realtime, pagination, moderation boundaries, and UX can be validated first. The `messages.body` field and chat service are intentionally isolated so client-side encryption can later be added before insert and after fetch without reshaping the UI.
