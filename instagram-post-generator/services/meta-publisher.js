/**
 * Meta Business Suite Publisher
 *
 * Automates Instagram posting via Meta Business Suite using Playwright.
 * Supports session persistence, image upload, caption filling, scheduling,
 * and human-in-the-loop confirmation before publishing.
 *
 * Selectors were mapped from the live Meta Business Suite UI (March 2026).
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const STORAGE_STATE_PATH = path.join(__dirname, '..', 'storageState.json');
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const META_BUSINESS_URL = 'https://business.facebook.com';
const COMPOSER_URL = `${META_BUSINESS_URL}/latest/composer/`;

// Ensure directories exist
for (const dir of [SCREENSHOTS_DIR, TEMP_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Check if a saved session exists and is likely valid.
 */
function checkSession() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    return { valid: false, reason: 'No saved session found. Run initSession() first.' };
  }

  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE_PATH, 'utf-8'));
    const cookies = state.cookies || [];
    const metaCookies = cookies.filter(c =>
      c.domain?.includes('facebook.com') || c.domain?.includes('meta.com')
    );

    if (metaCookies.length === 0) {
      return { valid: false, reason: 'No Meta/Facebook cookies in saved session.' };
    }

    const now = Date.now() / 1000;
    const hasValidCookies = metaCookies.some(c => !c.expires || c.expires > now);

    if (!hasValidCookies) {
      return { valid: false, reason: 'All Meta cookies have expired. Re-run initSession().' };
    }

    return { valid: true, cookieCount: metaCookies.length };
  } catch (e) {
    return { valid: false, reason: `Error reading session: ${e.message}` };
  }
}

/**
 * Launch a browser for manual Meta Business Suite login.
 * User logs in manually, then session is saved for future automation.
 */
async function initSession({ headless = false } = {}) {
  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  console.log('\n  Opening Meta Business Suite login...');
  console.log('  Please log in manually in the browser window.');
  console.log('  After logging in, the session will be saved automatically.\n');

  await page.goto(META_BUSINESS_URL, { waitUntil: 'domcontentloaded' });

  // Wait for user to log in — detect when we're on the Business Suite dashboard
  try {
    await page.waitForURL(/business\.facebook\.com\/latest/, { timeout: 300000 }); // 5 min
    console.log('  Login detected! Saving session...');
  } catch {
    const url = page.url();
    if (url.includes('business.facebook.com') && !url.includes('login')) {
      console.log('  Authenticated page detected. Saving session...');
    } else {
      console.log('  Timeout waiting for login. Saving current state anyway...');
    }
  }

  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log(`  Session saved to ${STORAGE_STATE_PATH}`);

  await browser.close();
  return { success: true, path: STORAGE_STATE_PATH };
}

/**
 * Download an image from URL to a local temp file.
 */
async function downloadImage(imageUrl) {
  const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
  const filename = `upload_${Date.now()}${ext}`;
  const filepath = path.join(TEMP_DIR, filename);

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);

  const buffer = await res.buffer();
  fs.writeFileSync(filepath, buffer);

  return filepath;
}

/**
 * Clean up a temp file after upload.
 */
function cleanupTempFile(filepath) {
  try {
    if (filepath.startsWith(TEMP_DIR) && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch { /* ignore cleanup errors */ }
}

/**
 * Dismiss overlay modals that Meta Business Suite shows on page load.
 *
 * Known modals (mapped from live UI March 2026):
 * - GeoIllustrationModal: "Get Meta Verified" promo — has "Not now" and "Close" buttons
 * - GeoTour: "There are changes to the default Post to selection" — has "Done" and "Close"
 * - GeoGuidanceCard: inline guidance card — has "Close" and "See more"
 *
 * IMPORTANT: Must use page.evaluate() for JS clicks because these modals
 * intercept Playwright's pointer events, causing click() to timeout.
 */
async function dismissOverlayModals(page) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const dismissed = await page.evaluate(() => {
      // Find modals by their data-surface attribute (reliable Meta identifier)
      const modalSurfaces = [
        'GeoIllustrationModal',
        'GeoTour',
        'GeoGuidanceCard',
      ];

      for (const surfaceName of modalSurfaces) {
        const surface = document.querySelector(`[data-surface*="${surfaceName}"]`);
        if (!surface) continue;

        // Find dismiss buttons inside this surface
        const buttons = surface.querySelectorAll('div[role="button"]');
        // Prefer "Not now", "Done", "Close" in that order — avoid "Get Meta Verified" etc
        const dismissTexts = ['not now', 'done', 'got it', 'close', 'skip', 'maybe later'];

        for (const dismissText of dismissTexts) {
          for (const btn of buttons) {
            // Use normalize to strip zero-width chars Meta inserts
            const text = (btn.textContent || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
            if (text === dismissText) {
              btn.click();
              return `${surfaceName}: clicked "${dismissText}"`;
            }
          }
        }

        // Fallback: click the first button that looks like a close (short text)
        for (const btn of buttons) {
          const text = (btn.textContent || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
          if (text.length <= 10) {
            btn.click();
            return `${surfaceName}: clicked fallback "${text}"`;
          }
        }
      }

      // Also check for generic role="dialog" modals
      const dialogs = document.querySelectorAll('div[role="dialog"]');
      for (const dialog of dialogs) {
        const buttons = dialog.querySelectorAll('div[role="button"]');
        const dismissTexts = ['not now', 'done', 'got it', 'close', 'skip', 'dismiss'];
        for (const dismissText of dismissTexts) {
          for (const btn of buttons) {
            const text = (btn.textContent || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
            if (text === dismissText) {
              btn.click();
              return `dialog: clicked "${dismissText}"`;
            }
          }
        }
      }

      return null;
    });

    if (dismissed) {
      console.log(`  Dismissed modal: ${dismissed}`);
      await page.waitForTimeout(1500);
    } else {
      break;
    }
  }
}

/**
 * Upload an image in the Meta Business Suite composer.
 *
 * The composer has a hidden input[type="file"][accept="image/*,..."] in the DOM.
 * We click "Add photo/video" button via JS to trigger the file picker,
 * then use the filechooser event to set the file.
 */
async function uploadImage(page, localImagePath) {
  // Strategy 1: Click "Add photo/video" button and catch filechooser
  // This button exists on data-surface="/bizweb:composer"
  console.log('  Looking for "Add photo/video" button...');
  const addPhotoBtn = await page.$('[data-surface*="composer"] div[role="button"]:has-text("Add photo/video")');

  if (addPhotoBtn) {
    try {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 8000 }),
        // Use JS click to avoid pointer interception from overlays
        addPhotoBtn.evaluate(el => el.click()),
      ]);
      await fileChooser.setFiles(localImagePath);
      console.log('  Image uploaded via filechooser');
      await page.waitForTimeout(3000);
      return;
    } catch {
      console.log('  Filechooser not triggered, trying file input directly...');
    }
  }

  // Strategy 2: Find hidden file input and set files directly
  const fileInput = await page.$('input[type="file"][accept*="image"]');
  if (fileInput) {
    console.log('  Found hidden file input, setting files directly...');
    await fileInput.setInputFiles(localImagePath);
    await page.waitForTimeout(3000);
    return;
  }

  // Strategy 3: Click any visible media button and retry filechooser
  const mediaButtons = await page.$$('div[role="button"]');
  for (const btn of mediaButtons) {
    const text = await btn.textContent().catch(() => '');
    const normalText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
    if (!normalText.includes('photo') && !normalText.includes('media') && !normalText.includes('image')) continue;

    console.log(`  Trying filechooser via button: "${normalText}"...`);
    try {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        btn.evaluate(el => el.click()),
      ]);
      await fileChooser.setFiles(localImagePath);
      console.log('  Image uploaded via filechooser');
      await page.waitForTimeout(3000);
      return;
    } catch {
      // Check if a file input appeared after the click
      const newInput = await page.$('input[type="file"]');
      if (newInput) {
        console.log('  File input appeared after click, setting files...');
        await newInput.setInputFiles(localImagePath);
        await page.waitForTimeout(3000);
        return;
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  }

  // Strategy 4: Drag-and-drop via DataTransfer API
  console.log('  Trying drag-and-drop upload...');
  const imageBuffer = fs.readFileSync(localImagePath);
  const fileName = path.basename(localImagePath);

  await page.evaluate(({ base64, fileName, mimeType }) => {
    const byteChars = atob(base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const file = new File([byteArray], fileName, { type: mimeType });

    const dropTarget = document.querySelector(
      '[data-surface*="composer"] div[role="combobox"], ' +
      '[data-surface*="composer"], ' +
      'div[role="textbox"]'
    ) || document.body;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    for (const eventType of ['dragenter', 'dragover', 'drop']) {
      dropTarget.dispatchEvent(new DragEvent(eventType, {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
    }
  }, {
    base64: imageBuffer.toString('base64'),
    fileName,
    mimeType: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
  });

  await page.waitForTimeout(3000);
  console.log('  Image upload attempted via drag-and-drop — check screenshot to verify.');
}

/**
 * Publish (or preview) an Instagram post via Meta Business Suite.
 */
async function publishToInstagram(options) {
  const {
    caption,
    hashtags = [],
    imagePath,
    imageUrl,
    scheduleTime,
    confirm = false,
    headless = true,
  } = options;

  // Validate session
  const session = checkSession();
  if (!session.valid) {
    return { success: false, error: session.reason, needsLogin: true };
  }

  // Prepare image
  let localImagePath = imagePath;
  let tempFile = null;

  if (!localImagePath && imageUrl) {
    localImagePath = await downloadImage(imageUrl);
    tempFile = localImagePath;
  }

  if (!localImagePath || !fs.existsSync(localImagePath)) {
    return { success: false, error: 'No image provided or image file not found.' };
  }

  // Build full caption with hashtags
  const hashtagString = hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
  const fullCaption = hashtagString
    ? `${caption}\n\n${hashtagString}`
    : caption;

  let browser;
  let screenshotPath;

  try {
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      storageState: STORAGE_STATE_PATH,
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // Step 1: Navigate directly to the composer page
    console.log('  Navigating to Meta Business Suite composer...');
    await page.goto(COMPOSER_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Check if we need to re-authenticate
    if (page.url().includes('login') || page.url().includes('checkpoint')) {
      if (tempFile) cleanupTempFile(tempFile);
      await browser.close();
      return { success: false, error: 'Session expired. Please run initSession() to re-login.', needsLogin: true };
    }

    // Step 2: Dismiss all overlay modals
    console.log('  Dismissing modals...');
    await dismissOverlayModals(page);
    await page.waitForTimeout(1000);

    // Verify we're on the composer page — look for the caption field
    const composerLoaded = await page.$('[data-surface*="composer"] div[role="combobox"]');
    if (!composerLoaded) {
      // Maybe we need to navigate via Create Post button from home
      console.log('  Composer not loaded, trying via home page...');
      await page.goto(`${META_BUSINESS_URL}/latest/home`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(5000);
      await dismissOverlayModals(page);

      // Click Create Post button (use JS click to avoid pointer interception)
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('div[role="button"]');
        for (const btn of buttons) {
          const text = (btn.textContent || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
          if (text === 'Create post') {
            btn.click();
            return;
          }
        }
      });
      await page.waitForTimeout(5000);
      await dismissOverlayModals(page);
    }

    // Step 3: Upload image
    console.log('  Uploading image...');
    await uploadImage(page, localImagePath);

    // Step 4: Fill caption
    // The caption field is: div[role="combobox"][aria-label="Write into the dialogue box..."][contenteditable="true"]
    console.log('  Writing caption...');
    const captionField = await page.$(
      'div[role="combobox"][contenteditable="true"], ' +
      '[aria-label*="Write into the dialogue box"], ' +
      '[data-surface*="composer"] div[role="textbox"], ' +
      '[data-surface*="composer"] [contenteditable="true"]'
    );
    if (captionField) {
      await captionField.evaluate(el => el.click());
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(fullCaption, { delay: 5 });
      console.log('  Caption entered');
    } else {
      console.log('  Warning: Could not find caption field.');
    }

    await page.waitForTimeout(1000);

    // Step 5: Handle scheduling (if requested)
    // The schedule toggle is: input[role="switch"][aria-label="Set date and time"]
    if (scheduleTime) {
      console.log(`  Setting schedule: ${scheduleTime}...`);
      const scheduleToggle = await page.$('input[role="switch"][aria-label="Set date and time"]');
      if (scheduleToggle) {
        const isChecked = await scheduleToggle.isChecked();
        if (!isChecked) {
          await scheduleToggle.evaluate(el => el.click());
          await page.waitForTimeout(1500);
        }
        // Look for date/time inputs that appear after toggling
        const dateInput = await page.$('input[type="date"], input[aria-label*="date" i]');
        const timeInput = await page.$('input[type="time"], input[aria-label*="time" i]');
        const dt = new Date(scheduleTime);
        if (dateInput) await dateInput.fill(dt.toISOString().split('T')[0]);
        if (timeInput) await timeInput.fill(dt.toTimeString().slice(0, 5));
      } else {
        console.log('  Warning: Could not find schedule toggle.');
      }
    }

    // Step 6: Take preview screenshot
    await page.waitForTimeout(1000);
    screenshotPath = path.join(SCREENSHOTS_DIR, `preview_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  Preview screenshot saved: ${screenshotPath}`);

    // Step 7: Publish or stop for review
    if (confirm) {
      console.log('  Publishing...');

      // The Publish button is: div[role="button"]:has-text("Publish") on data-surface="/bizweb:composer"
      const published = await page.evaluate(() => {
        const buttons = document.querySelectorAll('[data-surface*="composer"] div[role="button"]');
        for (const btn of buttons) {
          const text = (btn.textContent || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
          if (text === 'Publish') {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (published) {
        await page.waitForTimeout(8000);

        const postPublishScreenshot = path.join(SCREENSHOTS_DIR, `published_${Date.now()}.png`);
        await page.screenshot({ path: postPublishScreenshot, fullPage: false });

        await context.storageState({ path: STORAGE_STATE_PATH });
        if (tempFile) cleanupTempFile(tempFile);
        await browser.close();

        return {
          success: true,
          message: scheduleTime ? `Post scheduled for ${scheduleTime}` : 'Post published successfully',
          screenshotPath: postPublishScreenshot,
          previewScreenshotPath: screenshotPath,
          publishedAt: new Date().toISOString(),
        };
      } else {
        const errorScreenshot = path.join(SCREENSHOTS_DIR, `error_no_publish_btn_${Date.now()}.png`);
        await page.screenshot({ path: errorScreenshot, fullPage: false });
        if (tempFile) cleanupTempFile(tempFile);
        await browser.close();

        return {
          success: false,
          error: 'Could not find Publish button. Check the screenshot.',
          screenshotPath: errorScreenshot,
          previewScreenshotPath: screenshotPath,
        };
      }
    } else {
      // Preview mode — don't publish, just return screenshot
      await context.storageState({ path: STORAGE_STATE_PATH });
      if (tempFile) cleanupTempFile(tempFile);
      await browser.close();

      return {
        success: true,
        message: 'Preview ready. Call again with confirm=true to publish.',
        screenshotPath,
        needsConfirmation: true,
      };
    }
  } catch (error) {
    let errorScreenshotPath;
    try {
      if (browser) {
        const pages = browser.contexts()?.[0]?.pages();
        if (pages?.[0]) {
          errorScreenshotPath = path.join(SCREENSHOTS_DIR, `error_${Date.now()}.png`);
          await pages[0].screenshot({ path: errorScreenshotPath });
        }
      }
    } catch { /* ignore screenshot errors */ }

    if (tempFile) cleanupTempFile(tempFile);
    if (browser) await browser.close().catch(() => {});

    return {
      success: false,
      error: error.message,
      screenshotPath: errorScreenshotPath,
    };
  }
}

module.exports = {
  publishToInstagram,
  initSession,
  checkSession,
  downloadImage,
  STORAGE_STATE_PATH,
  SCREENSHOTS_DIR,
};
