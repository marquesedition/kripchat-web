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

## Testing And QA

This project now includes automated testing foundations for both logic and web QA:

- `npm run test:unit` runs Jest unit tests for core helpers and stable business logic.
- `npm run test:unit:coverage` runs the same suite with coverage output.
- `npm run test:qa` exports the web build, serves it locally, and runs Playwright smoke tests against public routes.
- `npm run test:qa:headed` runs the same QA flow with a visible browser.
- `npm run qa:report:open` opens the latest Playwright HTML report in your browser.
- `npm run test:qa:report` runs QA and opens the report immediately.
- `npm run test` runs unit tests plus QA end-to-end checks.

Current automated coverage focuses on:

- validation helpers
- anti-spam throttling
- crypto visual helpers
- operator identity formatting
- auth service signup/confirmation behavior
- direct conversation guardrails (missing session, unconfirmed email, RLS failure mapping)
- login/register/protected-route web QA smoke flows

### QA Report (Allure-like local dashboard)

Playwright's HTML report gives a visual test dashboard similar to Allure for local use, including per-test steps, traces, screenshots on failure, and filtering by project.

```bash
npm run test:qa:report
```

If you already ran QA and only want to open the report again:

```bash
npm run qa:report:open
```

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
```

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
