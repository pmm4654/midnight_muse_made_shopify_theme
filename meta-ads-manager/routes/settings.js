/**
 * Settings Routes (read-only)
 *
 * Reports connection status by checking which env vars are set.
 * Credentials are managed exclusively through environment variables —
 * this route never reads or writes .env files.
 */
const express = require('express');
const router = express.Router();

// Which env var is configured? Returns true/false, never the actual value.
function isSet(name) {
  return !!(process.env[name] && process.env[name].trim());
}

function hasClaudeCliAuth() {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    return !!creds.claudeAiOauth?.accessToken;
  } catch {
    return false;
  }
}

// GET /api/settings — returns which services are configured (no secrets exposed)
router.get('/', (req, res) => {
  const hasProxy = isSet('ANTHROPIC_BASE_URL');
  const hasApiKey = isSet('ANTHROPIC_API_KEY');
  const hasCli = hasClaudeCliAuth();
  const claudeMode = hasApiKey
    ? 'api_key'
    : hasProxy
      ? 'local_proxy'
      : hasCli
        ? 'cli_oauth'
        : 'unconfigured';

  res.json({
    facebook: {
      app_id: isSet('FACEBOOK_APP_ID'),
      app_secret: isSet('FACEBOOK_APP_SECRET'),
      ad_account_id: isSet('FACEBOOK_AD_ACCOUNT_ID'),
      access_token: isSet('FACEBOOK_ACCESS_TOKEN'),
    },
    shopify: {
      client_id: isSet('SHOPIFY_CLIENT_ID'),
      api_key: isSet('SHOPIFY_API_KEY'),
      store_domain: isSet('SHOPIFY_STORE_DOMAIN'),
    },
    claude: {
      api_key: isSet('ANTHROPIC_API_KEY'),
      base_url: isSet('ANTHROPIC_BASE_URL'),
      auth_mode: claudeMode,
    },
    configured: {
      facebook: isSet('FACEBOOK_APP_ID') && isSet('FACEBOOK_APP_SECRET') && isSet('FACEBOOK_AD_ACCOUNT_ID') && isSet('FACEBOOK_ACCESS_TOKEN'),
      shopify: isSet('SHOPIFY_CLIENT_ID') && isSet('SHOPIFY_API_KEY') && isSet('SHOPIFY_STORE_DOMAIN'),
      claude: hasApiKey || hasProxy || hasCli,
    },
  });
});

module.exports = router;
