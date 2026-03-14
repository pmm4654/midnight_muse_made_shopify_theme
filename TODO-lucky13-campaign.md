# Lucky 13 Campaign — Go-Live Checklist

## Status: Theme files READY on dev theme (not pushed to live site)

Preview on dev server:
- Signup page: `http://localhost:9292/pages/first-13-subscribers-get-50-off` (new design visible now)
- Thank-you page: `http://localhost:9292/pages/first-13-thank-you` (needs template reassignment in Admin — see Step 3)

Live URLs (DO NOT share until go-live):
- Signup: `https://midnightmusemade.com/pages/first-13-subscribers-get-50-off`
- Thank you: `https://midnightmusemade.com/pages/first-13-thank-you`

---

## What's Been Built (Theme Files)

- [x] `sections/main-page-lucky13-signup.liquid` — Gothic signup section with candle counter, scarcity badge, brand-voice copy
- [x] `sections/main-page-lucky13-thankyou.liquid` — Thank-you section with confirmation, email hint, social links, browse CTA
- [x] `templates/page.page-with-form.json` — Signup page template (matches current page assignment in Admin)
- [x] `templates/page.lucky-13-thank-you.json` — Thank-you page template with featured product grid
- [x] `sections/footer.liquid` — Footer newsletter hidden on campaign pages

### Also created (unused, can be removed)
- `templates/page.Forms First 13 Subscribers Get 50 Off.json` — Backup signup template (page in Admin uses `page-with-form` instead)

---

## Current Page Template Assignments (from Shopify Admin API)

| Page | Handle | Current Template Suffix |
|------|--------|------------------------|
| Signup | `first-13-subscribers-get-50-off` | `page-with-form` |
| Thank You | `first-13-thank-you` | `page` (default) |

**Important:** The signup page already uses `page-with-form`, which we've updated. The thank-you page needs to be reassigned to `lucky-13-thank-you`.

---

## Steps to Go Live

### Step 1: Push the Theme to Live
```bash
shopify theme push --live
```
This deploys all new sections and templates to the live theme. The signup page will immediately use the new design (since it already uses the `page-with-form` template). The thank-you page won't change until Step 3.

**WARNING:** This will also push any other local changes. Review `git diff` first.

### Step 2: Fix the Shopify Forms App (CRITICAL)
The form embed (ID 888387) was not rendering on the live site during our audit. Check:
1. Go to **Shopify Admin > Apps > Forms**
2. Find form ID **888387**
3. Verify it is **Published** and **Active**
4. If broken, create a new form and update the `form_id` in `templates/page.page-with-form.json`
5. Set the form's **redirect URL** to: `/pages/first-13-thank-you`

**Note:** The form doesn't render on localhost due to CORS restrictions — this is normal for `shopify theme dev`. It will work on the live site if the form is published.

### Step 3: Assign the Thank-You Page Template
1. Go to **Shopify Admin > Online Store > Pages**
2. Find "Thank You for Being a Supporter!" (`first-13-thank-you`)
3. In the right sidebar, change **Theme template** from `page` to `page.lucky-13-thank-you`
4. Save

### Step 4: Set Up the Email
1. Configure the confirmation email with subject line: **"Your 50% Spell Has Been Cast"**
2. Include the discount code in the email body
3. Include a link back to the store / collections page

### Step 5: Create the Discount Code
1. Go to **Shopify Admin > Discounts**
2. Create a discount code (e.g., `LUCKY13`)
3. Set to **50% off**, **one use per customer**, **max 13 uses total**
4. Set an **expiration date** (recommend 7 days from campaign start)

### Step 6: Optional — Create Consolation Discount
For subscribers after the first 13:
1. Create a second code (e.g., `COVEN15`) — **15% off** first order
2. Set up a separate email flow for non-Lucky-13 subscribers

---

## Post-Launch Maintenance

### Updating the Candle Counter
As spots are claimed, update in the theme editor:
1. Go to **Online Store > Themes > Customize**
2. Navigate to the signup page
3. In the "Lucky 13 Signup" section settings, update **"Spots claimed"** (0-13)
4. Each claimed spot dims a candle visually

### When All 13 Spots Are Filled
1. Set "Spots claimed" to **13** (all candles dimmed)
2. Update the **scarcity badge text** to: "All 13 spots have been claimed!"
3. Consider updating the subtitle to: "The 13 spots have been claimed — but kindred spirits still get rewarded."
4. Optionally unpublish the form or keep it open for consolation-discount subscribers

---

## Files Changed (for git reference)

```
sections/main-page-lucky13-signup.liquid    (NEW)
sections/main-page-lucky13-thankyou.liquid  (NEW)
templates/page.page-with-form.json          (NEW — replaces live theme version)
templates/page.lucky-13-thank-you.json      (NEW)
templates/page.Forms First 13 Subscribers Get 50 Off.json  (MODIFIED — backup, not actively used)
sections/footer.liquid                      (MODIFIED — line 168, hide newsletter on campaign pages)
```
