require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');
const shopifyRoutes = require('./routes/shopify');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3456;

// Middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'meta-ads-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/settings', settingsRoutes);

// Serve the SPA for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Meta Ads Manager is running at http://localhost:${PORT}\n`);
  console.log('  Setup wizard:  http://localhost:' + PORT + '/#/setup');
  console.log('  Dashboard:     http://localhost:' + PORT + '/#/dashboard');
  console.log('  AI Assistant:  http://localhost:' + PORT + '/#/assistant\n');
});
