const express = require('express');
const router = express.Router();
const { testConnection } = require('../services/claude-ai');
const { loadProducts } = require('../services/product-catalog');

router.get('/', async (req, res) => {
  const aiStatus = await testConnection();
  let productCount = 0;
  try {
    productCount = loadProducts().length;
  } catch (e) {
    // CSV not found or parse error
  }

  res.json({
    status: aiStatus.connected && productCount > 0 ? 'ready' : 'degraded',
    ai: aiStatus,
    catalog: { productCount },
  });
});

module.exports = router;
