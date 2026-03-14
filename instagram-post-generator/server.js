require('dotenv').config();
const express = require('express');
const path = require('path');

const postRoutes = require('./routes/posts');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3457;

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/posts', postRoutes);
app.use('/api/health', healthRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Instagram Post Generator running at http://localhost:${PORT}\n`);

  const missing = [];
  if (!process.env.ANTHROPIC_API_KEY) {
    if (process.env.ANTHROPIC_BASE_URL) {
      console.log('  ANTHROPIC_API_KEY not set — using local Anthropic proxy.');
    } else {
      try {
        const fs = require('fs');
        const os = require('os');
        const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
        const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
        if (creds.claudeAiOauth?.accessToken) {
          console.log('  ANTHROPIC_API_KEY not set — will use Claude Code CLI auth.');
        } else {
          missing.push('ANTHROPIC_API_KEY');
        }
      } catch {
        missing.push('ANTHROPIC_API_KEY');
      }
    }
  }

  if (missing.length) {
    console.log('  Missing env vars:');
    missing.forEach((v) => console.log(`    - ${v}`));
    console.log('');
  } else {
    console.log('  AI credentials configured.\n');
  }

  // Check product catalog
  (async () => {
    try {
      const { loadProducts } = require('./services/product-catalog');
      const count = (await loadProducts('csv')).length;
      console.log(`  Product catalog loaded: ${count} active products.\n`);
    } catch (e) {
      console.log('  Warning: Could not load product catalog:', e.message, '\n');
    }
  })();
});
