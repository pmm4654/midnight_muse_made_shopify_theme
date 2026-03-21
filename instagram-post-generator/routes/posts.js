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

// ─── Publishing Routes ──────────────────────────────────

const metaPublisher = require('../services/meta-publisher');

// GET /api/posts/session — check Meta Business Suite session
router.get('/session', (req, res) => {
  const session = metaPublisher.checkSession();
  res.json(session);
});

// POST /api/posts/session/init — open browser for manual Meta login
router.post('/session/init', async (req, res) => {
  try {
    const result = await metaPublisher.initSession({ headless: false });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/publish — publish or preview an Instagram post
// Body: { caption, hashtags[], imagePath?, imageUrl?, scheduleTime?, confirm? }
router.post('/publish', async (req, res) => {
  try {
    const {
      caption,
      hashtags = [],
      imagePath,
      imageUrl,
      scheduleTime,
      confirm = false,
      headless = true,
    } = req.body;

    if (!caption) {
      return res.status(400).json({ error: 'caption is required' });
    }

    if (!imagePath && !imageUrl) {
      return res.status(400).json({ error: 'Either imagePath or imageUrl is required' });
    }

    const result = await metaPublisher.publishToInstagram({
      caption,
      hashtags,
      imagePath,
      imageUrl,
      scheduleTime,
      confirm,
      headless,
    });

    // If there's a screenshot, convert path to serveable URL
    if (result.screenshotPath) {
      result.screenshotUrl = `/screenshots/${require('path').basename(result.screenshotPath)}`;
    }
    if (result.previewScreenshotPath) {
      result.previewScreenshotUrl = `/screenshots/${require('path').basename(result.previewScreenshotPath)}`;
    }

    const statusCode = result.success ? 200 : (result.needsLogin ? 401 : 500);
    res.status(statusCode).json(result);
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
