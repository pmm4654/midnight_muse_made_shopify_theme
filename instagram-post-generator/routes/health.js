const express = require('express');
const router = express.Router();
const { testConnection } = require('../services/claude-ai');
const { loadProducts } = require('../services/product-catalog');

router.get('/', async (req, res) => {
  const aiStatus = await testConnection();

  const sources = {};
  // Always check CSV (fast, local)
  try {
    const csvProducts = await loadProducts('csv');
    sources.csv = { available: true, productCount: csvProducts.length };
  } catch (e) {
    sources.csv = { available: false, error: e.message };
  }

  // Check if Shopify Admin API is configured
  sources.shopify = {
    configured: !!(process.env.SHOPIFY_ACCESS_TOKEN && (process.env.SHOPIFY_STORE_DOMAIN || process.env.MYSHOPIFY_DOMAIN)),
  };

  // Website is always potentially available
  sources.website = { available: true };

  const anyProducts = sources.csv.available && sources.csv.productCount > 0;

  res.json({
    status: aiStatus.connected && anyProducts ? 'ready' : 'degraded',
    ai: aiStatus,
    sources,
    catalog: { productCount: sources.csv.productCount || 0 },
  });
});

module.exports = router;
