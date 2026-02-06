require('dotenv').config();
const express = require('express');
const path = require('path');

const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');
const shopifyRoutes = require('./routes/shopify');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3456;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/settings', settingsRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Meta Ads Manager is running at http://localhost:${PORT}\n`);

  // Startup config check
  const missing = [];
  if (!process.env.FACEBOOK_APP_ID) missing.push('FACEBOOK_APP_ID');
  if (!process.env.FACEBOOK_APP_SECRET) missing.push('FACEBOOK_APP_SECRET');
  if (!process.env.FACEBOOK_AD_ACCOUNT_ID) missing.push('FACEBOOK_AD_ACCOUNT_ID');
  if (!process.env.FACEBOOK_ACCESS_TOKEN) missing.push('FACEBOOK_ACCESS_TOKEN');
  if (!process.env.SHOPIFY_CLIENT_ID) missing.push('SHOPIFY_CLIENT_ID');
  if (!process.env.SHOPIFY_API_KEY) missing.push('SHOPIFY_API_KEY');
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');

  if (missing.length) {
    console.log('  Missing env vars (set these before using the app):');
    missing.forEach((v) => console.log(`    - ${v}`));
    console.log('');
    console.log('  See .env.example for details.\n');
  } else {
    console.log('  All credentials configured.\n');
  }
});
