/**
 * Meta Ads Manager — Single Page Application
 *
 * Client-side router and page controllers. All credentials are managed
 * via environment variables; the UI never collects or stores secrets.
 */

// ============================================================
// API helper
// ============================================================

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`/api${path}`, opts);
  return res.json();
}

// ============================================================
// Simple markdown renderer
// ============================================================

function renderMarkdown(text) {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    .replace(/^(?!<[huploc])(.*\S.*)$/gm, '<p>$1</p>')
    .replace(/\n{2,}/g, '\n');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================
// Router
// ============================================================

const routes = {
  '/setup': renderSetup,
  '/dashboard': renderDashboard,
  '/assistant': renderAssistant,
  '/campaigns': renderCampaigns,
  '/analytics': renderAnalytics,
  '/settings': renderSettings,
};

function navigate() {
  const hash = window.location.hash.split('?')[0] || '#/setup';
  const route = hash.replace('#', '');
  const renderer = routes[route] || routes['/setup'];
  renderer();
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', () => {
  api('GET', '/settings').then((settings) => {
    const allConfigured = settings.configured?.facebook && settings.configured?.shopify && settings.configured?.claude;
    if (!allConfigured && !window.location.hash) {
      window.location.hash = '#/setup';
    }
    navigate();
  }).catch(() => navigate());
});

// ============================================================
// Sidebar
// ============================================================

function initSidebar(activeRoute) {
  document.querySelectorAll('#sidebar').forEach((el) => {
    const tmpl = document.getElementById('tmpl-sidebar');
    el.innerHTML = tmpl.innerHTML;
    el.querySelectorAll('.nav-item').forEach((item) => {
      if (item.dataset.route === activeRoute) item.classList.add('active');
    });
  });
  checkSidebarStatus();
}

async function checkSidebarStatus() {
  try {
    const [meta, shopify, claude] = await Promise.all([
      api('GET', '/auth/meta/test').catch(() => ({ connected: false })),
      api('GET', '/shopify/test').catch(() => ({ connected: false })),
      api('GET', '/ai/test').catch(() => ({ connected: false })),
    ]);
    const allConnected = meta.connected && shopify.connected && claude.connected;
    const dot = document.getElementById('sidebar-status-dot');
    const text = document.getElementById('sidebar-status-text');
    if (dot && text) {
      dot.className = `status-dot ${allConnected ? 'connected' : 'pending'}`;
      text.textContent = allConnected ? 'All services connected' : 'Some services need setup';
    }
  } catch (e) { /* ignore */ }
}

// ============================================================
// Env-var status helper (shows which vars are set/missing)
// ============================================================

function renderEnvStatus(containerId, vars) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = vars.map(([name, isSet]) =>
    `<div class="flex gap-1 mb-1" style="align-items:center;font-size:0.85rem;">
      <span class="status-dot ${isSet ? 'connected' : 'disconnected'}"></span>
      <code>${name}</code>
      <span class="text-muted">${isSet ? 'set' : 'missing'}</span>
    </div>`
  ).join('');
}

// ============================================================
// Setup Wizard
// ============================================================

function renderSetup() {
  const app = document.getElementById('app');
  app.innerHTML = document.getElementById('tmpl-setup').innerHTML;

  let currentStep = 1;
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  if (params.get('step')) currentStep = parseInt(params.get('step'));

  // Check for OAuth callback token
  const oauthToken = params.get('oauth_token');
  if (oauthToken) {
    const display = document.getElementById('oauth-token-display');
    const value = document.getElementById('oauth-token-value');
    if (display && value) {
      display.classList.remove('hidden');
      value.textContent = `FACEBOOK_ACCESS_TOKEN=${decodeURIComponent(oauthToken)}`;
    }
  }

  // Load env var status
  api('GET', '/settings').then((s) => {
    renderEnvStatus('meta-env-status', [
      ['FACEBOOK_APP_ID', s.facebook?.app_id],
      ['FACEBOOK_APP_SECRET', s.facebook?.app_secret],
      ['FACEBOOK_AD_ACCOUNT_ID', s.facebook?.ad_account_id],
      ['FACEBOOK_ACCESS_TOKEN', s.facebook?.access_token],
    ]);
    renderEnvStatus('shopify-env-status', [
      ['SHOPIFY_CLIENT_ID', s.shopify?.client_id],
      ['SHOPIFY_API_KEY', s.shopify?.api_key],
    ]);
    renderEnvStatus('claude-env-status', [
      ['ANTHROPIC_API_KEY', s.claude?.api_key],
    ]);
  });

  updateWizardUI(currentStep);

  // OAuth button — redirects to the server-side OAuth initiator
  document.getElementById('btn-meta-oauth').addEventListener('click', () => {
    window.location.href = '/api/auth/meta/login';
  });

  // Test buttons
  document.getElementById('btn-meta-test').addEventListener('click', async () => {
    const el = document.getElementById('meta-test-result');
    el.innerHTML = '<div class="loading"><div class="spinner"></div> Testing...</div>';
    const r = await api('GET', '/auth/meta/test');
    el.innerHTML = r.connected
      ? `<div class="alert alert-success">Connected to ${r.account_name} (${r.account_id}) - ${r.currency}</div>`
      : `<div class="alert alert-danger">Failed: ${r.error}</div>`;
  });

  document.getElementById('btn-shopify-test').addEventListener('click', async () => {
    const el = document.getElementById('shopify-test-result');
    el.innerHTML = '<div class="loading"><div class="spinner"></div> Testing...</div>';
    const r = await api('GET', '/shopify/test');
    el.innerHTML = r.connected
      ? `<div class="alert alert-success">Connected to ${r.shop_name} (${r.domain})</div>`
      : `<div class="alert alert-danger">Failed: ${r.error}</div>`;
  });

  document.getElementById('btn-claude-test').addEventListener('click', async () => {
    const el = document.getElementById('claude-test-result');
    el.innerHTML = '<div class="loading"><div class="spinner"></div> Testing...</div>';
    const r = await api('GET', '/ai/test');
    el.innerHTML = r.connected
      ? '<div class="alert alert-success">Claude AI is connected and ready!</div>'
      : `<div class="alert alert-danger">Failed: ${r.error}</div>`;
  });

  // Navigation
  document.getElementById('btn-wizard-next').addEventListener('click', () => {
    if (currentStep === 3) { window.location.hash = '#/dashboard'; return; }
    currentStep++;
    updateWizardUI(currentStep);
  });

  document.getElementById('btn-wizard-back').addEventListener('click', () => {
    if (currentStep > 1) { currentStep--; updateWizardUI(currentStep); }
  });

  document.getElementById('btn-wizard-skip').addEventListener('click', () => {
    if (currentStep === 3) { window.location.hash = '#/dashboard'; return; }
    currentStep++;
    updateWizardUI(currentStep);
  });

  function updateWizardUI(step) {
    document.querySelectorAll('.wizard-step').forEach((el) => {
      const s = parseInt(el.dataset.step);
      el.classList.remove('active', 'completed');
      if (s === step) el.classList.add('active');
      if (s < step) el.classList.add('completed');
    });
    document.querySelectorAll('.wizard-connector').forEach((el) => {
      el.classList.toggle('completed', parseInt(el.dataset.connector) < step);
    });
    document.querySelectorAll('.wizard-panel').forEach((el) => {
      el.classList.toggle('hidden', parseInt(el.dataset.panel) !== step);
    });
    document.getElementById('btn-wizard-back').disabled = step === 1;
    document.getElementById('btn-wizard-next').textContent = step === 3 ? 'Finish Setup' : 'Next';
  }
}

// ============================================================
// Dashboard
// ============================================================

function renderDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = document.getElementById('tmpl-dashboard').innerHTML;
  initSidebar('dashboard');

  api('GET', '/analytics/summary').then((data) => {
    if (data.account) {
      document.getElementById('stat-spend').textContent = `$${parseFloat(data.account.spend || 0).toFixed(2)}`;
      document.getElementById('stat-impressions').textContent = formatNumber(data.account.impressions || 0);
      document.getElementById('stat-clicks').textContent = formatNumber(data.account.clicks || 0);
      document.getElementById('stat-ctr').textContent = `${parseFloat(data.account.ctr || 0).toFixed(2)}%`;
    }
  }).catch(() => {});

  loadDashboardCampaigns();
  document.getElementById('btn-refresh-campaigns').addEventListener('click', loadDashboardCampaigns);
  document.getElementById('btn-new-campaign').addEventListener('click', () => {
    window.location.hash = '#/assistant?action=suggest';
  });
}

async function loadDashboardCampaigns() {
  const container = document.getElementById('campaigns-list');
  try {
    const data = await api('GET', '/campaigns');
    const campaigns = data.data || [];
    if (campaigns.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>No campaigns yet</h3><p class="text-muted">Use the AI assistant to create your first campaign.</p><button class="btn btn-primary mt-1" onclick="window.location.hash='#/assistant'">Open AI Assistant</button></div>`;
      return;
    }
    container.innerHTML = `<table class="campaign-table"><thead><tr><th>Campaign</th><th>Objective</th><th>Status</th><th>Budget</th><th>Actions</th></tr></thead><tbody>${campaigns.map((c) => `<tr><td><div class="campaign-name">${escapeHtml(c.name)}</div></td><td><span class="campaign-objective">${formatObjective(c.objective)}</span></td><td><span class="badge badge-${c.status === 'ACTIVE' ? 'active' : 'paused'}">${c.status}</span></td><td>${formatBudget(c.daily_budget, c.lifetime_budget)}</td><td><div class="flex gap-1">${c.status === 'PAUSED' ? `<button class="btn btn-sm btn-success" onclick="activateCampaign('${c.id}')">Activate</button>` : `<button class="btn btn-sm btn-outline" onclick="pauseCampaign('${c.id}')">Pause</button>`}<button class="btn btn-sm btn-outline" onclick="window.location.hash='#/assistant?assess=${c.id}'">Assess</button></div></td></tr>`).join('')}</tbody></table>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-warning">Could not load campaigns. Check your Facebook connection in <a href="#/settings">Settings</a>.</div>`;
  }
}

window.activateCampaign = async function (id) {
  if (!confirm('Activate this campaign? It will start spending your budget.')) return;
  try { await api('POST', `/campaigns/${id}/activate`); loadDashboardCampaigns(); }
  catch (err) { alert('Failed to activate: ' + err.message); }
};

window.pauseCampaign = async function (id) {
  try { await api('POST', `/campaigns/${id}/pause`); loadDashboardCampaigns(); }
  catch (err) { alert('Failed to pause: ' + err.message); }
};

// ============================================================
// AI Assistant
// ============================================================

let chatHistory = [];

function renderAssistant() {
  const app = document.getElementById('app');
  app.innerHTML = document.getElementById('tmpl-assistant').innerHTML;
  initSidebar('assistant');

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-send-chat');
  const messagesEl = document.getElementById('chat-messages');

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  sendBtn.addEventListener('click', sendMessage);

  document.querySelectorAll('.quick-action').forEach((btn) => {
    btn.addEventListener('click', () => { input.value = btn.dataset.prompt; sendMessage(); });
  });

  // URL-driven actions
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  if (params.get('action') === 'suggest') {
    input.value = 'Suggest a new campaign based on my store products and data. What would you recommend?';
    sendMessage();
  } else if (params.get('action') === 'assess') {
    input.value = 'Assess my current campaign performance and tell me how things are going. What should I change?';
    sendMessage();
  } else if (params.get('assess')) {
    input.value = `Assess the performance of campaign ${params.get('assess')} and suggest improvements.`;
    sendMessage();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';

    document.getElementById('quick-actions').style.display = 'none';

    const typingEl = addMessage('assistant', '<div class="loading">Thinking<div class="loading-dots"><span></span><span></span><span></span></div></div>', true);

    try {
      const response = await api('POST', '/ai/chat', {
        messages: chatHistory,
        includeStoreData: document.getElementById('include-store-data').checked,
        includeCampaignData: document.getElementById('include-campaign-data').checked,
      });

      typingEl.remove();
      const content = response.content || 'I encountered an issue. Please try again.';
      chatHistory.push({ role: 'assistant', content });
      const msgEl = addMessage('assistant', renderMarkdown(content));

      const spec = extractSpecFromResponse(content);
      if (spec) addSpecPreview(msgEl, spec);
    } catch (err) {
      typingEl.remove();
      addMessage('assistant', `<div class="alert alert-danger">Error: ${err.message}. Check your Claude API connection in <a href="#/settings">Settings</a>.</div>`, true);
    }

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, content, isHtml = false) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${role}`;
    msgEl.innerHTML = `<div class="chat-avatar">${role === 'assistant' ? 'AI' : 'You'}</div><div class="chat-bubble">${content}</div>`;
    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msgEl;
  }

  function extractSpecFromResponse(text) {
    try {
      const m = text.match(/```json\n?([\s\S]*?)```/);
      if (m) { const p = JSON.parse(m[1]); if (p.campaign) return p; }
    } catch (e) {}
    return null;
  }

  function addSpecPreview(msgEl, spec) {
    const el = document.createElement('div');
    el.className = 'spec-preview';
    el.innerHTML = `
      <h4>Campaign Specification Detected</h4>
      <div class="spec-item"><span class="spec-label">Campaign Name</span><span class="spec-value">${escapeHtml(spec.campaign?.name || 'Unnamed')}</span></div>
      <div class="spec-item"><span class="spec-label">Objective</span><span class="spec-value">${formatObjective(spec.campaign?.objective)}</span></div>
      <div class="spec-item"><span class="spec-label">Status</span><span class="spec-value"><span class="badge badge-paused">DRAFT (Paused)</span></span></div>
      <div class="spec-item"><span class="spec-label">Ad Sets</span><span class="spec-value">${(spec.ad_sets || []).length} ad set(s)</span></div>
      <div class="spec-item"><span class="spec-label">Ads</span><span class="spec-value">${(spec.ads || []).length} ad(s)</span></div>
      ${(spec.ad_sets || []).map((as) => `<div class="spec-item"><span class="spec-label">Budget</span><span class="spec-value">${as.daily_budget ? '$' + (parseInt(as.daily_budget) / 100).toFixed(2) + '/day' : as.lifetime_budget ? '$' + (parseInt(as.lifetime_budget) / 100).toFixed(2) + ' lifetime' : 'Not set'}</span></div>`).join('')}
      <div class="spec-actions">
        <button class="btn btn-success" id="btn-create-draft">Create as Draft</button>
        <button class="btn btn-outline" id="btn-ask-questions">I have questions</button>
      </div>`;
    msgEl.querySelector('.chat-bubble').appendChild(el);

    el.querySelector('#btn-create-draft').addEventListener('click', async () => {
      const btn = el.querySelector('#btn-create-draft');
      btn.disabled = true;
      btn.textContent = 'Creating...';
      try {
        const result = await api('POST', '/campaigns/create-from-spec', spec);
        if (result.success) {
          btn.textContent = 'Created!';
          btn.className = 'btn btn-outline';
          chatHistory.push({ role: 'user', content: 'I approved the campaign spec. Please confirm what was created.' });
          const confirmText = `Your campaign has been created as a **draft** (PAUSED status). Here's what was set up:\n\n- **Campaign ID**: ${result.results.campaign?.id}\n- **Ad Sets Created**: ${result.results.ad_sets?.length || 0}\n- **Ads Created**: ${result.results.ads?.length || 0}\n\nThe campaign is paused and won't spend any money until you activate it. You can review it in the [Campaigns](#/campaigns) tab, or ask me to activate it when you're ready.`;
          chatHistory.push({ role: 'assistant', content: confirmText });
          addMessage('assistant', renderMarkdown(confirmText));
        } else {
          btn.textContent = 'Failed - Try Again'; btn.disabled = false;
          addMessage('assistant', `<div class="alert alert-danger">Failed to create campaign: ${result.error}</div>`, true);
        }
      } catch (err) {
        btn.textContent = 'Failed - Try Again'; btn.disabled = false;
        addMessage('assistant', `<div class="alert alert-danger">Error: ${err.message}</div>`, true);
      }
    });

    el.querySelector('#btn-ask-questions').addEventListener('click', () => {
      input.value = 'Before I create this campaign, I have some questions: ';
      input.focus();
    });
  }
}

// ============================================================
// Campaigns Page
// ============================================================

function renderCampaigns() {
  const app = document.getElementById('app');
  app.innerHTML = document.getElementById('tmpl-campaigns').innerHTML;
  initSidebar('campaigns');

  let filter = 'all';
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      filter = tab.dataset.filter;
      loadCampaignsTable(filter);
    });
  });

  document.getElementById('btn-create-campaign').addEventListener('click', () => {
    window.location.hash = '#/assistant?action=suggest';
  });

  loadCampaignsTable(filter);
}

async function loadCampaignsTable(filter = 'all') {
  const container = document.getElementById('campaigns-table-container');
  try {
    const data = await api('GET', '/campaigns');
    let campaigns = data.data || [];
    if (filter !== 'all') campaigns = campaigns.filter((c) => c.status === filter);
    if (campaigns.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>No ${filter !== 'all' ? filter.toLowerCase() : ''} campaigns</h3><p class="text-muted">Use the AI assistant to create campaigns with natural language.</p></div>`;
      return;
    }
    container.innerHTML = `<table class="campaign-table"><thead><tr><th>Campaign</th><th>Objective</th><th>Status</th><th>Budget</th><th>Created</th><th>Actions</th></tr></thead><tbody>${campaigns.map((c) => `<tr><td><div class="campaign-name">${escapeHtml(c.name)}</div></td><td><span class="campaign-objective">${formatObjective(c.objective)}</span></td><td><span class="badge badge-${c.status === 'ACTIVE' ? 'active' : 'paused'}">${c.status}</span></td><td>${formatBudget(c.daily_budget, c.lifetime_budget)}</td><td class="text-sm text-muted">${c.created_time ? new Date(c.created_time).toLocaleDateString() : '--'}</td><td><div class="flex gap-1">${c.status === 'PAUSED' ? `<button class="btn btn-sm btn-success" onclick="activateCampaign('${c.id}'); setTimeout(() => loadCampaignsTable('all'), 1000);">Activate</button>` : `<button class="btn btn-sm btn-outline" onclick="pauseCampaign('${c.id}'); setTimeout(() => loadCampaignsTable('all'), 1000);">Pause</button>`}<button class="btn btn-sm btn-outline" onclick="window.location.hash='#/assistant?assess=${c.id}'">AI Assess</button><button class="btn btn-sm btn-danger" onclick="deleteCampaignUI('${c.id}')">Delete</button></div></td></tr>`).join('')}</tbody></table>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-warning" style="margin:1rem;">Could not load campaigns. ${err.message}</div>`;
  }
}

window.deleteCampaignUI = async function (id) {
  if (!confirm('Delete this campaign? This cannot be undone.')) return;
  try { await api('DELETE', `/campaigns/${id}`); loadCampaignsTable('all'); }
  catch (err) { alert('Failed to delete: ' + err.message); }
};

// ============================================================
// Analytics Page
// ============================================================

function renderAnalytics() {
  const app = document.getElementById('app');
  app.innerHTML = document.getElementById('tmpl-analytics').innerHTML;
  initSidebar('analytics');

  const dateSelect = document.getElementById('date-range');
  dateSelect.addEventListener('change', () => loadAnalytics(dateSelect.value));
  document.getElementById('btn-ai-assess').addEventListener('click', runAiAssessment);
  document.getElementById('btn-close-assessment').addEventListener('click', () => {
    document.getElementById('ai-assessment-card').classList.add('hidden');
  });
  loadAnalytics('last_30d');
}

async function loadAnalytics(datePreset) {
  try {
    const data = await api('GET', `/analytics/summary?date_preset=${datePreset}`);
    if (data.account) {
      document.getElementById('a-stat-spend').textContent = `$${parseFloat(data.account.spend || 0).toFixed(2)}`;
      document.getElementById('a-stat-reach').textContent = formatNumber(data.account.reach || 0);
      document.getElementById('a-stat-clicks').textContent = formatNumber(data.account.clicks || 0);
      document.getElementById('a-stat-cpc').textContent = `$${parseFloat(data.account.cpc || 0).toFixed(2)}`;
    }
    const container = document.getElementById('analytics-campaigns-list');
    const campaigns = data.top_campaigns || [];
    if (campaigns.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>No active campaigns with data</h3></div>';
      return;
    }
    container.innerHTML = `<table class="campaign-table"><thead><tr><th>Campaign</th><th>Spend</th><th>Impressions</th><th>Clicks</th><th>CTR</th><th>CPC</th></tr></thead><tbody>${campaigns.map((c) => { const i = c.insights || {}; return `<tr><td><div class="campaign-name">${escapeHtml(c.name)}</div></td><td>$${parseFloat(i.spend || 0).toFixed(2)}</td><td>${formatNumber(i.impressions || 0)}</td><td>${formatNumber(i.clicks || 0)}</td><td>${parseFloat(i.ctr || 0).toFixed(2)}%</td><td>$${parseFloat(i.cpc || 0).toFixed(2)}</td></tr>`; }).join('')}</tbody></table>`;
  } catch (err) {
    document.getElementById('analytics-campaigns-list').innerHTML = '<div class="alert alert-warning">Could not load analytics. Check your Facebook connection.</div>';
  }
}

async function runAiAssessment() {
  const card = document.getElementById('ai-assessment-card');
  const content = document.getElementById('ai-assessment-content');
  card.classList.remove('hidden');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> AI is analyzing your campaigns...</div>';
  try {
    const datePreset = document.getElementById('date-range').value;
    const result = await api('POST', '/ai/assess', { datePreset });
    content.innerHTML = renderMarkdown(result.analysis || 'No analysis available.');
  } catch (err) {
    content.innerHTML = `<div class="alert alert-danger">Failed to get AI assessment: ${err.message}</div>`;
  }
}

// ============================================================
// Settings Page
// ============================================================

function renderSettings() {
  const app = document.getElementById('app');
  app.innerHTML = document.getElementById('tmpl-settings').innerHTML;
  initSidebar('settings');

  checkConnectionStatus();

  // Show env var status
  api('GET', '/settings').then((s) => {
    const el = document.getElementById('env-var-status');
    if (!el) return;
    const vars = [
      ['FACEBOOK_APP_ID', s.facebook?.app_id],
      ['FACEBOOK_APP_SECRET', s.facebook?.app_secret],
      ['FACEBOOK_AD_ACCOUNT_ID', s.facebook?.ad_account_id],
      ['FACEBOOK_ACCESS_TOKEN', s.facebook?.access_token],
      ['SHOPIFY_CLIENT_ID', s.shopify?.client_id],
      ['SHOPIFY_API_KEY', s.shopify?.api_key],
      ['ANTHROPIC_API_KEY', s.claude?.api_key],
    ];
    el.innerHTML = vars.map(([name, isSet]) =>
      `<div class="flex gap-1 mb-1" style="align-items:center;font-size:0.85rem;">
        <span class="status-dot ${isSet ? 'connected' : 'disconnected'}"></span>
        <code>${name}</code>
        <span class="text-muted">${isSet ? 'configured' : 'not set'}</span>
      </div>`
    ).join('');
  });
}

async function checkConnectionStatus() {
  const checks = [
    { key: 'meta', endpoint: '/auth/meta/test', dot: 'status-meta', text: 'status-meta-text' },
    { key: 'shopify', endpoint: '/shopify/test', dot: 'status-shopify', text: 'status-shopify-text' },
    { key: 'claude', endpoint: '/ai/test', dot: 'status-claude', text: 'status-claude-text' },
  ];
  for (const check of checks) {
    const dot = document.getElementById(check.dot);
    const text = document.getElementById(check.text);
    try {
      const result = await api('GET', check.endpoint);
      if (result.connected) {
        dot.className = 'status-dot connected';
        text.textContent = check.key === 'meta' ? `Connected: ${result.account_name || result.account_id}`
          : check.key === 'shopify' ? `Connected: ${result.shop_name || result.domain}`
          : 'Connected';
      } else {
        dot.className = 'status-dot disconnected';
        text.textContent = `Not connected: ${result.error || 'Unknown error'}`;
      }
    } catch (err) {
      dot.className = 'status-dot disconnected';
      text.textContent = 'Error checking connection';
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function formatNumber(n) {
  const num = parseInt(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatObjective(obj) {
  if (!obj) return '--';
  return obj.replace('OUTCOME_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatBudget(daily, lifetime) {
  if (daily) return `$${(parseInt(daily) / 100).toFixed(2)}/day`;
  if (lifetime) return `$${(parseInt(lifetime) / 100).toFixed(2)} total`;
  return '--';
}
