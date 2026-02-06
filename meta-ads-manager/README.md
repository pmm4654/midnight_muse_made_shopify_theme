# Meta Ads Manager — AI-Powered Campaign Management for Shopify

A self-hosted web application that connects your Shopify store to Meta (Facebook/Instagram) Ads Manager with an AI assistant powered by Claude. Describe campaigns in plain English, get suggestions, create drafts, review them, and publish — all through conversation.

## What It Does

- **Natural language campaign creation**: Tell the AI what you want ("Run a campaign to promote my summer collection to women 25-45 in the US") and it builds the full campaign structure
- **Draft-first workflow**: All campaigns are created in PAUSED status. Nothing goes live until you explicitly approve and activate
- **Performance assessment**: Ask the AI to analyze your running campaigns and get specific, actionable recommendations
- **Full campaign management**: Create, pause, activate, and delete campaigns, ad sets, and ads from the dashboard
- **Store-aware suggestions**: The AI reads your Shopify products, collections, and sales data to make informed ad recommendations

## Architecture

```
meta-ads-manager/
├── server.js              Express server (entry point)
├── services/
│   ├── meta-api.js        Meta Marketing API wrapper
│   ├── shopify-api.js     Shopify Admin API wrapper
│   └── claude-ai.js       Claude AI conversation service
├── routes/
│   ├── auth.js            Meta OAuth flow
│   ├── campaigns.js       Campaign CRUD + bulk creation
│   ├── ai.js              AI chat, suggestions, assessment
│   ├── analytics.js       Performance metrics
│   ├── shopify.js         Store data endpoints
│   └── settings.js        Configuration management
└── public/                Single-page web application
    ├── index.html         SPA shell with all view templates
    ├── css/styles.css     Dark theme UI
    └── js/app.js          Client-side router and controllers
```

## Prerequisites

You need three things:

### 1. Meta Business Account + Developer App

1. Go to [business.facebook.com](https://business.facebook.com/) and create or log into your Business account
2. Create an Ad Account if you don't have one: Business Settings > Ad Accounts > Add
3. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps/) and create a new app:
   - Choose **Business** type
   - Add the **Marketing API** product
4. Note your **App ID** and **App Secret** from Settings > Basic
5. Note your **Ad Account ID** (format: `act_XXXXXXXXX`) from Business Settings > Ad Accounts

**Getting an Access Token (two options):**

- **Option A — OAuth (recommended)**: The setup wizard handles this. Enter your App ID and App Secret, then click "Connect with Facebook" to authorize via OAuth. This generates a long-lived token (60 days).
- **Option B — Graph API Explorer**: Go to [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer/), select your app, and request these permissions: `ads_management`, `ads_read`, `business_management`, `pages_read_engagement`. Generate a token and paste it into the setup wizard.

### 2. Shopify Custom App

1. In your Shopify Admin, go to **Settings > Apps and sales channels > Develop apps**
2. Enable custom app development if prompted
3. Click **Create an app**, name it "Meta Ads Manager"
4. Click **Configure Admin API scopes** and enable:
   - `read_products` — so the AI can see your product catalog
   - `read_orders` — so the AI can understand sales patterns
   - `read_customers` — for audience insight (optional)
5. Click **Install app** and copy the **Admin API access token** (starts with `shpat_`)

### 3. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account or log in
3. Go to **API Keys** and create a new key
4. Copy the key (starts with `sk-ant-`)

## Installation

```bash
cd meta-ads-manager
npm install
```

## Configuration

### Option A: Use the setup wizard (recommended)

```bash
npm start
```

Open `http://localhost:3456` in your browser. The setup wizard walks you through connecting all three services with inline instructions and connection testing.

### Option B: Manual .env file

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```
META_APP_ID=123456789012345
META_APP_SECRET=your_app_secret
META_AD_ACCOUNT_ID=act_123456789
META_ACCESS_TOKEN=your_long_lived_token
META_API_VERSION=v21.0

SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxx

ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

PORT=3456
SESSION_SECRET=some-random-secret-string
APP_URL=http://localhost:3456
```

Then start the server:

```bash
npm start
```

## Usage

### Setup Wizard (`http://localhost:3456/#/setup`)

Three-step wizard that guides you through connecting Meta, Shopify, and Claude. Each step has a "Test Connection" button to verify your credentials before proceeding.

### Dashboard (`http://localhost:3456/#/dashboard`)

Overview of your advertising account: total spend, impressions, clicks, and CTR. Lists all campaigns with quick actions to activate, pause, or request an AI assessment.

### AI Assistant (`http://localhost:3456/#/assistant`)

The core feature. A chat interface where you interact with Claude to:

**Suggest campaigns:**
> "Suggest a campaign to drive traffic to my best-selling products"

The AI analyzes your Shopify product catalog, recent sales, and store data, then suggests a complete campaign structure with targeting, budget, and ad copy.

**Create drafts:**
When the AI suggests a campaign, a "Create as Draft" button appears. Click it to create the campaign in Meta's system in PAUSED status. Nothing is spent until you activate.

**Ask questions:**
> "Why did you choose that targeting? What about a younger audience?"
> "Can we lower the budget to $10/day instead?"

The AI explains its reasoning and can adjust the spec.

**Assess performance:**
> "How are my campaigns doing? Any I should pause?"

The AI pulls real performance data from Meta's Insights API and provides analysis with specific recommendations.

**Execute changes:**
> "Go ahead and activate the summer collection campaign"
> "Pause the campaign that's underperforming"

### Campaigns (`http://localhost:3456/#/campaigns`)

Full campaign management view. Filter by status (All / Active / Paused). Activate, pause, delete, or request AI assessment for any campaign.

### Analytics (`http://localhost:3456/#/analytics`)

Performance metrics across your account with date range filtering. Click "AI Assessment" for a Claude-powered analysis of your campaign performance with actionable next steps.

## How the AI Works

When you chat with the assistant:

1. **Context gathering**: The app fetches your Shopify products, collections, and recent orders, plus your Meta campaign data
2. **Claude analysis**: This context is sent to Claude along with your message and conversation history
3. **Structured output**: Claude responds with explanations in plain English, plus structured JSON campaign specs when appropriate
4. **Spec extraction**: The app detects campaign specs in Claude's response and shows a preview card with a "Create as Draft" button
5. **API execution**: When you approve, the app calls Meta's Marketing API to create the campaign, ad sets, ad creatives, and ads — all in PAUSED status

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/meta/test` | Test Meta connection |
| GET | `/api/auth/meta/login` | Start Meta OAuth flow |
| POST | `/api/ai/chat` | Chat with AI assistant |
| POST | `/api/ai/suggest` | Get campaign suggestions |
| POST | `/api/ai/assess` | Get performance assessment |
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns` | Create a campaign |
| POST | `/api/campaigns/create-from-spec` | Create full campaign from AI spec |
| POST | `/api/campaigns/:id/activate` | Activate (publish) a campaign |
| POST | `/api/campaigns/:id/pause` | Pause a campaign |
| GET | `/api/analytics/summary` | Dashboard analytics |
| GET | `/api/analytics/campaign/:id` | Campaign-specific insights |
| GET | `/api/shopify/products` | List Shopify products |
| GET | `/api/shopify/summary` | Store summary for AI context |
| GET/POST | `/api/settings` | Read/update configuration |

## Security Notes

- The `.env` file contains sensitive API keys. It is listed in `.gitignore` and should never be committed.
- The app is designed for local/private use. If deploying to a server, add authentication middleware to protect the API endpoints.
- Meta access tokens expire after 60 days. The app will notify you when re-authentication is needed.
- All campaign creation defaults to PAUSED status to prevent accidental ad spend.

## Connecting Meta to Shopify (Meta Pixel / CAPI)

For optimal ad performance, you should also install the **Meta Pixel** on your Shopify store. This enables:

- **Conversion tracking**: Meta knows when ad clicks lead to purchases
- **Retargeting audiences**: Create audiences of people who visited your store
- **Lookalike audiences**: Find new customers similar to your buyers

To set this up:

1. In Meta Business Suite, go to **Events Manager** > **Data Sources** > **Add** > **Web**
2. Name it and click **Connect** > **Meta Pixel**
3. In Shopify Admin, go to **Online Store** > **Preferences**
4. Paste your **Meta Pixel ID** in the Facebook Pixel field
5. For server-side tracking (CAPI), install the **Facebook & Instagram** sales channel from the Shopify App Store

This Ads Manager app handles campaign creation and management. The Pixel/CAPI handles conversion tracking independently.
