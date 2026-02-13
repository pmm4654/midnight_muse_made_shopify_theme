/**
 * Meta Marketing API Service
 *
 * Wraps the Meta (Facebook) Marketing API for campaign, ad set, ad,
 * and creative management. All campaigns are created in PAUSED status
 * (draft mode) so nothing goes live without explicit approval.
 */
const fetch = require('node-fetch');
const crypto = require('crypto');

const BASE = 'https://graph.facebook.com';

function apiVersion() {
  return process.env.FACEBOOK_API_VERSION || 'v21.0';
}

function url(endpoint) {
  return `${BASE}/${apiVersion()}/${endpoint}`;
}

function headers() {
  return { 'Content-Type': 'application/json' };
}

function token() {
  return process.env.FACEBOOK_ACCESS_TOKEN;
}

function adAccountId() {
  const raw = process.env.FACEBOOK_AD_ACCOUNT_ID || '';
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

// ---------- Generic request helper ----------

function appSecretProof() {
  return crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
    .update(token())
    .digest('hex');
}

async function metaRequest(method, endpoint, body = null) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const fullUrl = `${url(endpoint)}${separator}access_token=${token()}&appsecret_proof=${appSecretProof()}`;

  const opts = { method, headers: headers() };
  if (body && method !== 'GET') {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(fullUrl, opts);
  const data = await res.json();

  if (data.error) {
    const err = new Error(data.error.message);
    err.code = data.error.code;
    err.type = data.error.type;
    err.meta = data.error;
    throw err;
  }
  return data;
}

// ---------- Ad Account ----------

async function getAdAccount() {
  return metaRequest('GET', `${adAccountId()}?fields=name,account_id,account_status,currency,timezone_name,balance,amount_spent`);
}

async function getAdAccountPages() {
  return metaRequest('GET', `${adAccountId()}/promote_pages?fields=id,name,picture`);
}

// ---------- Campaigns ----------

async function listCampaigns(fields, limit = 25) {
  const f = fields || 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time';
  return metaRequest('GET', `${adAccountId()}/campaigns?fields=${f}&limit=${limit}`);
}

async function getCampaign(campaignId, fields) {
  const f = fields || 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,bid_strategy,buying_type,special_ad_categories';
  return metaRequest('GET', `${campaignId}?fields=${f}`);
}

async function createCampaign(params) {
  // Always create as PAUSED (draft) unless explicitly overridden
  const body = {
    name: params.name,
    objective: params.objective, // OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_SALES, etc.
    status: params.status || 'PAUSED',
    special_ad_categories: params.special_ad_categories || [],
    ...params.extra,
  };

  if (params.daily_budget) body.daily_budget = params.daily_budget;
  if (params.lifetime_budget) body.lifetime_budget = params.lifetime_budget;
  if (params.bid_strategy) body.bid_strategy = params.bid_strategy;

  return metaRequest('POST', `${adAccountId()}/campaigns`, body);
}

async function updateCampaign(campaignId, params) {
  return metaRequest('POST', `${campaignId}`, params);
}

async function deleteCampaign(campaignId) {
  return metaRequest('DELETE', `${campaignId}`);
}

// ---------- Ad Sets ----------

async function listAdSets(campaignId, fields, limit = 25) {
  const f = fields || 'id,name,campaign_id,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time';
  const endpoint = campaignId
    ? `${campaignId}/adsets?fields=${f}&limit=${limit}`
    : `${adAccountId()}/adsets?fields=${f}&limit=${limit}`;
  return metaRequest('GET', endpoint);
}

async function createAdSet(params) {
  const body = {
    name: params.name,
    campaign_id: params.campaign_id,
    status: params.status || 'PAUSED',
    optimization_goal: params.optimization_goal || 'LINK_CLICKS',
    billing_event: params.billing_event || 'IMPRESSIONS',
    targeting: params.targeting || {},
    ...params.extra,
  };

  if (params.daily_budget) body.daily_budget = params.daily_budget;
  if (params.lifetime_budget) body.lifetime_budget = params.lifetime_budget;
  if (params.bid_amount) body.bid_amount = params.bid_amount;
  if (params.start_time) body.start_time = params.start_time;
  if (params.end_time) body.end_time = params.end_time;

  return metaRequest('POST', `${adAccountId()}/adsets`, body);
}

async function updateAdSet(adSetId, params) {
  return metaRequest('POST', `${adSetId}`, params);
}

// ---------- Ad Creatives ----------

async function createAdCreative(params) {
  const body = {
    name: params.name,
    object_story_spec: params.object_story_spec,
    ...params.extra,
  };
  return metaRequest('POST', `${adAccountId()}/adcreatives`, body);
}

// ---------- Ads ----------

async function listAds(adSetId, fields, limit = 25) {
  const f = fields || 'id,name,adset_id,campaign_id,status,creative,created_time,updated_time';
  const endpoint = adSetId
    ? `${adSetId}/ads?fields=${f}&limit=${limit}`
    : `${adAccountId()}/ads?fields=${f}&limit=${limit}`;
  return metaRequest('GET', endpoint);
}

async function createAd(params) {
  const body = {
    name: params.name,
    adset_id: params.adset_id,
    creative: params.creative, // { creative_id: '...' }
    status: params.status || 'PAUSED',
    ...params.extra,
  };
  return metaRequest('POST', `${adAccountId()}/ads`, body);
}

async function updateAd(adId, params) {
  return metaRequest('POST', `${adId}`, params);
}

// ---------- Insights / Analytics ----------

async function getCampaignInsights(campaignId, params = {}) {
  const fields = params.fields || 'impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type';
  const datePreset = params.date_preset || 'last_30d';
  return metaRequest('GET', `${campaignId}/insights?fields=${fields}&date_preset=${datePreset}`);
}

async function getAdSetInsights(adSetId, params = {}) {
  const fields = params.fields || 'impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type';
  const datePreset = params.date_preset || 'last_30d';
  return metaRequest('GET', `${adSetId}/insights?fields=${fields}&date_preset=${datePreset}`);
}

async function getAdInsights(adId, params = {}) {
  const fields = params.fields || 'impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type';
  const datePreset = params.date_preset || 'last_30d';
  return metaRequest('GET', `${adId}/insights?fields=${fields}&date_preset=${datePreset}`);
}

async function getAccountInsights(params = {}) {
  const fields = params.fields || 'impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions';
  const datePreset = params.date_preset || 'last_30d';
  return metaRequest('GET', `${adAccountId()}/insights?fields=${fields}&date_preset=${datePreset}`);
}

// ---------- Activate (publish) ----------

async function activateCampaign(campaignId) {
  return updateCampaign(campaignId, { status: 'ACTIVE' });
}

async function pauseCampaign(campaignId) {
  return updateCampaign(campaignId, { status: 'PAUSED' });
}

async function activateAdSet(adSetId) {
  return updateAdSet(adSetId, { status: 'ACTIVE' });
}

async function activateAd(adId) {
  return updateAd(adId, { status: 'ACTIVE' });
}

// ---------- Token management ----------

async function exchangeCodeForToken(code, redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    client_secret: process.env.FACEBOOK_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${BASE}/${apiVersion()}/oauth/access_token?${params}`);
  return res.json();
}

async function getLongLivedToken(shortToken) {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.FACEBOOK_APP_ID,
    client_secret: process.env.FACEBOOK_APP_SECRET,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${BASE}/${apiVersion()}/oauth/access_token?${params}`);
  return res.json();
}

async function getTokenInfo() {
  const res = await fetch(`${BASE}/debug_token?input_token=${token()}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`);
  return res.json();
}

// ---------- Custom Audiences ----------

async function listCustomAudiences(fields, limit = 25) {
  const f = fields || 'id,name,description,approximate_count,subtype';
  return metaRequest('GET', `${adAccountId()}/customaudiences?fields=${f}&limit=${limit}`);
}

// ---------- Targeting search ----------

async function searchTargeting(type, query) {
  // type: adinterest, adinterestsuggestion, adlocale, adTargetingCategory
  return metaRequest('GET', `search?type=${type}&q=${encodeURIComponent(query)}`);
}

async function getTargetingSuggestions(interestList) {
  const interests = interestList.map((i) => (typeof i === 'string' ? { name: i } : i));
  return metaRequest('GET', `search?type=adinterestsuggestion&interest_list=${JSON.stringify(interests)}`);
}

module.exports = {
  getAdAccount,
  getAdAccountPages,
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listAdSets,
  createAdSet,
  updateAdSet,
  listAds,
  createAd,
  updateAd,
  createAdCreative,
  getCampaignInsights,
  getAdSetInsights,
  getAdInsights,
  getAccountInsights,
  activateCampaign,
  pauseCampaign,
  activateAdSet,
  activateAd,
  exchangeCodeForToken,
  getLongLivedToken,
  getTokenInfo,
  listCustomAudiences,
  searchTargeting,
  getTargetingSuggestions,
};
