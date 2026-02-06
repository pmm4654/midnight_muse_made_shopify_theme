/**
 * Claude AI Service
 *
 * Powers the natural-language interface for ad campaign management.
 * Claude analyzes store data, suggests campaigns, explains strategies,
 * builds campaign specs, and assesses performance.
 */
const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `You are an expert Meta (Facebook/Instagram) advertising strategist and campaign manager integrated into a Shopify store's ad management tool.

Your role:
1. SUGGEST campaigns, ad sets, and ads based on the store's products, collections, and performance data
2. EXPLAIN your suggestions in plain English — why this objective, audience, budget, creative approach
3. BUILD complete campaign specifications as structured JSON that can be submitted to the Meta Marketing API
4. ASSESS campaign performance by analyzing metrics and providing actionable recommendations
5. EXECUTE changes when the user approves — output the exact API calls needed

Key principles:
- Always create campaigns in PAUSED status (draft mode) so the user can review before going live
- Suggest realistic budgets based on the store's apparent size and product pricing
- Use Meta's current campaign objectives: OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, OUTCOME_LEADS, OUTCOME_APP_PROMOTION, OUTCOME_SALES
- Structure targeting based on product type, audience demographics, and interests
- When building ad creatives, reference actual product images and descriptions from the store
- Explain advertising concepts in accessible language for store owners who may not be marketing experts

When providing campaign specifications, always output them in this JSON format:
{
  "campaign": {
    "name": "...",
    "objective": "OUTCOME_SALES",
    "status": "PAUSED",
    "special_ad_categories": []
  },
  "ad_sets": [
    {
      "name": "...",
      "daily_budget": "2000",  // in cents
      "optimization_goal": "OFFSITE_CONVERSIONS",
      "billing_event": "IMPRESSIONS",
      "targeting": {
        "age_min": 18,
        "age_max": 65,
        "genders": [0],
        "geo_locations": { "countries": ["US"] },
        "flexible_spec": [{ "interests": [{ "id": "...", "name": "..." }] }]
      },
      "start_time": "ISO date",
      "end_time": "ISO date or null for ongoing"
    }
  ],
  "ads": [
    {
      "name": "...",
      "creative": {
        "name": "...",
        "object_story_spec": {
          "page_id": "PAGE_ID",
          "link_data": {
            "message": "Ad copy text",
            "link": "https://store-url.com/product",
            "name": "Headline",
            "description": "Description",
            "image_url": "https://..."
          }
        }
      }
    }
  ]
}

When assessing performance, analyze these key metrics:
- CTR (Click-Through Rate): Good >1%, Great >2%
- CPC (Cost Per Click): Compare against industry averages ($1-2 for most e-commerce)
- ROAS (Return on Ad Spend): Target >3x for e-commerce
- CPM (Cost Per 1000 Impressions): Typical $5-15 for e-commerce
- Frequency: Watch for ad fatigue above 3-4
- Conversion Rate: Landing page effectiveness

Always provide specific, actionable next steps — never vague advice.`;

// ---------- Chat with AI ----------

async function chat(messages, storeContext = null, campaignContext = null) {
  const anthropic = getClient();

  // Build context message
  let contextParts = [];
  if (storeContext) {
    contextParts.push(`<store_data>\n${JSON.stringify(storeContext, null, 2)}\n</store_data>`);
  }
  if (campaignContext) {
    contextParts.push(`<campaign_data>\n${JSON.stringify(campaignContext, null, 2)}\n</campaign_data>`);
  }

  const systemMessage = contextParts.length > 0
    ? `${SYSTEM_PROMPT}\n\nCurrent context:\n${contextParts.join('\n\n')}`
    : SYSTEM_PROMPT;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemMessage,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return {
    content: response.content[0].text,
    usage: response.usage,
  };
}

// ---------- Suggest campaign ----------

async function suggestCampaign(storeData, userGoal) {
  const messages = [
    {
      role: 'user',
      content: `Based on my store data, I want to: ${userGoal}

Please suggest a complete campaign structure (campaign + ad sets + ads) with specific targeting, budgets, and ad copy. Explain your reasoning for each choice, then provide the full campaign specification as JSON.`,
    },
  ];

  return chat(messages, storeData);
}

// ---------- Assess performance ----------

async function assessPerformance(storeData, campaignData, insightsData) {
  const messages = [
    {
      role: 'user',
      content: `Please analyze the performance of my advertising campaigns and provide:
1. An overall assessment of how things are going
2. Specific metrics that are strong or concerning
3. Concrete suggestions for improvement
4. Any campaigns that should be paused, adjusted, or scaled up

Here are the campaign insights:
${JSON.stringify(insightsData, null, 2)}`,
    },
  ];

  return chat(messages, storeData, campaignData);
}

// ---------- Extract campaign spec from AI response ----------

function extractCampaignSpec(aiResponse) {
  // Try to find JSON in the response
  const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      // Fall through
    }
  }

  // Try to find raw JSON object
  const objectMatch = aiResponse.match(/\{[\s\S]*"campaign"[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch (e) {
      // Fall through
    }
  }

  return null;
}

// ---------- Test connection ----------

async function testConnection() {
  try {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with "connected" and nothing else.' }],
    });
    return { connected: true, response: response.content[0].text };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

module.exports = {
  chat,
  suggestCampaign,
  assessPerformance,
  extractCampaignSpec,
  testConnection,
};
