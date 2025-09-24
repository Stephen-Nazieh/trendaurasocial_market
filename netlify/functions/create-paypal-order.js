// netlify/functions/create-paypal-order.js
// Creates a PayPal order (server-side). Expects POST body: { items: [...], or purchase_units optional }
// Requires env vars: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV (sandbox|production), SITE_URL (optional)

const fetch = require('node-fetch');
const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PAYPAL_API = PAYPAL_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
const SITE_URL = process.env.SITE_URL || '';

if (!PAYPAL_CLIENT || !PAYPAL_SECRET) {
  console.warn('PayPal credentials not set in environment variables.');
}

// Helper: get access token
async function getAccessToken() {
  const tokenRes = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) throw new Error('Failed to get PayPal access token: ' + JSON.stringify(tokenJson));
  return tokenJson.access_token;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const items = Array.isArray(body.items) ? body.items : [];
    const clientReturn = body.return_url || `${SITE_URL}/success.html`;
    const clientCancel = body.cancel_url || `${SITE_URL}/cancel.html`;

    // Calculate total from items (if provided). Items expected to have price (number) and quantity (number).
    let total = 0;
    const payPalItems = [];

    if (items.length) {
      items.forEach(it => {
        const qty = Number(it.quantity || 1);
        const price = Number(it.price || 0);
        total += price * qty;

        // create PayPal item (name limited length)
        payPalItems.push({
          name: String(it.title || it.name || 'Item').slice(0, 127),
          unit_amount: { currency_code: it.currency || 'USD', value: price.toFixed(2) },
          quantity: String(qty)
        });
      });
    }

    // Fallback: if no items provided, accept purchase_units passed in body (be cautious)
    let purchase_units = body.purchase_units;
    if (!purchase_units) {
      purchase_units = [{
        amount: {
          currency_code: 'USD',
          value: (total || 0).toFixed(2),
          breakdown: {
            item_total: { currency_code: 'USD', value: (total || 0).toFixed(2) }
          }
        },
        items: payPalItems
      }];
    }

    const token = await getAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units,
      application_context: {
        brand_name: 'TrendAura Social',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: clientReturn,
        cancel_url: clientCancel
      }
    };

    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderPayload)
    });

    const orderJson = await orderRes.json();
    if (!orderRes.ok) {
      console.error('PayPal create order error', orderJson);
      return { statusCode: orderRes.status, body: JSON.stringify(orderJson) };
    }

    return { statusCode: 200, body: JSON.stringify(orderJson) };

  } catch (err) {
    console.error('create-paypal-order error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
