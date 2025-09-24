// netlify/functions/get-paypal-order.js
// Purpose: Given a PayPal order id (order_id), fetch full order details server-side
// and return them to the client for secure verification on success.html.

const fetch = require('node-fetch'); // include as dependency in package.json or use Node 18+ global fetch
const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

async function getAccessToken() {
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
}

exports.handler = async (event) => {
  try {
    // expect GET: /.netlify/functions/get-paypal-order?order_id=...
    const params = event.queryStringParameters || {};
    const order_id = params.order_id || params.orderId || params.paypal_order_id;
    if (!order_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing order_id query parameter' }) };
    }

    const token = await getAccessToken();

    const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${encodeURIComponent(order_id)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();

    // forward PayPal response (either success or error details)
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify(data) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };

  } catch (err) {
    console.error('get-paypal-order error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
