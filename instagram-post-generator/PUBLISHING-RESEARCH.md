# Instagram Auto-Publishing Research (March 2026)

Research into options for adding automated Instagram publishing to the Midnight Muse Made Instagram Post Generator app (Node.js/Express).

---

## Table of Contents
1. [Official Instagram Graph API (Direct)](#1-official-instagram-graph-api-direct)
2. [Unified Social Media APIs (SaaS)](#2-unified-social-media-apis-saas)
3. [Workflow Automation Platforms](#3-workflow-automation-platforms)
4. [Apify](#4-apify)
5. [Unofficial / Private API Libraries](#5-unofficial--private-api-libraries)
6. [Shopify-Specific Integrations](#6-shopify-specific-integrations)
7. [Comparison Matrix](#7-comparison-matrix)
8. [Recommendation](#8-recommendation)

---

## 1. Official Instagram Graph API (Direct)

The Instagram Graph API from Meta is the **only officially sanctioned way** to publish content to Instagram programmatically. All legitimate third-party tools (Buffer, Hootsuite, Late, etc.) use this API under the hood.

### What It Supports
- **Single image posts** (JPEG only, max 8MB)
- **Carousel posts** (up to 10 images/videos)
- **Reels** (video, since mid-2022)
- **Stories** (since 2023)
- **Scheduled publishing** (native scheduling via `published=false` + `scheduled_publish_time`)
- **Alt text** on images (added March 2025)

### Requirements
- **Instagram Business or Creator account** (Personal accounts CANNOT use this API)
- **Facebook Page linked** to the Instagram account
- **Meta Developer App** created at developers.facebook.com
- **App Review** required for production use (instagram_basic, instagram_content_publish, pages_read_engagement permissions)
- **Long-lived access tokens** (60-day expiry, must be refreshed)
- Images must be hosted at a **publicly accessible URL** (no local files -- you upload a URL, Meta fetches it)

### Rate Limits
- **25 posts per 24-hour period** per account (was 50, reduced)
- Can check limits via `GET /<IG_USER_ID>/content_publishing_limit`

### Publishing Flow (Two-Step)
```
Step 1: POST /<IG_USER_ID>/media
        { image_url, caption, ... }
        -> Returns creation_id

Step 2: POST /<IG_USER_ID>/media_publish
        { creation_id }
        -> Returns media_id (published!)
```

### Cost / Complexity / Risk
| Attribute | Value |
|-----------|-------|
| Monthly cost | **$0** (free API) |
| Setup complexity | **Hard** -- Meta App Review process is notoriously slow (weeks to months), token management is fiddly |
| Reliability | **High** -- it's the official API |
| Account risk | **None** -- this is the approved method |
| Scheduling | **Yes** -- native |
| Drafts | **No** -- containers expire after 24h if unpublished |

### Documentation
- Content Publishing: https://developers.facebook.com/docs/instagram-platform/content-publishing/
- Media Publish endpoint: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media_publish/
- Complete guide: https://elfsight.com/blog/instagram-graph-api-complete-developer-guide-for-2026/

### Gotchas
- The Basic Display API was **fully deprecated December 4, 2024** -- only Graph API remains
- Images must be at a public URL (you'd need to upload to S3/Cloudinary/Shopify CDN first, THEN pass that URL to Meta)
- Token refresh is a pain; consider using System User tokens (never expire) via a Meta Business Manager
- App Review can take 2-6 weeks and requires screencasts demonstrating your use case

---

## 2. Unified Social Media APIs (SaaS)

These services wrap the official Instagram Graph API (and other platforms) behind a simpler, developer-friendly REST API. They handle token management, image hosting, and the Meta App Review for you.

### 2a. Late (getlate.dev) -- BEST VALUE

A developer-focused unified social media API. Strong Node.js SDK.

| Attribute | Value |
|-----------|-------|
| Monthly cost | **$0 (free: 20 posts/mo)**, $19/mo (Build: 100 posts), $49/mo (Accelerate: 500 posts) |
| Setup complexity | **Easy** -- npm install, API key, done |
| Reliability | **High** (99.7%+ uptime, 2M+ posts delivered) |
| Account risk | **None** -- uses official API |
| Scheduling | **Yes** |
| Supports | Images, Videos, Reels, Carousels on Instagram + 12 other platforms |

**npm package:** `@getlatedev/social-media-api` (drop-in Ayrshare replacement)

**Key advantage:** Video/Reels posting included on ALL plans including free. No Meta App Review needed on your end -- Late handles it.

- Pricing: https://getlate.dev/pricing
- Docs: https://docs.getlate.dev
- Instagram guide: https://getlate.dev/instagram
- npm: https://www.npmjs.com/package/@getlatedev/social-media-api

### 2b. Ayrshare

The more established player, but significantly more expensive.

| Attribute | Value |
|-----------|-------|
| Monthly cost | **$0 (free: 20 posts/mo, images only)**, $149/mo (Premium), $499/mo (Business) |
| Setup complexity | **Easy** -- REST API with good docs |
| Reliability | **High** |
| Account risk | **None** -- uses official API |
| Scheduling | **Yes** |
| Supports | Images, Carousels, Reels (Premium+ only), 13 platforms |

**Key limitation:** Free tier is images-only. Video/Reels requires $149/mo Premium plan.

- Homepage: https://www.ayrshare.com/
- Docs: https://www.ayrshare.com/docs/introduction
- GitHub: https://github.com/ayrshare/social-media-api

### 2c. Postproxy

Newer entrant, developer-focused, transparent pricing.

| Attribute | Value |
|-----------|-------|
| Monthly cost | TBD (newer service, check site) |
| Setup complexity | **Easy** |
| Reliability | **Medium** (newer, less track record) |
| Account risk | **None** -- uses official API |
| Scheduling | **Yes** |
| Supports | Instagram, TikTok, X, LinkedIn, Facebook, YouTube, Threads |

- Homepage: https://postproxy.dev/
- Instagram guide: https://postproxy.dev/blog/instagram-api-posting-integration-guide/

### 2d. Buffer API

| Attribute | Value |
|-----------|-------|
| Monthly cost | Free (3 channels), $6/mo/channel (Essentials), $12/mo/channel (Team) |
| Setup complexity | **Medium** -- API is in BETA, limited public access |
| Reliability | **High** (established brand) |
| Account risk | **None** |
| Scheduling | **Yes** |
| Supports | Photos, Videos, Reels, Stories |

**Key limitation:** The Buffer API is **primarily an internal tool** and the public API is in beta with limited capabilities. Not recommended for programmatic integration.

- API info: https://support.buffer.com/article/859-does-buffer-have-an-api
- Guide: https://getlate.dev/blog/buffer-api

### 2e. Hootsuite API

| Attribute | Value |
|-----------|-------|
| Monthly cost | $99/mo (Professional), $249/mo (Team) |
| Setup complexity | **Medium** |
| Reliability | **Medium** -- API hasn't been updated in 5+ years |
| Account risk | **None** |
| Scheduling | **Yes** (via dashboard; API is stale) |
| Supports | Photos, basic video |

**Key limitation:** The API is **outdated** -- no support for Reels or Stories via API. Not recommended for new integrations.

- Developer docs: https://developer.hootsuite.com/

### 2f. Sprout Social API

| Attribute | Value |
|-----------|-------|
| Monthly cost | $249/mo (Standard) to $499/mo (Advanced, includes API) |
| Setup complexity | **Medium** |
| Reliability | **High** |
| Account risk | **None** |
| Scheduling | **Yes** |
| Supports | Full publishing + analytics |

**Key limitation:** Enterprise pricing. API access requires Advanced plan ($499/mo). Overkill for a small business.

- API docs: https://api.sproutsocial.com/docs/

### 2g. Others (No Public API / Not Recommended)

| Service | Has API? | Notes |
|---------|----------|-------|
| **SocialBee** | No public developer API | UI-only scheduling tool, $29-$99/mo |
| **Publer** | REST API available | Supports scheduling, $12-$21/mo. Limited docs. |
| **Planoly** | No public API | Visual planner only, no programmatic access |
| **Iconosquare** | No public API | Analytics-focused, no publishing API |
| **SocialPilot** | RESTful API available | $30-$200/mo, supports bulk scheduling. Shopify app available. |

---

## 3. Workflow Automation Platforms

### 3a. n8n (Self-Hosted) -- BEST FOR DIY

Open-source workflow automation. Can be self-hosted for free.

| Attribute | Value |
|-----------|-------|
| Monthly cost | **$0 (self-hosted)**, $20/mo (cloud starter) |
| Setup complexity | **Medium-Hard** -- requires Meta Developer App setup, token management |
| Reliability | **High** (when self-hosted properly) |
| Account risk | **None** -- uses official Graph API |
| Scheduling | **Yes** (built-in cron triggers) |
| Webhook trigger | **Yes** -- your Node.js app can POST to n8n webhook URL |

**Instagram Publishing Support:**
- Community node: `n8n-nodes-instagram` (Graph API wrapper)
- Meta Publisher node: `n8n-nodes-meta-publisher` (images, videos, reels, stories, carousels)
- Pre-built workflow templates for Instagram publishing from Google Sheets, Notion, etc.
- Handles the two-step container-create -> publish flow

**Key advantage:** Free, self-hostable, no per-task fees. You own your data. Your existing Node.js app can trigger it via webhook.

- Workflow templates: https://n8n.io/workflows/4498-schedule-and-publish-all-instagram-content-types-with-facebook-graph-api/
- Meta Publisher node: https://github.com/ralphcrisostomo/n8n-nodes-meta-publisher
- Instagram community node: https://github.com/MookieLian/n8n-nodes-instagram

### 3b. Make.com (formerly Integromat)

| Attribute | Value |
|-----------|-------|
| Monthly cost | **$0 (free: 1,000 ops/mo)**, $9/mo (Core: 10,000 ops), $16/mo (Pro) |
| Setup complexity | **Easy-Medium** |
| Reliability | **High** |
| Account risk | **None** -- uses official Graph API |
| Scheduling | **Yes** |
| Webhook trigger | **Yes** |

**Instagram modules:** "Upload a photo as a new post", carousel posting, reel uploads. Uses official Graph API.

**Key advantage:** Visual workflow builder, generous free tier (1,000 ops = ~500 posts since each post is 2 ops). Webhook module for triggering from your app.

- Instagram integration: https://www.make.com/en/integrations/instagram-business

### 3c. Zapier

| Attribute | Value |
|-----------|-------|
| Monthly cost | **$0 (free: 100 tasks/mo)**, $19.99/mo (Starter: 750 tasks) |
| Setup complexity | **Easy** |
| Reliability | **High** |
| Account risk | **None** -- uses official API |
| Scheduling | **Yes** |
| Webhook trigger | **Yes** (Webhooks by Zapier trigger) |

**Instagram actions:** "Publish Photo(s)", "Publish Video" (as Reel), "API Request (Beta)". Supports single photos, carousels with captions/tags.

**Key limitation:** More expensive per task than Make. Free tier only allows 2-step Zaps (1 trigger + 1 action). Does NOT support Stories.

- Instagram setup: https://help.zapier.com/hc/en-us/articles/8496101110541-How-to-get-started-with-Instagram-for-Business-on-Zapier
- Pricing: https://zapier.com/pricing

### How Webhook Integration Works (All Three)

```
Your Node.js App                    Automation Platform
─────────────────                   ──────────────────
generate-post.js
  │
  ├─ Generate caption (Claude AI)
  ├─ Generate image (DALL-E/etc)
  ├─ Upload image to CDN
  │
  └─ POST webhook_url ──────────►  Receive webhook
     { image_url,                     │
       caption,                       ├─ Create media container
       hashtags }                     ├─ Wait for processing
                                      └─ Publish to Instagram
```

---

## 4. Apify

### Verdict: NOT suitable for Instagram posting

Apify is a web scraping and automation platform. Their Instagram actors are **exclusively for scraping/extracting data**, not publishing content.

**Available Instagram actors (all scraping-only):**
- Instagram Scraper -- profile/post data extraction
- Instagram Post Scraper -- post content + engagement metrics
- Instagram Reel Scraper -- reel data extraction
- Instagram API Scraper -- API-based data extraction
- Instagram Hashtag Scraper -- hashtag research

**No actors exist for:**
- Publishing posts
- Uploading photos/videos
- Scheduling content
- Managing an Instagram account

Apify could theoretically be used to build a custom actor that uses the unofficial Instagram API to post, but this would carry all the risks of unofficial API usage (see Section 5) plus Apify's per-compute-unit costs.

- Apify Store: https://apify.com/store
- Instagram scrapers: https://apify.com/apify/instagram-scraper

---

## 5. Unofficial / Private API Libraries

### STRONG WARNING: HIGH RISK OF PERMANENT ACCOUNT BAN

Instagram's enforcement has gotten **significantly stricter in 2025-2026**. These libraries reverse-engineer Instagram's mobile app API and are actively detected and blocked by Meta.

### 5a. instagram-private-api (Node.js)

| Attribute | Value |
|-----------|-------|
| Package | `instagram-private-api` on npm |
| GitHub | https://github.com/dilame/instagram-private-api |
| Monthly cost | **$0** |
| Setup complexity | **Medium** |
| Reliability | **Very Low** -- breaks frequently when Instagram updates |
| Account risk | **EXTREME** -- permanent ban likely |
| Scheduling | No (you'd build your own) |

**Capabilities:** Login, post photos/videos, stories, direct messages, follow/unfollow, like/comment.

**Risks:**
- **Permanent account loss** is the most common consequence, not rare
- Instagram detects unofficial API calls that aren't from the official Graph API
- First offense may be a warning; second offense is usually a **permanent ban with no appeal**
- Requires your raw Instagram username/password (no OAuth) -- security risk
- Library has 1,580+ open issues on GitHub, many about detection/bans
- Can break at any time when Instagram changes internal API structure

### 5b. instagram-web-api (Node.js)

| Attribute | Value |
|-----------|-------|
| Package | `instagram-web-api` on npm |
| GitHub | https://github.com/jlobos/instagram-web-api |
| Status | **Largely unmaintained** |
| Account risk | **EXTREME** |

### 5c. instagrapi (Python)

Popular Python alternative, same risks apply. Mentioned here for completeness but not relevant to the Node.js stack.

### Bottom Line on Unofficial APIs

**Do not use these for a business account you care about.** Meta has invested heavily in detection systems. The Midnight Muse Made Instagram account would be at serious risk of permanent deletion. There is no appeal process for automated posting violations.

---

## 6. Shopify-Specific Integrations

### Built-in Shopify + Instagram

Shopify's native Instagram integration is focused on **Instagram Shopping** (product catalog sync, shoppable posts), NOT content publishing. You can:
- Sync product catalog to Instagram Shop
- Tag products in posts (done manually in Instagram)
- Track sales from Instagram

**It does NOT** allow you to create or schedule Instagram posts from Shopify.

### Shopify Apps with Scheduling

| App | Has API? | Notes |
|-----|----------|-------|
| **SocialPilot** | Yes (REST API) | Auto-post products, AI scheduling. $30-200/mo |
| **Outfy** | No public API | Automated product collages to Instagram. UI only. |
| **Onollo** | No public API | AI-powered best-time scheduling. UI only. |
| **Socialwidget** | No public API | Instagram feed display widget (not posting) |

**None of these Shopify apps provide a programmable API** that your Node.js app could call to publish arbitrary Instagram posts with custom captions. They're designed for auto-posting product images from the Shopify catalog.

---

## 7. Comparison Matrix

For Midnight Muse Made (1-2 posts/day, Node.js app, small business budget):

| Option | Monthly Cost | Setup | Reliability | Account Risk | Carousel | Reels | Stories | Node.js SDK |
|--------|-------------|-------|-------------|-------------|----------|-------|---------|-------------|
| **Late API** | $0-19 | Easy | High | None | Yes | Yes | Yes | Yes |
| **Make.com** | $0-9 | Easy-Med | High | None | Yes | Yes | Yes | Via webhook |
| **n8n (self-hosted)** | $0 | Med-Hard | High | None | Yes | Yes | Yes | Via webhook |
| **Zapier** | $0-20 | Easy | High | None | Yes | Yes | No | Via webhook |
| **Ayrshare** | $0-149 | Easy | High | None | Yes | Paid | Yes | Yes |
| **Direct Graph API** | $0 | Hard | High | None | Yes | Yes | Yes | DIY |
| **Postproxy** | TBD | Easy | Medium | None | Yes | Yes | Yes | Yes |
| **Buffer API** | $6+ | Medium | High | None | Yes | Yes | Yes | Beta only |
| **instagram-private-api** | $0 | Medium | Very Low | **EXTREME** | Yes | Yes | Yes | Yes |

---

## 8. Recommendation

### Best Option: Late API ($0-19/mo)

**Why:**
1. **Cheapest path to production** -- free tier gives 20 posts/mo (enough for testing), $19/mo gets 100 posts (3/day)
2. **Node.js SDK** (`@getlatedev/social-media-api`) drops right into the existing Express app
3. **No Meta App Review** -- Late handles the OAuth/permissions on their end
4. **Reels + Carousels + Stories** on all plans including free
5. **Simple integration** -- generate post with Claude AI, upload image, call Late API to publish

**Integration sketch:**
```javascript
import { Late } from '@getlatedev/social-media-api';
const late = new Late({ apiKey: process.env.LATE_API_KEY });

// After generating caption + image URL with Claude AI:
const response = await late.post({
  post: caption + '\n\n' + hashtags,
  platforms: ['instagram'],
  mediaUrls: [imageUrl],
  scheduleDate: '2026-03-15T10:00:00Z' // optional scheduling
});
```

### Runner-Up: n8n Self-Hosted ($0)

If you want zero recurring costs and don't mind more setup work:
1. Self-host n8n on WSL2 (it's just a Node.js app)
2. Install the `n8n-nodes-meta-publisher` community node
3. Create a workflow: Webhook trigger -> Upload media -> Publish to Instagram
4. Your Node.js app POSTs to the n8n webhook URL with caption + image URL
5. Requires your own Meta Developer App + App Review (weeks of waiting)

### What NOT to Do
- **Do NOT use instagram-private-api** or any unofficial library -- permanent ban risk
- **Do NOT use Apify** -- they don't have posting actors, only scraping
- **Do NOT pay for Hootsuite/Sprout Social** -- enterprise pricing, overkill for this use case
- **Do NOT rely on Buffer's API** -- it's in beta and not fully public
