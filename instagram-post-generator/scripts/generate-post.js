#!/usr/bin/env node
/**
 * CLI script to generate an Instagram post without the web server.
 *
 * Usage:
 *   node scripts/generate-post.js                           # CSV source, random
 *   node scripts/generate-post.js --source website          # scrape live site
 *   node scripts/generate-post.js --source shopify          # Shopify Admin API
 *   node scripts/generate-post.js --seasonal                # seasonal picks
 *   node scripts/generate-post.js --count 3                 # pick 3 products
 *   node scripts/generate-post.js --type sale_announcement --mood dark_glamour
 *
 * Sources:
 *   csv      — Local CSV export (default, no auth needed)
 *   website  — Scrape midnightmusemade.com public storefront
 *   shopify  — Shopify Admin API (requires SHOPIFY_ACCESS_TOKEN + SHOPIFY_STORE_DOMAIN)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { pickProducts } = require('../services/product-catalog');
const { generatePost } = require('../services/claude-ai');

async function main() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
    }
  }

  const source = flags.source || 'csv';
  const strategy = flags.seasonal ? 'seasonal' : flags.featured ? 'featured' : 'random';
  const count = parseInt(flags.count) || 2;
  const postType = flags.type || 'product_spotlight';
  const mood = flags.mood || 'witchy_cozy';

  console.log(`\nSource: ${source}`);
  console.log(`Picking ${count} products (strategy: ${strategy})...\n`);

  const products = await pickProducts(count, strategy, source);

  if (products.length === 0) {
    console.error('No products found. Check your source configuration.');
    if (source === 'shopify') {
      console.error('  Ensure SHOPIFY_ACCESS_TOKEN and SHOPIFY_STORE_DOMAIN are set.');
    }
    process.exit(1);
  }

  console.log('Selected products:');
  products.forEach((p) => console.log(`  - ${p.title} ($${p.price}) — ${p.images.length} images`));
  console.log(`\nGenerating ${postType} post with ${mood} mood...\n`);

  const result = await generatePost(products, {
    postType,
    mood,
    includeImagePrompt: !flags['no-image-prompt'],
    customInstructions: flags.instructions || '',
  });

  if (result.post) {
    const post = result.post;

    console.log('='.repeat(60));
    console.log('CAPTION');
    console.log('='.repeat(60));
    console.log(post.caption?.replace(/\\n/g, '\n') || '(no caption)');

    console.log('\n' + '='.repeat(60));
    console.log(`HASHTAGS (${post.hashtags?.length || 0})`);
    console.log('='.repeat(60));
    console.log(post.hashtags?.map((h) => '#' + h).join(' ') || '(none)');

    if (post.suggestedImages?.length) {
      console.log('\n' + '='.repeat(60));
      console.log('SUGGESTED IMAGES');
      console.log('='.repeat(60));
      post.suggestedImages.forEach((img) => {
        console.log(`  ${img.productTitle} (image #${img.imageIndex}): ${img.reason}`);
      });
    }

    if (post.imageGenerationPrompt) {
      console.log('\n' + '='.repeat(60));
      console.log('IMAGE GENERATION PROMPT');
      console.log('='.repeat(60));
      console.log(post.imageGenerationPrompt);
    }

    if (post.postingTips) {
      console.log('\n' + '='.repeat(60));
      console.log('POSTING TIPS');
      console.log('='.repeat(60));
      console.log(post.postingTips);
    }
  } else {
    console.log('Raw response:\n', result.raw);
  }

  console.log(`\nTokens used: ${result.usage?.input_tokens || '?'} in / ${result.usage?.output_tokens || '?'} out`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
