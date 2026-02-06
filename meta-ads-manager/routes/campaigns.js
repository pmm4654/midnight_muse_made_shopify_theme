/**
 * Campaign Management Routes
 *
 * CRUD operations for Meta ad campaigns, ad sets, and ads.
 * All creation operations default to PAUSED (draft) status.
 */
const express = require('express');
const router = express.Router();
const metaApi = require('../services/meta-api');

// ---------- Campaigns ----------

// List all campaigns
router.get('/', async (req, res) => {
  try {
    const data = await metaApi.listCampaigns(req.query.fields, req.query.limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single campaign
router.get('/:id', async (req, res) => {
  try {
    const data = await metaApi.getCampaign(req.params.id, req.query.fields);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create campaign (always PAUSED by default)
router.post('/', async (req, res) => {
  try {
    const data = await metaApi.createCampaign(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update campaign
router.patch('/:id', async (req, res) => {
  try {
    const data = await metaApi.updateCampaign(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const data = await metaApi.deleteCampaign(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activate (publish) campaign
router.post('/:id/activate', async (req, res) => {
  try {
    const data = await metaApi.activateCampaign(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pause campaign
router.post('/:id/pause', async (req, res) => {
  try {
    const data = await metaApi.pauseCampaign(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Ad Sets ----------

// List ad sets (optionally filtered by campaign)
router.get('/:campaignId/adsets', async (req, res) => {
  try {
    const data = await metaApi.listAdSets(req.params.campaignId, req.query.fields, req.query.limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create ad set
router.post('/adsets', async (req, res) => {
  try {
    const data = await metaApi.createAdSet(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update ad set
router.patch('/adsets/:id', async (req, res) => {
  try {
    const data = await metaApi.updateAdSet(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activate ad set
router.post('/adsets/:id/activate', async (req, res) => {
  try {
    const data = await metaApi.activateAdSet(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Ads ----------

// List ads (optionally filtered by ad set)
router.get('/adsets/:adSetId/ads', async (req, res) => {
  try {
    const data = await metaApi.listAds(req.params.adSetId, req.query.fields, req.query.limit);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create ad creative
router.post('/creatives', async (req, res) => {
  try {
    const data = await metaApi.createAdCreative(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create ad
router.post('/ads', async (req, res) => {
  try {
    const data = await metaApi.createAd(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update ad
router.patch('/ads/:id', async (req, res) => {
  try {
    const data = await metaApi.updateAd(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activate ad
router.post('/ads/:id/activate', async (req, res) => {
  try {
    const data = await metaApi.activateAd(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Full campaign creation from AI spec ----------

// Creates an entire campaign structure (campaign + ad sets + ads) from a spec
router.post('/create-from-spec', async (req, res) => {
  try {
    const spec = req.body;
    const results = { campaign: null, ad_sets: [], ads: [] };

    // 1. Create campaign
    const campaign = await metaApi.createCampaign(spec.campaign);
    results.campaign = campaign;

    // 2. Create ad sets
    for (const adSetSpec of spec.ad_sets || []) {
      adSetSpec.campaign_id = campaign.id;
      const adSet = await metaApi.createAdSet(adSetSpec);
      results.ad_sets.push(adSet);

      // 3. Create ads for each ad set
      for (const adSpec of spec.ads || []) {
        // Create creative first
        if (adSpec.creative && adSpec.creative.object_story_spec) {
          const creative = await metaApi.createAdCreative({
            name: adSpec.creative.name || `${adSpec.name} Creative`,
            object_story_spec: adSpec.creative.object_story_spec,
          });
          // Create ad with creative reference
          const ad = await metaApi.createAd({
            name: adSpec.name,
            adset_id: adSet.id,
            creative: { creative_id: creative.id },
            status: 'PAUSED',
          });
          results.ads.push(ad);
        }
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message, step: 'create-from-spec' });
  }
});

module.exports = router;
