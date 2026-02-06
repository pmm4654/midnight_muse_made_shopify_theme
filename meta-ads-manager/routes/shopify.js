/**
 * Shopify Routes
 *
 * Provides access to store products, collections, and order data
 * for the campaign builder and AI assistant.
 */
const express = require('express');
const router = express.Router();
const shopifyApi = require('../services/shopify-api');

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
