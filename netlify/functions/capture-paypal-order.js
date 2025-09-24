// netlify/functions/capture-paypal-order.js
// Captures a PayPal order after buyer approval. Expects POST body: { orderID: '...'}
const fetch = require('node-fetch');
const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PAYPAL_API = PAYPAL_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

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
    const orderID = body.orderID || body.orderId || body.order_id;
    if (!orderID) return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderID in request body' }) };

    const token = await getAccessToken();

    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const captureJson = await captureRes.json();

    if (!captureRes.ok) {
      console.error('PayPal capture error', captureJson);
      return { statusCode: captureRes.status, body: JSON.stringify(captureJson) };
    }

    // captureJson contains capture details (payments.captures)
    return { statusCode: 200, body: JSON.stringify(captureJson) };

  } catch (err) {
    console.error('capture-paypal-order error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
