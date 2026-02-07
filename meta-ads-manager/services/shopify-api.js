/**
 * Shopify API Service
 *
 * Fetches product, collection, and store data from Shopify to inform
 * AI-powered ad suggestions. Uses the Admin API for products, orders,
 * and store metadata.
 *
 * Required env vars:
 *   SHOPIFY_CLIENT_ID    — Shopify app client ID
 *   SHOPIFY_API_KEY      — Admin API access token (shpat_xxx)
 *   SHOPIFY_STORE_DOMAIN — your-store.myshopify.com
 */
const fetch = require('node-fetch');

function storeDomain() {
  return (process.env.SHOPIFY_STORE_DOMAIN || '').replace(/\/$/, '');
}

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': process.env.SHOPIFY_API_KEY,
  };
}

function adminUrl(endpoint) {
  return `https://${storeDomain()}/admin/api/2024-10/${endpoint}`;
}

// ---------- Products ----------

async function getProducts(limit = 50) {
  const res = await fetch(adminUrl(`products.json?limit=${limit}&status=active`), {
    headers: adminHeaders(),
  });
  const data = await res.json();
  return data.products || [];
}

async function getProduct(productId) {
  const res = await fetch(adminUrl(`products/${productId}.json`), {
    headers: adminHeaders(),
  });
  const data = await res.json();
  return data.product;
}

// ---------- Collections ----------

async function getCollections(limit = 50) {
  // Get both smart and custom collections
  const [smartRes, customRes] = await Promise.all([
    fetch(adminUrl(`smart_collections.json?limit=${limit}`), { headers: adminHeaders() }),
    fetch(adminUrl(`custom_collections.json?limit=${limit}`), { headers: adminHeaders() }),
  ]);
  const smart = await smartRes.json();
  const custom = await customRes.json();
  return [
    ...(smart.smart_collections || []),
    ...(custom.custom_collections || []),
  ];
}

// ---------- Orders (for performance context) ----------

async function getRecentOrders(limit = 50) {
  const res = await fetch(adminUrl(`orders.json?limit=${limit}&status=any&order=created_at+desc`), {
    headers: adminHeaders(),
  });
  const data = await res.json();
  return data.orders || [];
}

async function getOrderCount(status = 'any') {
  const res = await fetch(adminUrl(`orders/count.json?status=${status}`), {
    headers: adminHeaders(),
  });
  const data = await res.json();
  return data.count;
}

// ---------- Store info ----------

async function getShopInfo() {
  const res = await fetch(adminUrl('shop.json'), {
    headers: adminHeaders(),
  });
  const data = await res.json();
  return data.shop;
}

// ---------- Summarize for AI context ----------

async function getStoreSummary() {
  try {
    const [shop, products, collections, orders] = await Promise.all([
      getShopInfo(),
      getProducts(30),
      getCollections(20),
      getRecentOrders(20),
    ]);

    const topProducts = products.slice(0, 15).map((p) => ({
      id: p.id,
      title: p.title,
      description: (p.body_html || '').replace(/<[^>]*>/g, '').slice(0, 200),
      price: p.variants?.[0]?.price,
      image: p.image?.src,
      tags: p.tags,
      vendor: p.vendor,
      product_type: p.product_type,
    }));

    const collectionSummary = collections.slice(0, 10).map((c) => ({
      id: c.id,
      title: c.title,
      description: (c.body_html || '').replace(/<[^>]*>/g, '').slice(0, 150),
    }));

    const recentRevenue = orders
      .filter((o) => o.financial_status === 'paid')
      .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

    return {
      store: {
        name: shop.name,
        domain: shop.domain,
        currency: shop.currency,
        country: shop.country_name,
      },
      products: topProducts,
      product_count: products.length,
      collections: collectionSummary,
      recent_orders: {
        count: orders.length,
        revenue: recentRevenue.toFixed(2),
        currency: shop.currency,
      },
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ---------- Connection test ----------

async function testConnection() {
  try {
    const shop = await getShopInfo();
    return { connected: true, shop_name: shop.name, domain: shop.domain };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

module.exports = {
  getProducts,
  getProduct,
  getCollections,
  getRecentOrders,
  getOrderCount,
  getShopInfo,
  getStoreSummary,
  testConnection,
};
