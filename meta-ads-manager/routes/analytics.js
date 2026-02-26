/**
 * Analytics Routes
 *
 * Fetches and returns performance metrics from Meta's Insights API.
 */
const express = require('express');
const router = express.Router();
const metaApi = require('../services/meta-api');

// Account-level insights
router.get('/account', async (req, res) => {
  try {
    const data = await metaApi.getAccountInsights({
      fields: req.query.fields,
      date_preset: req.query.date_preset || 'last_30d',
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Campaign insights
router.get('/campaign/:id', async (req, res) => {
  try {
    const data = await metaApi.getCampaignInsights(req.params.id, {
      fields: req.query.fields,
      date_preset: req.query.date_preset || 'last_30d',
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ad set insights
router.get('/adset/:id', async (req, res) => {
  try {
    const data = await metaApi.getAdSetInsights(req.params.id, {
      fields: req.query.fields,
      date_preset: req.query.date_preset || 'last_30d',
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ad insights
router.get('/ad/:id', async (req, res) => {
  try {
    const data = await metaApi.getAdInsights(req.params.id, {
      fields: req.query.fields,
      date_preset: req.query.date_preset || 'last_30d',
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Summary dashboard data
router.get('/summary', async (req, res) => {
  try {
    const datePreset = req.query.date_preset || 'last_30d';

    const [accountInsights, campaigns] = await Promise.all([
      metaApi.getAccountInsights({ date_preset: datePreset }).catch(() => null),
      metaApi.listCampaigns('id,name,objective,status,daily_budget,lifetime_budget').catch(() => ({ data: [] })),
    ]);

    const activeCampaigns = (campaigns.data || []).filter((c) => c.status === 'ACTIVE');
    const pausedCampaigns = (campaigns.data || []).filter((c) => c.status === 'PAUSED');

    // Fetch insights for active campaigns
    const campaignInsights = [];
    for (const c of activeCampaigns.slice(0, 5)) {
      try {
        const insights = await metaApi.getCampaignInsights(c.id, { date_preset: datePreset });
        campaignInsights.push({ ...c, insights: insights.data?.[0] });
      } catch (e) {
        campaignInsights.push({ ...c, insights: null });
      }
    }

    res.json({
      account: accountInsights?.data?.[0] || null,
      total_campaigns: (campaigns.data || []).length,
      active_campaigns: activeCampaigns.length,
      paused_campaigns: pausedCampaigns.length,
      top_campaigns: campaignInsights,
      date_preset: datePreset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
