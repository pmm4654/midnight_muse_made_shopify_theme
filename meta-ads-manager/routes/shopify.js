/**
 * Shopify Routes
 *
 * Provides access to store products, collections, and order data
 * for the campaign builder and AI assistant.
 * Includes OAuth flow for obtaining Admin API access tokens.
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const router = express.Router();
const shopifyApi = require('../services/shopify-api');

const SCOPES = 'read_products,read_orders,read_customers,read_content';

function getShopDomain() {
  return (process.env.SHOPIFY_STORE_DOMAIN || '').replace(/\/$/, '');
}

function verifyHmac(query) {
  const { hmac, ...params } = query;
  if (!hmac) return false;
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const computed = crypto
    .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET)
    .update(sorted)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac));
}

// Start OAuth flow — redirects to Shopify authorization page
router.get('/auth', (req, res) => {
  const shop = getShopDomain();
  if (!shop || !process.env.SHOPIFY_CLIENT_ID) {
    return res.status(400).json({
      error: 'Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_CLIENT_ID in .env',
    });
  }
  const redirectUri = `${process.env.APP_URL || 'http://localhost:' + (process.env.PORT || 3456)}/api/shopify/auth/callback`;
  const nonce = crypto.randomBytes(16).toString('hex');
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`;
  res.redirect(authUrl);
});

// OAuth callback — exchanges code for access token and saves to .env
router.get('/auth/callback', async (req, res) => {
  try {
    if (!verifyHmac(req.query)) {
      return res.status(403).send('HMAC verification failed');
    }

    const { code, shop } = req.query;
    if (!code || !shop) {
      return res.status(400).send('Missing code or shop parameter');
    }

    // Exchange authorization code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return res.status(tokenRes.status).send(`Token exchange failed: ${errText}`);
    }

    const { access_token, scope } = await tokenRes.json();

    // Update the running process env
    process.env.SHOPIFY_ACCESS_TOKEN = access_token;

    // Persist to .env file
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.match(/^SHOPIFY_ACCESS_TOKEN=.*$/m)) {
      envContent = envContent.replace(
        /^SHOPIFY_ACCESS_TOKEN=.*$/m,
        `SHOPIFY_ACCESS_TOKEN="${access_token}"`
      );
    } else {
      envContent += `\nSHOPIFY_ACCESS_TOKEN="${access_token}"\n`;
    }
    fs.writeFileSync(envPath, envContent);

    res.send(`
      <html><body style="font-family:system-ui;max-width:600px;margin:60px auto;text-align:center">
        <h1>Shopify Connected</h1>
        <p>Access token saved. Granted scopes: <code>${scope}</code></p>
        <p><a href="/">Return to app</a> | <a href="/api/shopify/test">Test connection</a></p>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send(`OAuth error: ${err.message}`);
  }
});

// Test Shopify connection
router.get('/test', async (req, res) => {
  try {
    const result = await shopifyApi.testConnection();
    res.json(result);
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

// Get store info
router.get('/shop', async (req, res) => {
  try {
    const shop = await shopifyApi.getShopInfo();
    res.json(shop);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get store summary (for AI context)
router.get('/summary', async (req, res) => {
  try {
    const summary = await shopifyApi.getStoreSummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List products
router.get('/products', async (req, res) => {
  try {
    const products = await shopifyApi.getProducts(parseInt(req.query.limit) || 50);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product
router.get('/products/:id', async (req, res) => {
  try {
    const product = await shopifyApi.getProduct(req.params.id);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List collections
router.get('/collections', async (req, res) => {
  try {
    const collections = await shopifyApi.getCollections(parseInt(req.query.limit) || 50);
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recent orders
router.get('/orders', async (req, res) => {
  try {
    const orders = await shopifyApi.getRecentOrders(parseInt(req.query.limit) || 50);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
