#!/usr/bin/env node
/**
 * CLI script to publish an Instagram post via Meta Business Suite.
 *
 * Usage:
 *   node scripts/publish-post.js --caption "Your caption" --image ./photo.jpg
 *   node scripts/publish-post.js --caption "Caption" --image-url "https://..." --hashtags "tag1,tag2,tag3"
 *   node scripts/publish-post.js --caption "Caption" --image ./photo.jpg --schedule "2026-03-15T14:00:00"
 *   node scripts/publish-post.js --init-session          # Open browser for Meta login
 *   node scripts/publish-post.js --check-session          # Check if session is valid
 *
 * Options:
 *   --caption       Post caption text (required for publishing)
 *   --image         Local path to image file
 *   --image-url     URL to download image from
 *   --hashtags      Comma-separated hashtags (without #)
 *   --schedule      ISO datetime for scheduling (e.g. 2026-03-15T14:00:00)
 *   --confirm       Skip preview and publish immediately
 *   --no-headless   Show browser window (useful for debugging)
 *   --init-session  Open browser for manual Meta Business Suite login
 *   --check-session Check if saved session is valid
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { publishToInstagram, initSession, checkSession } = require('../services/meta-publisher');

async function main() {
  const args = process.argv.slice(2);
  const flags = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (key === 'confirm' || key === 'no-headless' || key === 'init-session' || key === 'check-session') {
        flags[key] = true;
      } else {
        flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      }
    }
  }

  // Session management commands
  if (flags['check-session']) {
    const session = checkSession();
    console.log('\nSession status:', JSON.stringify(session, null, 2));
    process.exit(session.valid ? 0 : 1);
  }

  if (flags['init-session']) {
    console.log('\nInitializing Meta Business Suite session...');
    console.log('A browser window will open. Log in to business.facebook.com.\n');
    const result = await initSession({ headless: false });
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }

  // Publishing
  const caption = flags.caption;
  if (!caption) {
    console.error('\nError: --caption is required for publishing.');
    console.error('Usage: node scripts/publish-post.js --caption "Your caption" --image ./photo.jpg');
    console.error('       node scripts/publish-post.js --init-session   # Login first');
    console.error('       node scripts/publish-post.js --check-session  # Check login\n');
    process.exit(1);
  }

  const imagePath = flags.image;
  const imageUrl = flags['image-url'];

  if (!imagePath && !imageUrl) {
    console.error('\nError: Either --image or --image-url is required.');
    process.exit(1);
  }

  const hashtags = flags.hashtags ? flags.hashtags.split(',').map(h => h.trim()) : [];
  const scheduleTime = flags.schedule || null;
  const confirm = !!flags.confirm;
  const headless = !flags['no-headless'];

  console.log('\n  Publishing to Instagram via Meta Business Suite');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Caption: ${caption.substring(0, 80)}${caption.length > 80 ? '...' : ''}`);
  console.log(`  Hashtags: ${hashtags.length > 0 ? hashtags.map(h => '#' + h).join(' ') : '(none)'}`);
  console.log(`  Image: ${imagePath || imageUrl}`);
  if (scheduleTime) console.log(`  Schedule: ${scheduleTime}`);
  console.log(`  Mode: ${confirm ? 'PUBLISH' : 'PREVIEW (add --confirm to publish)'}`);
  console.log(`  Browser: ${headless ? 'headless' : 'visible'}`);
  console.log('');

  const result = await publishToInstagram({
    caption,
    hashtags,
    imagePath,
    imageUrl,
    scheduleTime,
    confirm,
    headless,
  });

  if (result.success) {
    console.log(`  ✓ ${result.message}`);
    if (result.screenshotPath) {
      console.log(`  Screenshot: ${result.screenshotPath}`);
    }
    if (result.needsConfirmation) {
      console.log('\n  To publish, run again with --confirm');
    }
  } else {
    console.error(`  ✗ Error: ${result.error}`);
    if (result.screenshotPath) {
      console.error(`  Screenshot: ${result.screenshotPath}`);
    }
    if (result.needsLogin) {
      console.error('\n  Run: node scripts/publish-post.js --init-session');
    }
    process.exit(1);
  }

  console.log('');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
