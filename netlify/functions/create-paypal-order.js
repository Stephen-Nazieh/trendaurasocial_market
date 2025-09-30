// netlify/functions/create-paypal-order.js
// Creates a PayPal order (server-side). Expects POST body: { purchase_units: [...] }

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
    const purchase_units = body.purchase_units;
    
    if (!purchase_units || !Array.isArray(purchase_units) || purchase_units.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid purchase_units in request body.' }) };
    }
    
    // Validate that the total value is greater than zero
    const totalAmount = parseFloat(purchase_units[0]?.amount?.value);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'PayPal order total must be greater than zero.' }) };
    }

    const clientReturn = `${SITE_URL}/success.html`;
    const clientCancel = `${SITE_URL}/cancel.html`;

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

  
    // after creating orderRes and getting orderJson:
    const orderJson = await orderRes.json();
    console.log('DEBUG: PayPal create order status:', orderRes.status, 'response:', JSON.stringify(orderJson)); // added debug

  } catch (err) {
    console.error('create-paypal-order error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};


// after fetching token in getAccessToken() (or right after you get token in exports.handler)
const token = await getAccessToken();
console.log('DEBUG: Got PayPal token? ', !!token); // added debug