/**
 * Claude AI Service for Instagram Post Generation
 *
 * Uses Claude to craft engaging Instagram captions, hashtags,
 * and image generation prompts based on product data.
 */
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');

let client = null;

function getClaudeCliToken() {
  try {
    const credPath = path.join(os.homedir(), '.claude', '.credentials.json');
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    const oauth = creds.claudeAiOauth;
    if (!oauth || !oauth.accessToken) return null;
    if (oauth.expiresAt && Date.now() > oauth.expiresAt) return null;
    return oauth.accessToken;
  } catch {
    return null;
  }
}

function getClient() {
  if (!client) {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    const baseURL = (process.env.ANTHROPIC_BASE_URL || '').trim();

    if (apiKey) {
      client = baseURL ? new Anthropic({ apiKey, baseURL }) : new Anthropic({ apiKey });
    } else {
      const cliToken = getClaudeCliToken();
      if (baseURL) {
        client = new Anthropic({ apiKey: 'local-proxy', baseURL });
      } else if (cliToken) {
        client = new Anthropic({ apiKey: null, authToken: cliToken });
      } else {
        client = new Anthropic();
      }
    }
  }
  return client;
}

const SYSTEM_PROMPT = `You are an expert Instagram content creator and social media strategist for "Midnight Muse Made" — a handmade, witchy/goth-inspired small business on Shopify that sells custom acrylic earrings, drink stirrers, graduation pins, party sashes, pet patches, wood ornaments, glass tumblers, and other personalized items.

Brand voice:
- Warm, creative, slightly witchy/spooky but approachable
- Small business owner energy — personal, genuine, grateful
- Uses dark aesthetics but keeps it fun and inviting
- Empowers customers to express their unique style
- Celebrates customization and one-of-a-kind creations

When creating Instagram posts:
1. Write an engaging caption (150-300 words) that tells a story or connects emotionally
2. Include a clear call-to-action (shop link, DM for customs, etc.)
3. Generate 20-30 relevant hashtags mixing popular and niche tags
4. Suggest the best product image(s) to use from the provided options
5. If requested, provide an image generation prompt for creating a styled product photo or promotional graphic

Hashtag strategy:
- Mix of sizes: some large (500K+ posts), medium (50K-500K), and niche (<50K)
- Always include: #midnightmusemade #handmade #shopsmall
- Seasonal/trending tags when relevant
- Product-specific tags
- Community tags (#witchyvibes, #gothstyle, #spookycute, etc.)

Post types you can create:
- Product spotlight (single product focus)
- New arrival announcement
- Behind-the-scenes / process
- Customer appreciation / social proof
- Seasonal / holiday themed
- Collection showcase (multiple products)
- Sale / promo announcement`;

/**
 * Generate an Instagram post for the given products.
 */
async function generatePost(products, options = {}) {
  const {
    postType = 'product_spotlight',
    mood = 'witchy_cozy',
    includeImagePrompt = true,
    customInstructions = '',
  } = options;

  const productContext = products.map((p) => ({
    title: p.title,
    description: p.description.substring(0, 500),
    price: p.price,
    tags: p.tags.slice(0, 15),
    url: p.url,
    imageCount: p.images.length,
    images: p.images.slice(0, 4).map((img, i) => ({
      index: i + 1,
      src: img.src,
      alt: img.alt,
    })),
    variants: p.variants.slice(0, 6).map((v) => v.name),
  }));

  const userMessage = `Create an Instagram post for these products from Midnight Muse Made:

<products>
${JSON.stringify(productContext, null, 2)}
</products>

Post type: ${postType}
Mood/aesthetic: ${mood}
${customInstructions ? `Additional instructions: ${customInstructions}` : ''}

Please provide your response in this exact JSON format:
{
  "caption": "The full Instagram caption text with emojis and line breaks (use \\n for line breaks)",
  "hashtags": ["array", "of", "hashtags", "without", "the", "hash", "symbol"],
  "suggestedImages": [
    {
      "productTitle": "Which product",
      "imageIndex": 1,
      "reason": "Why this image works best"
    }
  ],
  "postingTips": "Brief tips on when/how to post this",
  ${includeImagePrompt ? '"imageGenerationPrompt": "A detailed prompt for generating a styled promotional image featuring these products. Describe the scene, lighting, colors, composition, and mood. This should be suitable for an AI image generator like DALL-E or Midjourney.",' : ''}
  "altText": "Accessible alt text describing the post image"
}`;

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text;

  // Extract JSON from the response
  let parsed;
  try {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    }
  } catch (e) {
    // Return raw text if JSON parsing fails
    parsed = null;
  }

  return {
    raw: text,
    post: parsed,
    products: productContext,
    usage: response.usage,
  };
}

/**
 * Regenerate just the caption with a different angle.
 */
async function rewriteCaption(originalCaption, products, instructions) {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here's an Instagram caption I generated but want to revise:

"${originalCaption}"

Products featured: ${products.map((p) => p.title).join(', ')}

Please rewrite it with these changes: ${instructions}

Return ONLY the new caption text (with emojis and \\n for line breaks), no JSON wrapping.`,
      },
    ],
  });

  return {
    caption: response.content[0].text,
    usage: response.usage,
  };
}

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
  generatePost,
  rewriteCaption,
  testConnection,
};
