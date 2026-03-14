/**
 * Claude AI Service for Instagram Post Generation
 *
 * Uses Claude to craft engaging Instagram captions, hashtags,
 * and image generation prompts based on product data.
 */
const Anthropic = require('@anthropic-ai/sdk');
const { execSync, spawn } = require('child_process');

let client = null;
let cliMode = false;

function getClient() {
  if (!client) {
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    const baseURL = (process.env.ANTHROPIC_BASE_URL || '').trim();

    if (apiKey) {
      client = baseURL ? new Anthropic({ apiKey, baseURL }) : new Anthropic({ apiKey });
    } else if (baseURL) {
      client = new Anthropic({ apiKey: 'local-proxy', baseURL });
    } else {
      // No API key — we'll use the Claude CLI as a subprocess
      cliMode = true;
      client = 'cli';
    }
  }
  return client;
}

/**
 * Call Claude via the CLI subprocess (for claude.ai auth users without an API key).
 * Uses `claude -p` (print mode) which sends a single prompt and returns the response.
 */
async function callViaCli(systemPrompt, userMessage) {
  return new Promise((resolve, reject) => {
    // Pipe prompt via stdin to avoid shell argument length limits
    const proc = spawn('claude', [
      '-p',
      '--output-format', 'json',
      '--model', 'claude-sonnet-4-20250514',
      '--max-turns', '1',
    ], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    // Set a 2 minute timeout
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Claude CLI timed out after 120 seconds'));
    }, 120000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        return reject(new Error(`Claude CLI exited with code ${code}: ${stderr.slice(0, 500)}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve({
          content: [{ text: parsed.result || parsed.content || stdout }],
          usage: parsed.usage || { input_tokens: 0, output_tokens: 0 },
        });
      } catch {
        resolve({
          content: [{ text: stdout.trim() }],
          usage: { input_tokens: 0, output_tokens: 0 },
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    // Write the prompt to stdin and close it
    proc.stdin.write(userMessage);
    proc.stdin.end();
  });
}

/**
 * Check if Claude CLI authentication is available.
 */
function isCliAuthAvailable() {
  try {
    const status = execSync('claude auth status 2>/dev/null', { encoding: 'utf-8', timeout: 5000 });
    return status.includes('"loggedIn": true') || status.includes('"loggedIn":true');
  } catch {
    return false;
  }
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
  ${includeImagePrompt ? `"imageGenerationPrompt": "A detailed prompt for generating a styled product photo. Structure it with ALL 5 of these elements in order: (1) image style (e.g. 'studio product photo', 'creative product photograph'), (2) product description, (3) placement (e.g. 'on a dark marble surface'), (4) surroundings (e.g. 'surrounded by dried lavender and crystals'), (5) background (e.g. 'deep plum velvet with warm candlelight'). Include 2-3 quality modifiers like 'professional product photography, in focus, soft directional lighting'. Use the brand aesthetic: dark/gothic/cozy with deep purples, warm golds, near-black tones, candlelight, vintage textures. IMPORTANT: Do NOT describe humans, hands, animals, weapons, or sexual content. Do NOT be vague — be specific and atmospheric like a photographer's creative brief.",` : ''}
  "altText": "Accessible alt text describing the post image"
}`;

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userMessage}`;
  let response;

  const c = getClient();
  if (cliMode) {
    response = await callViaCli(SYSTEM_PROMPT, fullPrompt);
  } else {
    response = await c.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
  }

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
  const userMsg = `Here's an Instagram caption I generated but want to revise:

"${originalCaption}"

Products featured: ${products.map((p) => p.title).join(', ')}

Please rewrite it with these changes: ${instructions}

Return ONLY the new caption text (with emojis and \\n for line breaks), no JSON wrapping.`;

  let response;
  const c = getClient();
  if (cliMode) {
    response = await callViaCli(SYSTEM_PROMPT, `${SYSTEM_PROMPT}\n\n${userMsg}`);
  } else {
    response = await c.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    });
  }

  return {
    caption: response.content[0].text,
    usage: response.usage,
  };
}

async function testConnection() {
  try {
    const c = getClient();
    if (cliMode) {
      const available = isCliAuthAvailable();
      return available
        ? { connected: true, response: 'connected (Claude CLI)', method: 'cli' }
        : { connected: false, error: 'Claude CLI not authenticated. Run: claude auth login' };
    }
    const response = await c.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with "connected" and nothing else.' }],
    });
    return { connected: true, response: response.content[0].text, method: 'api' };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

module.exports = {
  generatePost,
  rewriteCaption,
  testConnection,
  isCliAuthAvailable,
};
