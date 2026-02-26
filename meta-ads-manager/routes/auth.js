/**
 * Meta OAuth Routes
 *
 * Handles the Facebook Login OAuth flow to obtain an access token
 * with ads_management permissions.
 *
 * Required env vars:
 *   FACEBOOK_APP_ID
 *   FACEBOOK_APP_SECRET
 *   FACEBOOK_ACCESS_TOKEN  (set after OAuth or manually)
 *   FACEBOOK_AD_ACCOUNT_ID
 */
const express = require('express');
const router = express.Router();
const metaApi = require('../services/meta-api');

// Step 1: Redirect user to Facebook Login
router.get('/meta/login', (req, res) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.status(400).json({
      error: 'FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set as environment variables before starting the OAuth flow.',
    });
  }

  const redirectUri = `${process.env.APP_URL || 'http://localhost:3456'}/api/auth/meta/callback`;
  const scopes = [
    'ads_management',
    'ads_read',
    'business_management',
    'pages_read_engagement',
    'pages_show_list',
  ].join(',');

  const loginUrl =
    `https://www.facebook.com/${process.env.FACEBOOK_API_VERSION || 'v21.0'}/dialog/oauth` +
    `?client_id=${process.env.FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}` +
    `&response_type=code`;

  res.redirect(loginUrl);
});

// Step 2: Handle OAuth callback — exchanges the code for a long-lived
// token and displays it so the user can save it as FACEBOOK_ACCESS_TOKEN.
// The token is NOT written to any file; it is only shown once.
router.get('/meta/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect('/#/setup?step=1&error=no_code');
    }

    const redirectUri = `${process.env.APP_URL || 'http://localhost:3456'}/api/auth/meta/callback`;

    // Exchange code for short-lived token
    const tokenData = await metaApi.exchangeCodeForToken(code, redirectUri);
    if (tokenData.error) {
      return res.redirect(`/#/setup?step=1&error=${encodeURIComponent(tokenData.error.message)}`);
    }

    // Exchange for long-lived token (60 days)
    const longLived = await metaApi.getLongLivedToken(tokenData.access_token);
    const accessToken = longLived.access_token || tokenData.access_token;

    // Also set in process.env for the current session so testing works immediately
    process.env.FACEBOOK_ACCESS_TOKEN = accessToken;

    // Log to server console so it can be copied into env
    console.log('\n  =============================================');
    console.log('  Facebook OAuth succeeded!');
    console.log('  Set this in your environment:');
    console.log(`  FACEBOOK_ACCESS_TOKEN=${accessToken}`);
    console.log('  =============================================\n');

    res.redirect(`/#/setup?step=1&success=true&oauth_token=${encodeURIComponent(accessToken)}`);
  } catch (err) {
    res.redirect(`/#/setup?step=1&error=${encodeURIComponent(err.message)}`);
  }
});

// Test Meta connection with current env vars
router.get('/meta/test', async (req, res) => {
  try {
    if (!process.env.FACEBOOK_ACCESS_TOKEN) {
      return res.json({ connected: false, error: 'FACEBOOK_ACCESS_TOKEN env var is not set' });
    }
    if (!process.env.FACEBOOK_AD_ACCOUNT_ID) {
      return res.json({ connected: false, error: 'FACEBOOK_AD_ACCOUNT_ID env var is not set' });
    }
    const account = await metaApi.getAdAccount();
    res.json({
      connected: true,
      account_name: account.name,
      account_id: account.account_id,
      currency: account.currency,
      timezone: account.timezone_name,
    });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

// Get token info
router.get('/meta/token-info', async (req, res) => {
  try {
    const info = await metaApi.getTokenInfo();
    res.json(info);
  } catch (err) {
    res.json({ error: err.message });
  }
});

module.exports = router;
