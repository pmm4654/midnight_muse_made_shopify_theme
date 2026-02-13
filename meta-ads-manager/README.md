# Meta Ads Manager — AI-Powered Campaign Management for Shopify

A lightweight, self-hosted Node.js app that connects your Shopify store to Facebook (Meta) Ads Manager with an AI assistant powered by Claude. Describe campaigns in plain English, get suggestions, create drafts, review them, and publish — all through conversation.

## What It Does

- **Natural language campaign creation**: Tell the AI what you want and it builds the full campaign structure
- **Draft-first workflow**: All campaigns are created in PAUSED status — nothing goes live without explicit approval
- **Performance assessment**: Ask the AI to analyze running campaigns and get actionable recommendations
- **Full campaign management**: Create, pause, activate, and delete campaigns from the dashboard
- **Store-aware suggestions**: The AI reads your Shopify products, collections, and sales data

## Security Model

Credentials are managed **exclusively through environment variables**. The web UI:
- Never accepts secrets through form fields
- Never writes to `.env` or any file on disk
- Only reports which env vars are set (true/false), never their values
- The settings API is read-only

## Environment Variables

```bash
# Facebook (Meta) Marketing API
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_AD_ACCOUNT_ID=act_123456789
FACEBOOK_ACCESS_TOKEN=your_long_lived_token

# Shopify Store
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_CLIENT_ID=your_app_client_id
SHOPIFY_API_KEY=shpat_xxxxxxxxxxxxx

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
ANTHROPIC_BASE_URL=http://localhost:8888

# Optional
PORT=3456
APP_URL=http://localhost:3456
```

## Prerequisites

### 1. Facebook Business Account + Developer App

1. Go to [business.facebook.com](https://business.facebook.com/) and create/log into your Business account
2. Create an Ad Account: Business Settings > Ad Accounts > Add
3. Create a developer app at [developers.facebook.com/apps](https://developers.facebook.com/apps/) (type: Business, add Marketing API)
4. Copy **App ID** and **App Secret** from Settings > Basic → set as `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`
5. Find your **Ad Account ID** (with `act_` prefix) → set as `FACEBOOK_AD_ACCOUNT_ID`

**Getting an Access Token:**

- **Option A — OAuth**: Set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` in your env, start the server, and click "Generate Token via Facebook Login" in the setup wizard. The token is displayed once — copy it into your env as `FACEBOOK_ACCESS_TOKEN` and restart.
- **Option B — Graph API Explorer**: Go to [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer/), select your app, request permissions `ads_management`, `ads_read`, `business_management`. Generate a token → set as `FACEBOOK_ACCESS_TOKEN`.

### 2. Shopify Custom App

1. In Shopify Admin: **Settings > Apps and sales channels > Develop apps**
2. Create an app named "Meta Ads Manager"
3. Configure Admin API scopes: `read_products`, `read_orders`, `read_customers`
4. Install the app and copy the **Admin API access token** (starts with `shpat_`) and the **Client ID**
5. Set `SHOPIFY_STORE_DOMAIN` to your store's `.myshopify.com` domain
6. Set `SHOPIFY_CLIENT_ID` to the app's client ID
7. Set `SHOPIFY_API_KEY` to the Admin API access token

### 3. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an API key → set as `ANTHROPIC_API_KEY`

**Local proxy (optional):**
If you run an Anthropic-compatible local proxy (e.g., CCProxy API), set:
`ANTHROPIC_BASE_URL=http://localhost:PORT` and leave `ANTHROPIC_API_KEY` empty.

## Installation & Startup

```bash
cd meta-ads-manager
cp .env.example .env   # Edit with your credentials
npm install
npm start              # http://localhost:3456
```

### Start with Local Proxy (Claude Code / CCProxy SDK)

If you want to use a local Anthropic-compatible proxy (CCProxy SDK mode), run:

```bash
npm run start:proxy
```

This script will:
- Start CCProxy if it's not running
- Discover the proxy port automatically
- Export `ANTHROPIC_BASE_URL` (SDK route) and `ANTHROPIC_API_KEY=local-proxy`
- Start the app

The setup wizard at `/#/setup` shows which env vars are set, explains how to obtain each credential, and lets you test each connection.

## Usage

### AI Assistant (`/#/assistant`)

The core feature. Chat with Claude to:

- **"Suggest a campaign to drive traffic to my best-selling products"** → AI analyzes your Shopify catalog and builds a full campaign spec
- **"Create a retargeting campaign for store visitors"** → AI structures targeting, budget, and ad copy
- **"How are my campaigns doing?"** → AI pulls Facebook Insights data and provides analysis
- **"Activate the summer campaign"** → Execute changes through conversation

When the AI suggests a campaign, a **"Create as Draft"** button appears. Click it to create the campaign in Facebook's system in PAUSED status.

### Dashboard (`/#/dashboard`)

Spend, impressions, clicks, CTR. Lists all campaigns with activate/pause controls.

### Analytics (`/#/analytics`)

Performance metrics with date range filtering and Claude-powered AI Assessment.

### Settings (`/#/settings`)

Read-only view of which env vars are configured and live connection status for each service.

## Architecture

```
meta-ads-manager/
├── server.js              Lightweight Express server
├── services/
│   ├── meta-api.js        Facebook Marketing API wrapper
│   ├── shopify-api.js     Shopify Admin API wrapper
│   └── claude-ai.js       Claude AI conversation service
├── routes/
│   ├── auth.js            Facebook OAuth flow
│   ├── campaigns.js       Campaign CRUD + bulk creation from AI specs
│   ├── ai.js              AI chat, suggestions, performance assessment
│   ├── analytics.js       Performance metrics from Facebook Insights
│   ├── shopify.js         Store data endpoints
│   └── settings.js        Read-only env var status
└── public/                Single-page web application
    ├── index.html         SPA shell with all view templates
    ├── css/styles.css     Dark theme UI
    └── js/app.js          Client-side router and controllers
```

Dependencies: `express`, `dotenv`, `node-fetch`, `@anthropic-ai/sdk` (4 packages).

## Connecting Meta Pixel to Shopify

For conversion tracking (so Facebook knows when ad clicks lead to purchases), separately install the **Facebook & Instagram** sales channel from the Shopify App Store, or manually add your Meta Pixel ID in Shopify Admin > Online Store > Preferences.
