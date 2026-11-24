<!--
Copyright (c) Meta Platforms, Inc. and affiliates.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
-->

# Business Messaging Sample Tech Provider App

A [Next.js](https://nextjs.org/) reference application that demonstrates how tech providers can integrate with Meta's [WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started). It covers the full lifecycle — onboarding businesses via Embedded Signup, managing WhatsApp Business Accounts, sending and receiving messages, and handling webhooks.

## Demo

**New to this app?** Watch the step-by-step video walkthrough that covers everything you need to get up and running — creating accounts (Vercel, Ably), deploying the app, setting up the Meta Developer app, and configuring the database.

**[Watch the Setup Demo](https://github.com/fbsamples/business-messaging-sample-tech-provider-app/releases/tag/demo)**

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites) (Important)
- [Getting Started](#getting-started)
  - [Option A: Deploy to Vercel](#option-a-deploy-to-vercel-recommended)
  - [Option B: Local Development](#option-b-local-development)
- [Configuration](#configuration)
  - [1. Ably](#1-ably-real-time-messaging)
  - [2. Authentication](#2-authentication-built-in)
  - [3. Meta Developer App](#3-meta-developer-app)
  - [4. Database Setup](#4-database-setup)
- [Environment Variables](#environment-variables)
- [Going to Production](#going-to-production)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Embedded Signup** — Onboard SMBs with Facebook Login for Business (multiple ES versions supported)
- **WABA Management** — View and manage WhatsApp Business Accounts, phone numbers, and registration
- **Messaging Inbox** — Send and receive WhatsApp messages in real time via Ably WebSockets
- **Template Messaging** — Send pre-approved template messages (paid messaging)
- **Webhook Viewer** — Debug tool showing all incoming webhook payloads
- **Asset Management** — View shared Pages, Ad Accounts, Datasets, Catalogs, and Instagram Accounts
- **Authentication** — Built-in email + password accounts stored in Postgres, phone verified with a WhatsApp code

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) with [React 19](https://react.dev/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Auth | Built-in (scrypt password hashes, signed session cookie, WhatsApp OTP) |
| Database | [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (Neon) |
| Real-time | [Ably](https://ably.com/) (WebSocket-based live updates) |
| Deployment | [Vercel](https://vercel.com/) |

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18.18+** (required by Next.js 15)
- An [Ably](https://ably.com/) account and app
- A [Meta Developer](https://developers.facebook.com/) account
- A **verified Meta Business** — your business must have completed [Business Verification](https://developers.facebook.com/docs/development/release/business-verification). You will need to select this verified business when connecting your app.

## Getting Started

Choose one of the two paths below:

---

### Option A: Deploy to Vercel (Recommended)

**Step 1 — Deploy**

Click the button below to deploy to a new Vercel project. The flow will prompt you to fork the repo, connect a Neon Postgres database, and set environment variables.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffbsamples%2Fbusiness-messaging-sample-tech-provider-app&env=ABLY_KEY,SESSION_SECRET,FB_APP_ID,FB_APP_SECRET,FB_GRAPH_API_VERSION,FB_REG_PIN,FB_VERIFY_TOKEN,TP_CONTACT_EMAIL,PRIVACY_POLICY_URL,PRIVACY_POLICY_HTML&envDescription=PRIVACY_POLICY_URL%20and%20PRIVACY_POLICY_HTML%20are%20optional.%20You%20may%20provide%20either%20one%20or%20enter%20None%20for%20both.%20See%20the%20README%20for%20detailed%20descriptions%20of%20the%20variables%20to%20configure%20the%20app.&envLink=https%3A%2F%2Fgithub.com%2Ffbsamples%2Fbusiness-messaging-sample-tech-provider-app%23environment-variables&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%2C%22group%22%3A%22postgres%22%7D%5D)

**Step 2 — Set up the database**

Once deployed, open the Neon dashboard for your project and run the SQL in the [Database Schema](#database-schema) section below.

**Step 3 — Configure external services**

Follow the [Configuration](#configuration) section to set up Ably, authentication, and your Meta app.

---

### Option B: Local Development

```bash
# Clone the repository
git clone https://github.com/fbsamples/business-messaging-sample-tech-provider-app.git
cd business-messaging-sample-tech-provider-app

# Install dependencies
npm install

# Copy the example env file and fill in your values
cp .env.example .env.local

# Start the dev server (runs on https://localhost:3000)
npm run dev
```

The dev server uses Turbopack with experimental HTTPS enabled (required by the Facebook JavaScript SDK).

#### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint:all` | Run ESLint + TypeScript type-check |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |

---

## Configuration

This section walks you through setting up each external service the app depends on.

### 1. Ably (Real-time Messaging)

Ably provides real-time WebSocket connections for streaming incoming messages and webhook events to the browser.

1. Create an account at [ably.com](https://ably.com/)
2. Create a new app in the Ably dashboard
3. Copy the **API key (root)** and set it as `ABLY_KEY`

See the [Ably documentation](https://ably.com/docs) for more details.

### 2. Authentication (built-in)

Users sign up at `/signup` with first name, last name, email, phone number (any country) and a password, and log in at `/login` with email + password. Accounts live in the `users` table; pending verification codes in `auth_otps`. Both tables are created automatically on first use.

1. Set `SESSION_SECRET` to a random string of at least 32 characters (`openssl rand -hex 32`). It signs the session cookie.
2. Phone numbers are verified — and forgotten passwords reset — with a 6-digit code sent over WhatsApp from your own business number:
   - In WhatsApp Manager, create a message template with category **Authentication** and a **Copy code** button, and wait for it to be approved.
   - Set `WA_OTP_PHONE_NUMBER_ID` (the sending phone number ID), `WA_OTP_ACCESS_TOKEN` (a system user token with `whatsapp_business_messaging`), `WA_OTP_TEMPLATE_NAME` and, if it is not Turkish, `WA_OTP_TEMPLATE_LANGUAGE`.
   - Until these are set, signup shows "phone verification is not set up yet". In local development (`npm run dev`) the code is printed to the server console instead.

All app data is keyed by the user's email, so accounts created before the switch from Auth0 keep their data when the user signs up again with the same email.

### 3. Meta Developer App

#### Create the app

1. Create a [Meta Developer](https://developers.facebook.com/) account if you don't have one
2. Create a new app and **select the "Connect through WhatsApp" use case** — this is required for the app to work correctly with the WhatsApp Business Platform
3. When prompted to select a business, **choose a business that has completed [Business Verification](https://developers.facebook.com/docs/development/release/business-verification)**. The business must be verified to access WhatsApp Business Platform features.

#### Configure app settings

4. In **App Settings > Basic**:
   - Copy the **App ID** and **App Secret** to your env vars
   - Add your Vercel deployment domain to **App Domains**

#### Configure Facebook Login for Business

5. In the **Facebook Login for Business** product settings:
   - Add your deployment URL to **Valid OAuth Redirect URIs** (e.g. `https://your-app.vercel.app/`)
   - Add your deployment URL to **Allowed Domains for the JavaScript SDK**

#### Configure WhatsApp webhooks

6. In the **WhatsApp** product settings:
   - Set the **Callback URL** to `https://your-app.vercel.app/api/webhooks`
   - Set the **Verify Token** to the same value as your `FB_VERIFY_TOKEN` env var
   - Subscribe to the `messages` webhook field

#### Add testers (Development mode)

7. Add testers via **App Roles** — only users with a role on the app can use it in Development mode.

### 4. Database Setup

After deploying, run the following SQL in your Neon dashboard (or any PostgreSQL client connected to your database) to create the required tables. Each table stores data shared by businesses during the Embedded Signup flow. The `user_id` column scopes all data to the authenticated tech provider user.

<details>
<summary>Click to expand SQL schema</summary>

```sql
CREATE TABLE IF NOT EXISTS wabas (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  waba_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_waba_key ON wabas (user_id, app_id, waba_id);

CREATE TABLE IF NOT EXISTS phones (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone_id BIGINT NOT NULL,
  user_id VARCHAR,
  is_ack_bot_enabled BOOLEAN DEFAULT FALSE,
  ack_bot_message TEXT DEFAULT '',
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS phone_key ON phones (phone_id);

CREATE TABLE IF NOT EXISTS pages (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_page_key ON pages (user_id, app_id, page_id);

CREATE TABLE IF NOT EXISTS ad_accounts (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ad_account_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_ad_account_key ON ad_accounts (user_id, app_id, ad_account_id);

CREATE TABLE IF NOT EXISTS businesses (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_business_key ON businesses (user_id, app_id, business_id);

CREATE TABLE IF NOT EXISTS catalogs (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  catalog_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_catalog_key ON catalogs (user_id, app_id, catalog_id);

CREATE TABLE IF NOT EXISTS datasets (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dataset_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_dataset_key ON datasets (user_id, app_id, dataset_id);

CREATE TABLE IF NOT EXISTS instagram_accounts (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instagram_account_id BIGINT NOT NULL,
  user_id VARCHAR NOT NULL,
  app_id BIGINT NOT NULL,
  business_id BIGINT,
  access_token TEXT,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS user_app_instagram_account_key ON instagram_accounts (user_id, app_id, instagram_account_id);

-- SAP routing: which SAP service receives webhooks for a given WABA / phone number.
-- A row with phone_number_id set overrides the WABA-level row (phone_number_id NULL).
CREATE TABLE IF NOT EXISTS sap_routes (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  waba_id BIGINT NOT NULL,
  phone_number_id BIGINT,
  tenant_name VARCHAR NOT NULL,
  base_url TEXT NOT NULL,
  auth_type VARCHAR NOT NULL DEFAULT 'basic',   -- basic | oauth2 | none
  credential_key VARCHAR NOT NULL,              -- secrets in env: SAP_<KEY>_USER, SAP_<KEY>_PASSWORD, ...
  endpoints JSONB NOT NULL DEFAULT '{}',        -- {"message": "/path"} is used for every event type; add "status"/"call"/"other" only to send those elsewhere
  csrf BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_updated TIMESTAMP,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS sap_route_waba_key ON sap_routes (waba_id) WHERE phone_number_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sap_route_phone_key ON sap_routes (phone_number_id) WHERE phone_number_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sap_dispatch_log (
  key BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  route_key BIGINT,
  waba_id BIGINT,
  phone_number_id BIGINT,
  event_type VARCHAR,
  message_id VARCHAR,
  status VARCHAR,                               -- ok | error | skipped | no_route
  detail TEXT,
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: route company A's WABA to its S/4HANA OData service
-- INSERT INTO sap_routes (waba_id, tenant_name, base_url, auth_type, credential_key, endpoints)
-- VALUES (123456789012345, 'Firma A', 'https://s4.firma-a.com/sap/opu/odata/sap/ZWA_INBOUND_SRV',
--         'basic', 'FIRMA_A', '{"message": "/MessageSet", "status": "/StatusSet"}');
```

</details>

## Environment Variables

Set these in `.env.local` for local development or in your Vercel project settings for production.

```env
# Authentication
SESSION_SECRET='a-long-random-string-for-session-signing'

# WhatsApp verification codes (signup + password reset)
WA_OTP_PHONE_NUMBER_ID='sending-phone-number-id'
WA_OTP_ACCESS_TOKEN='system-user-access-token'
WA_OTP_TEMPLATE_NAME='your_authentication_template'
# WA_OTP_TEMPLATE_LANGUAGE='tr'

# Meta / Facebook
FB_APP_ID='your-facebook-app-id'
FB_APP_SECRET='your-facebook-app-secret'
FB_GRAPH_API_VERSION='v22.0'
FB_REG_PIN='your-registration-pin'
FB_VERIFY_TOKEN='your-webhook-verify-token'

# Ably
ABLY_KEY='your-ably-api-key'

# Contact
TP_CONTACT_EMAIL='your-contact-email@example.com'

# Privacy Policy (optional)
# If set, the /privacy route redirects to this URL. Leave unset to serve the
# built-in placeholder page at /privacy instead.
# PRIVACY_POLICY_URL='https://example.com/privacy'
# Alternatively, if no valid URL is set, provide the policy as inline HTML.
# PRIVACY_POLICY_HTML='<h1>Privacy Policy</h1><p>Last updated: ...</p>'

# Database (auto-configured when using Vercel + Neon integration)
# POSTGRES_URL='postgres://...'
```

| Variable | Description |
|----------|-------------|
| `SESSION_SECRET` | Random string (32+ characters) that signs login session cookies. Generate with `openssl rand -hex 32`. An existing `AUTH0_SECRET` is accepted as a fallback. |
| `WA_OTP_PHONE_NUMBER_ID` | WhatsApp phone number ID that sends signup / password-reset codes. |
| `WA_OTP_ACCESS_TOKEN` | Access token allowed to send messages from that number. |
| `WA_OTP_TEMPLATE_NAME` | Name of the approved **Authentication** template (with a copy-code button). |
| `WA_OTP_TEMPLATE_LANGUAGE` | _Optional._ Template language code; defaults to `tr`. |
| `FB_APP_ID` | Your Meta app ID from the [Meta Developer Dashboard](https://developers.facebook.com/apps/). |
| `FB_APP_SECRET` | Your Meta app secret (App Settings > Basic). |
| `FB_GRAPH_API_VERSION` | Graph API version to use (e.g. `v22.0`). |
| `FB_REG_PIN` | A 6-digit PIN used when registering WhatsApp phone numbers. |
| `FB_VERIFY_TOKEN` | A secret string you choose — Meta sends it during webhook verification to prove it's you. |
| `ABLY_KEY` | API key from your [Ably dashboard](https://ably.com/accounts). |
| `TP_CONTACT_EMAIL` | Contact email displayed in the app. |
| `PRIVACY_POLICY_URL` | _Optional._ URL of a privacy policy hosted elsewhere. If it is a valid `http(s)://` URL, `/privacy` redirects there. During Deploy to Vercel, enter `None` if you do not have one. |
| `PRIVACY_POLICY_HTML` | _Optional._ Inline privacy policy HTML, used only when `PRIVACY_POLICY_URL` is not a valid URL. During Deploy to Vercel, enter `None` if you do not have one. If neither option is provided, `/privacy` shows the built-in placeholder page. For local development, leave both variables unset. |
| `POSTGRES_URL` | PostgreSQL connection string. Auto-set when you connect Neon via Vercel. |

## Going to Production

The steps above are sufficient for development and testing with app admins and testers. To make your app available to external businesses, complete the following checklist:

- [ ] **Replace the privacy policy** — The app includes a placeholder at `/privacy`. Either set the `PRIVACY_POLICY_URL` env var to redirect `/privacy` to a policy you host elsewhere, or replace the content of `app/privacy/page.tsx` with your own. Then set the URL in **App Settings > Basic > Privacy Policy URL**.
- [ ] **Create a Tech Provider Configuration** — In the Meta Developer Dashboard, create at least one Tech Provider Configuration (config ID). The app fetches these dynamically and uses them to launch Embedded Signup.
- [ ] **Complete Business Verification** — Your business must be verified before your app can access production data from other businesses. See [Business Verification](https://developers.facebook.com/docs/development/release/business-verification).
- [ ] **Submit for App Review** — Request the permissions your app needs. See [App Review](https://developers.facebook.com/docs/resp-plat-initiatives/app-review). At minimum, request:
  - `whatsapp_business_management` — manage WABAs, phone numbers, templates, and webhook subscriptions
  - `whatsapp_business_messaging` — send text and template messages
  - Additional permissions based on your use case: `pages_show_list`, `catalog_management`, `ads_read`
- [ ] **Publish your App** — Go to App Dashboard > **Publish** and click the publish button. In Unpublished mode, only users with a role on the app can use it.
- [ ] **Verify webhook configuration** — Confirm the callback URL (`https://your-domain/api/webhooks`), verify token, and `messages` field subscription are set in **WhatsApp > Configuration**.
- [ ] **Verify OAuth redirect URIs** — Confirm your deployment URL is listed in **Facebook Login for Business > Valid OAuth Redirect URIs** and **Allowed Domains for the JavaScript SDK**.

## Project Structure

```
app/
  api/                    # API routes (server-side)
    beUtils.ts            # Graph API wrappers, DB operations
    authWrapper.ts        # withAuth() HOF for protecting API routes
    token/                # OAuth code-for-token exchange
    send/                 # Send WhatsApp messages
    register/             # Register phone with WhatsApp
    webhooks/             # Webhook listener (GET=verify, POST=incoming)
    paid_messaging/       # Template message APIs
    ...
  components/             # React components
  types/                  # Shared TypeScript type definitions
  publicConfig.ts         # Non-secret config (app ID, API version)
  privateConfig.ts        # Secret config (app secret, tokens — server-only)
  my-inbox/               # Messaging inbox page
  my-wabas/               # WABA management page
  paid_messaging/         # Template messaging page
  ...
lib/
  auth.ts                 # getSession() used by pages and API routes
  auth/                   # Password hashing, sessions, phone validation, WhatsApp OTP, signup/login flows
middleware.ts             # Redirects legacy /auth/* URLs
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on code style, security practices, and how to submit changes.

## License

This project is MIT licensed, as found in the [LICENSE](LICENSE) file.

Terms of Use — https://opensource.facebook.com/legal/terms

Privacy Policy — https://opensource.facebook.com/legal/privacy
