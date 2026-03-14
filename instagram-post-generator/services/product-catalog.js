/**
 * Product Catalog Service
 *
 * Loads products from the Shopify CSV export and organizes them
 * with their images, descriptions, tags, and variants.
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', '..', 'products_export_fresh_import.csv');

/**
 * Parse CSV line handling quoted fields with commas and newlines.
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Parse the full CSV, handling multi-line quoted fields.
 */
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++; // skip \r\n
      }
      if (current.trim()) {
        rows.push(current);
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    rows.push(current);
  }
  return rows;
}

/**
 * Load all products from the CSV export.
 * Returns an array of product objects with images grouped together.
 */
function loadProducts() {
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = parseCSV(raw);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const handleIdx = headers.indexOf('Handle');
  const titleIdx = headers.indexOf('Title');
  const bodyIdx = headers.indexOf('Body (HTML)');
  const vendorIdx = headers.indexOf('Vendor');
  const typeIdx = headers.indexOf('Type');
  const tagsIdx = headers.indexOf('Tags');
  const priceIdx = headers.indexOf('Variant Price');
  const imageSrcIdx = headers.indexOf('Image Src');
  const imageAltIdx = headers.indexOf('Image Alt Text');
  const statusIdx = headers.indexOf('Status');
  const option1Idx = headers.indexOf('Option1 Value');

  const products = new Map();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const handle = fields[handleIdx];
    if (!handle) continue;

    if (!products.has(handle)) {
      const title = fields[titleIdx];
      if (!title) {
        // This is a continuation row (variant/image) for an existing product
        const existing = findProductByHandle(products, handle);
        if (existing) {
          addImageAndVariant(existing, fields, imageSrcIdx, imageAltIdx, option1Idx, priceIdx);
        }
        continue;
      }

      const bodyHtml = fields[bodyIdx] || '';
      const description = bodyHtml
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

      const tags = (fields[tagsIdx] || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      products.set(handle, {
        handle,
        title,
        description,
        vendor: fields[vendorIdx] || '',
        type: fields[typeIdx] || '',
        tags,
        price: fields[priceIdx] || '',
        status: fields[statusIdx] || 'active',
        images: [],
        variants: [],
        url: `https://midnightmusemade.com/products/${handle}`,
      });

      addImageAndVariant(products.get(handle), fields, imageSrcIdx, imageAltIdx, option1Idx, priceIdx);
    } else {
      addImageAndVariant(products.get(handle), fields, imageSrcIdx, imageAltIdx, option1Idx, priceIdx);
    }
  }

  return Array.from(products.values()).filter((p) => p.status === 'active');
}

function findProductByHandle(products, handle) {
  // Look through all products to find one with this handle
  for (const [key, product] of products) {
    if (key === handle) return product;
  }
  return null;
}

function addImageAndVariant(product, fields, imageSrcIdx, imageAltIdx, option1Idx, priceIdx) {
  const imageSrc = fields[imageSrcIdx];
  if (imageSrc && !product.images.some((img) => img.src === imageSrc)) {
    product.images.push({
      src: imageSrc,
      alt: fields[imageAltIdx] || '',
    });
  }

  const variant = fields[option1Idx];
  const price = fields[priceIdx];
  if (variant && !product.variants.some((v) => v.name === variant)) {
    product.variants.push({ name: variant, price: price || product.price });
  }
}

/**
 * Pick products for an Instagram post.
 * Strategy options: 'random', 'seasonal', 'newest', 'featured'
 */
function pickProducts(count = 3, strategy = 'random') {
  const all = loadProducts();
  if (all.length === 0) return [];

  switch (strategy) {
    case 'seasonal': {
      const month = new Date().getMonth();
      const seasonalTags = getSeasonalTags(month);
      const seasonal = all.filter((p) =>
        p.tags.some((t) => seasonalTags.some((st) => t.toLowerCase().includes(st)))
      );
      if (seasonal.length >= count) return shuffle(seasonal).slice(0, count);
      // Fall back to random if not enough seasonal products
      return shuffle(all).slice(0, count);
    }

    case 'featured': {
      // Pick products with the most images (likely best photographed)
      const sorted = [...all].sort((a, b) => b.images.length - a.images.length);
      return sorted.slice(0, count);
    }

    case 'random':
    default:
      return shuffle(all).slice(0, count);
  }
}

function getSeasonalTags(month) {
  // month is 0-indexed
  if (month >= 2 && month <= 4) return ['spring', 'easter', 'graduation', 'class_of', 'grad'];
  if (month >= 5 && month <= 7) return ['summer', 'beach', 'fourth', 'patriotic', 'wedding'];
  if (month >= 8 && month <= 10) return ['halloween', 'fall', 'autumn', 'spooky', 'pumpkin', 'witch', 'goth'];
  return ['christmas', 'holiday', 'winter', 'ornament', 'gift', 'stocking'];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  loadProducts,
  pickProducts,
  getSeasonalTags,
};
