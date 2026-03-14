/**
 * Product Catalog Service
 *
 * Loads products from one of three sources:
 *   1. 'csv'     — Local Shopify CSV export (default, no auth needed)
 *   2. 'website' — Scrapes midnightmusemade.com public storefront JSON
 *   3. 'shopify' — Shopify Admin API via access token
 */
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const CSV_PATH = path.join(__dirname, '..', '..', 'products_export_fresh_import.csv');
const STORE_DOMAIN = 'midnightmusemade.com';

// ─── CSV Source ──────────────────────────────────────────

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
      if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') i++;
      if (current.trim()) rows.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
}

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadProductsFromCSV() {
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = parseCSV(raw);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const idx = (name) => headers.indexOf(name);
  const handleIdx = idx('Handle');
  const titleIdx = idx('Title');
  const bodyIdx = idx('Body (HTML)');
  const vendorIdx = idx('Vendor');
  const typeIdx = idx('Type');
  const tagsIdx = idx('Tags');
  const priceIdx = idx('Variant Price');
  const imageSrcIdx = idx('Image Src');
  const imageAltIdx = idx('Image Alt Text');
  const statusIdx = idx('Status');
  const option1Idx = idx('Option1 Value');

  const products = new Map();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const handle = fields[handleIdx];
    if (!handle) continue;

    if (!products.has(handle)) {
      const title = fields[titleIdx];
      if (!title) {
        const existing = products.get(handle);
        if (existing) addImageAndVariant(existing, fields, imageSrcIdx, imageAltIdx, option1Idx, priceIdx);
        continue;
      }

      const tags = (fields[tagsIdx] || '').split(',').map((t) => t.trim()).filter(Boolean);

      products.set(handle, {
        handle,
        title,
        description: stripHtml(fields[bodyIdx]),
        vendor: fields[vendorIdx] || '',
        type: fields[typeIdx] || '',
        tags,
        price: fields[priceIdx] || '',
        status: fields[statusIdx] || 'active',
        images: [],
        variants: [],
        url: `https://${STORE_DOMAIN}/products/${handle}`,
      });

      addImageAndVariant(products.get(handle), fields, imageSrcIdx, imageAltIdx, option1Idx, priceIdx);
    } else {
      addImageAndVariant(products.get(handle), fields, imageSrcIdx, imageAltIdx, option1Idx, priceIdx);
    }
  }

  return Array.from(products.values()).filter((p) => p.status === 'active');
}

function addImageAndVariant(product, fields, imageSrcIdx, imageAltIdx, option1Idx, priceIdx) {
  const imageSrc = fields[imageSrcIdx];
  if (imageSrc && !product.images.some((img) => img.src === imageSrc)) {
    product.images.push({ src: imageSrc, alt: fields[imageAltIdx] || '' });
  }
  const variant = fields[option1Idx];
  const price = fields[priceIdx];
  if (variant && !product.variants.some((v) => v.name === variant)) {
    product.variants.push({ name: variant, price: price || product.price });
  }
}

// ─── Website Source (public storefront scraping) ─────────

async function loadProductsFromWebsite() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN || `${STORE_DOMAIN}`;
  const baseUrl = domain.includes('://') ? domain : `https://${domain}`;

  // Shopify exposes /products.json on all storefronts
  const products = [];
  let page = 1;
  const limit = 250;

  while (true) {
    const url = `${baseUrl}/products.json?limit=${limit}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MidnightMuseMade-InstagramGenerator/1.0',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      // Some stores block /products.json — fall back to scraping collection pages
      if (page === 1) {
        return await scrapeCollectionPage(baseUrl);
      }
      break;
    }

    const data = await res.json();
    if (!data.products || data.products.length === 0) break;

    for (const p of data.products) {
      products.push(normalizeShopifyProduct(p, baseUrl));
    }

    if (data.products.length < limit) break;
    page++;
  }

  return products;
}

async function scrapeCollectionPage(baseUrl) {
  // Try /collections/all with .json suffix
  const url = `${baseUrl}/collections/all/products.json?limit=250`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'MidnightMuseMade-InstagramGenerator/1.0',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(
      `Could not fetch products from website (${res.status}). ` +
      `The store may block public JSON access. Try 'csv' or 'shopify' source instead.`
    );
  }

  const data = await res.json();
  return (data.products || []).map((p) => normalizeShopifyProduct(p, baseUrl));
}

function normalizeShopifyProduct(p, baseUrl) {
  return {
    handle: p.handle,
    title: p.title,
    description: stripHtml(p.body_html),
    vendor: p.vendor || '',
    type: p.product_type || '',
    tags: (typeof p.tags === 'string' ? p.tags.split(',') : p.tags || [])
      .map((t) => t.trim())
      .filter(Boolean),
    price: p.variants?.[0]?.price || '',
    status: 'active',
    images: (p.images || []).map((img) => ({
      src: img.src,
      alt: img.alt || '',
    })),
    variants: (p.variants || []).map((v) => ({
      name: v.title || 'Default',
      price: v.price || '',
    })),
    url: `${baseUrl}/products/${p.handle}`,
  };
}

// ─── Shopify Admin API Source ────────────────────────────

async function loadProductsFromShopify() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN || process.env.MYSHOPIFY_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!domain || !token) {
    throw new Error(
      'Shopify Admin API requires SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN env vars. ' +
      'Set these in your .env file or environment.'
    );
  }

  const myshopifyDomain = domain.includes('.myshopify.com')
    ? domain
    : `${domain.replace(/\.myshopify\.com$/, '')}.myshopify.com`;

  const apiUrl = `https://${myshopifyDomain}/admin/api/2024-10/products.json?limit=250&status=active`;

  const res = await fetch(apiUrl, {
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify Admin API error (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const products = (data.products || []).map((p) => ({
    handle: p.handle,
    title: p.title,
    description: stripHtml(p.body_html),
    vendor: p.vendor || '',
    type: p.product_type || '',
    tags: (typeof p.tags === 'string' ? p.tags.split(',') : p.tags || [])
      .map((t) => t.trim())
      .filter(Boolean),
    price: p.variants?.[0]?.price || '',
    status: p.status || 'active',
    images: (p.images || []).map((img) => ({
      src: img.src,
      alt: img.alt || '',
    })),
    variants: (p.variants || []).map((v) => ({
      name: v.title || 'Default',
      price: v.price || '',
    })),
    url: `https://${STORE_DOMAIN}/products/${p.handle}`,
  }));

  return products.filter((p) => p.status === 'active');
}

// ─── Unified Interface ──────────────────────────────────

/**
 * Load products from the specified source.
 * @param {'csv'|'website'|'shopify'} source
 */
async function loadProducts(source = 'csv') {
  switch (source) {
    case 'website':
      return await loadProductsFromWebsite();
    case 'shopify':
      return await loadProductsFromShopify();
    case 'csv':
    default:
      return loadProductsFromCSV();
  }
}

/**
 * Pick products for an Instagram post.
 */
async function pickProducts(count = 3, strategy = 'random', source = 'csv') {
  const all = await loadProducts(source);
  if (all.length === 0) return [];

  switch (strategy) {
    case 'seasonal': {
      const month = new Date().getMonth();
      const seasonalTags = getSeasonalTags(month);
      const seasonal = all.filter((p) =>
        p.tags.some((t) => seasonalTags.some((st) => t.toLowerCase().includes(st)))
      );
      if (seasonal.length >= count) return shuffle(seasonal).slice(0, count);
      return shuffle(all).slice(0, count);
    }

    case 'featured': {
      const sorted = [...all].sort((a, b) => b.images.length - a.images.length);
      return sorted.slice(0, count);
    }

    case 'random':
    default:
      return shuffle(all).slice(0, count);
  }
}

function getSeasonalTags(month) {
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
