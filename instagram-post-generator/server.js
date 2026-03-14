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

  if (process.env.ANTHROPIC_API_KEY) {
    console.log('  AI auth: ANTHROPIC_API_KEY set.\n');
  } else if (process.env.ANTHROPIC_BASE_URL) {
    console.log('  AI auth: using local proxy at', process.env.ANTHROPIC_BASE_URL, '\n');
  } else {
    const { isCliAuthAvailable } = require('./services/claude-ai');
    if (isCliAuthAvailable()) {
      console.log('  AI auth: Claude Code CLI session detected (will use `claude -p` subprocess).\n');
    } else {
      console.log('  Warning: No AI auth configured. Set ANTHROPIC_API_KEY in .env or run: claude auth login\n');
    }
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
