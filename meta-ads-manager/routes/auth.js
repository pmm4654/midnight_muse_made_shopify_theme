/**
 * Meta OAuth Routes
 *
 * Handles the Facebook Login OAuth flow to obtain an access token
 * with ads_management permissions.
 */
const express = require('express');
const router = express.Router();
const metaApi = require('../services/meta-api');

// Step 1: Redirect user to Facebook Login
router.get('/meta/login', (req, res) => {
  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3456'}/api/auth/meta/callback`;
  const scopes = [
    'ads_management',
    'ads_read',
    'business_management',
    'pages_read_engagement',
    'pages_show_list',
  ].join(',');

  const loginUrl =
    `https://www.facebook.com/${process.env.META_API_VERSION || 'v21.0'}/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}` +
    `&response_type=code`;

  res.redirect(loginUrl);
});

// Step 2: Handle OAuth callback
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

    // Store in session
    req.session.metaAccessToken = accessToken;
    req.session.metaTokenExpiry = longLived.expires_in
      ? Date.now() + longLived.expires_in * 1000
      : null;

    res.redirect(`/#/setup?step=1&success=true&token=${accessToken}`);
  } catch (err) {
    res.redirect(`/#/setup?step=1&error=${encodeURIComponent(err.message)}`);
  }
});

// Test Meta connection with current config
router.get('/meta/test', async (req, res) => {
  try {
    if (!process.env.META_ACCESS_TOKEN) {
      return res.json({ connected: false, error: 'No access token configured' });
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
