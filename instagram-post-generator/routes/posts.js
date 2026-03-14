const express = require('express');
const router = express.Router();
const { loadProducts, pickProducts } = require('../services/product-catalog');
const { generatePost, rewriteCaption } = require('../services/claude-ai');

// GET /api/posts/products — list all products
// Query params: ?source=csv|website|shopify
router.get('/products', async (req, res) => {
  try {
    const source = req.query.source || 'csv';
    const products = await loadProducts(source);
    res.json({
      source,
      count: products.length,
      products: products.map((p) => ({
        handle: p.handle,
        title: p.title,
        price: p.price,
        tags: p.tags,
        imageCount: p.images.length,
        thumbnail: p.images[0]?.src || null,
        url: p.url,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/generate — generate an Instagram post
router.post('/generate', async (req, res) => {
  try {
    const {
      productHandles,
      count = 2,
      strategy = 'random',
      source = 'csv',       // 'csv', 'website', or 'shopify'
      postType = 'product_spotlight',
      mood = 'witchy_cozy',
      includeImagePrompt = true,
      customInstructions = '',
    } = req.body;

    let products;
    if (productHandles && productHandles.length > 0) {
      const all = await loadProducts(source);
      products = all.filter((p) => productHandles.includes(p.handle));
      if (products.length === 0) {
        return res.status(400).json({ error: 'None of the specified product handles were found' });
      }
    } else {
      products = await pickProducts(count, strategy, source);
    }

    if (products.length === 0) {
      return res.status(400).json({ error: 'No products found in catalog' });
    }

    const result = await generatePost(products, {
      postType,
      mood,
      includeImagePrompt,
      customInstructions,
    });

    res.json(result);
  } catch (err) {
    console.error('Post generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/rewrite — rewrite a caption
router.post('/rewrite', async (req, res) => {
  try {
    const { originalCaption, productTitles = [], instructions } = req.body;
    if (!originalCaption || !instructions) {
      return res.status(400).json({ error: 'originalCaption and instructions are required' });
    }

    const result = await rewriteCaption(
      originalCaption,
      productTitles.map((t) => ({ title: t })),
      instructions
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
