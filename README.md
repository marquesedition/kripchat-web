# KripChat

KripChat is a secure, real-time mobile chat for hackers and security teams. It is built with Expo SDK 55, React Native, TypeScript, Expo Router, Zustand, Supabase Auth/Postgres/Realtime, Expo Notifications, BlurView, GlassEffect, and Reanimated.

## Features

- `hacker_handle` + password auth UX with persisted Supabase sessions
- Username, avatar URL, push token, public E2EE key, and presence profile fields
- Realtime 1:1 conversations with optimistic message sending
- Device-targeted encrypted message rows in `encrypted_messages`
- Paginated message history and Supabase Realtime inserts/updates
- Typing indicator using Realtime broadcast channels
- Device-oriented encrypted message architecture in `features/chat/chatService.ts` and `src/lib/supabase/messages.ts`
- Multi-device public key registry in `devices` and `prekeys`
- Blocking, archive, pin, mute, read receipt, disappearing message, and encrypted attachment foundations
- Membership pricing model with a `$0` Free tier contract in `lib/membershipPlans.ts`
- Mobile-first Liquid Glass UI: iOS GlassEffect with Android BlurView fallback
- Dark cybersecurity visual system with neon green/blue accents
- MVP security: RLS policies, input validation, anti-spam send throttling, and an E2EE-ready data boundary

## Developer Documentation

Start here if you are new to the codebase:

- [`docs/developer-guide.md`](docs/developer-guide.md): onboarding guide, setup, code map, auth flow, chat flow, Supabase/RLS notes, common change recipes, and PR workflow.
- [`docs/security-model.md`](docs/security-model.md): how KripChat protects chats today, what metadata remains visible, and which security claims are safe.
- [`docs/kripchat-shield-protocol.md`](docs/kripchat-shield-protocol.md): Shield protocol foundation, dual-app rollout, and the future hybrid encryption plan.
- [`public/database-data-flow.md`](public/database-data-flow.md): public-safe database data trace, use cases, and how each flow appears in Supabase.
- [`SECURITY.md`](SECURITY.md): security policy, current limits, and production-hardening checklist.
- [`docs/openapi.yaml`](docs/openapi.yaml): API and realtime surface used by the client.

## Testing And QA

This project now includes automated testing foundations with **unit tests as the primary flow**:

- `npm run test:unit` runs Jest unit tests for core helpers and stable business logic.
- `npm run test:unit:coverage` runs the same suite with coverage output.
- `npm run test:unit:report` runs unit tests and generates an HTML report.
- `npm run test:unit:report:open` runs unit tests and opens the HTML report.
- `npm run test` runs unit tests (default).
- `npm run test:all` runs unit tests plus web QA.

Web QA remains available as optional:

- `npm run test:qa` exports the web build, serves it locally, and runs Playwright smoke tests against public routes.
- `npm run test:qa:headed` runs the same QA flow with a visible browser.
- `npm run qa:report:open` opens the latest Playwright HTML report in your browser.
- `npm run test:qa:report` runs QA and opens the report immediately.

Current automated coverage focuses on:

- validation helpers
- anti-spam throttling
- crypto visual helpers
- operator identity formatting
- auth service handle-based signup/signin/signout behavior
- direct conversation guardrails (missing session, RLS failure mapping, happy path)
- chat send flow by message kind (text, image, video, audio, document, location)
- login/register/protected-route web QA smoke flows

### Unit Report (Allure-like local dashboard)

For unit tests, use the generated HTML dashboard:

```bash
npm run test:unit:report:open
```

This opens `jest_html_reporters.html` with test status and details.

### Web QA Report (Optional)

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
EXPO_PUBLIC_SITE_URL=https://kripchat.com
```

4. Apply all Supabase migrations in `supabase/migrations/`.

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

Enable Realtime for `messages`, `encrypted_messages`, conversation deletion, and chat request tables so chat inserts and destructive actions arrive instantly. The migrations create RLS policies that only let authenticated conversation members read conversation metadata, and only recipient devices or senders read rows in `encrypted_messages`.

The API surface used by the client is documented as OpenAPI/Swagger in [`docs/openapi.yaml`](docs/openapi.yaml). It covers Supabase Auth, PostgREST/RPC, Storage, Expo Push, and the Realtime channels used by the app.

The current app sends new messages through the device-targeted `encrypted_messages` flow and keeps legacy `messages` compatibility for fallback/older data. New work should prefer:

- `features/chat/chatService.ts`
- `features/chat/chatStore.ts`
- `src/lib/supabase/profiles.ts`
- `src/lib/supabase/devices.ts`
- `src/lib/supabase/conversations.ts`
- `src/lib/supabase/messages.ts`
- `src/lib/supabase/blocks.ts`
- `src/lib/supabase/storage.ts`

### Environment Variables

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SITE_URL=
```

Do not hardcode Supabase credentials in source files.

### Apply Migrations Without Docker

This repo does not require Docker to apply migrations to a hosted Supabase project. Use either a direct Postgres connection string:

```bash
SUPABASE_DB_URL='postgresql://postgres...'
npm run db:migrate:remote
```

Or authenticate/link the CLI and apply to the linked project:

```bash
npx supabase login
npx supabase link --project-ref bmvbqmibvfsbkfkcdesv
npm run db:migrate:linked
```

`SUPABASE_DB_URL` and `SUPABASE_ACCESS_TOKEN` are server-side secrets. Never prefix them with `EXPO_PUBLIC_`.

## Project Structure

```text
app/                  Expo Router screens and navigation
app/(auth)/           Login/register routes
app/(tabs)/           Authenticated inbox/profile/help tabs
app/chat/[threadId]   Open chat route and chat security controls
components/           Reusable glass UI components
features/auth/        Auth service and Zustand store
features/chat/        Chat service, types, and Zustand store
hooks/                Presence and typing realtime hooks
lib/                  Shared E2EE, Supabase client, theme, validation, UX errors
src/lib/crypto/       CryptoProvider interface and local development provider
src/lib/storage/      Secure local storage helpers for private keys and device id
src/lib/supabase/     Supabase data access layer by domain
services/             Push notification setup
supabase/migrations/  Database schema, RLS, storage policies, and helper RPCs
docs/                 Developer and security documentation
```

For deeper onboarding, read [`docs/developer-guide.md`](docs/developer-guide.md).

## Chat Security Model

Supabase must never receive message plaintext. New messages are inserted into `encrypted_messages` as one ciphertext row per recipient device, with public device bundles in `devices` and `prekeys`.

Current crypto status:

- Private keys are stored locally through `expo-secure-store` helpers and are never uploaded to Supabase.
- The `CryptoProvider` interface is shaped for a future audited Signal Protocol implementation.
- `localCryptoProvider` uses TweetNaCl sealed device envelopes for development only.
- Replace the local provider with an audited Signal Protocol implementation before production.

Metadata still visible to Supabase includes account ids, device ids, conversation membership, message timing, recipient device routing, file size/type for encrypted attachments, and delivery/read receipt timestamps when enabled.

See [`docs/security-model.md`](docs/security-model.md) for the complete threat model, safe claims, and known gaps.
