/**
 * AI Assistant Routes
 *
 * Handles conversation with Claude for campaign suggestions,
 * performance analysis, and natural-language campaign management.
 */
const express = require('express');
const router = express.Router();
const claudeAi = require('../services/claude-ai');
const shopifyApi = require('../services/shopify-api');
const metaApi = require('../services/meta-api');

// Chat with the AI assistant
router.post('/chat', async (req, res) => {
  try {
    const { messages, includeStoreData, includeCampaignData } = req.body;

    let storeContext = null;
    let campaignContext = null;

    // Fetch store data if requested
    if (includeStoreData) {
      storeContext = await shopifyApi.getStoreSummary();
    }

    // Fetch campaign data if requested
    if (includeCampaignData) {
      try {
        const campaigns = await metaApi.listCampaigns();
        campaignContext = campaigns;
      } catch (e) {
        // Campaign data is optional context
      }
    }

    const response = await claudeAi.chat(messages, storeContext, campaignContext);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign suggestions based on store data
router.post('/suggest', async (req, res) => {
  try {
    const { goal } = req.body;
    const storeData = await shopifyApi.getStoreSummary();
    const response = await claudeAi.suggestCampaign(storeData, goal);

    // Try to extract structured spec from the response
    const spec = claudeAi.extractCampaignSpec(response.content);

    res.json({
      explanation: response.content,
      spec,
      usage: response.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assess performance of current campaigns
router.post('/assess', async (req, res) => {
  try {
    const { campaignIds, datePreset } = req.body;

    const storeData = await shopifyApi.getStoreSummary();
    const campaigns = await metaApi.listCampaigns();

    // Fetch insights for specified campaigns or all
    const targetIds = campaignIds || (campaigns.data || []).map((c) => c.id);
    const insights = {};

    for (const id of targetIds.slice(0, 10)) {
      try {
        const data = await metaApi.getCampaignInsights(id, { date_preset: datePreset || 'last_30d' });
        insights[id] = data;
      } catch (e) {
        insights[id] = { error: e.message };
      }
    }

    const response = await claudeAi.assessPerformance(storeData, campaigns, insights);
    res.json({
      analysis: response.content,
      raw_insights: insights,
      usage: response.usage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Extract campaign spec from AI response text
router.post('/extract-spec', (req, res) => {
  const { text } = req.body;
  const spec = claudeAi.extractCampaignSpec(text);
  if (spec) {
    res.json({ success: true, spec });
  } else {
    res.json({ success: false, error: 'No campaign specification found in the text' });
  }
});

// Test AI connection
router.get('/test', async (req, res) => {
  try {
    const result = await claudeAi.testConnection();
    res.json(result);
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

// Test local proxy (Claude SDK route)
router.get('/proxy-health', async (req, res) => {
  try {
    const result = await claudeAi.testProxyHealth();
    res.json(result);
  } catch (err) {
    res.json({ ok: false, configured: false, error: err.message });
  }
});

module.exports = router;
