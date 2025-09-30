// netlify/functions/capture-paypal-order.js
// Captures a PayPal order after buyer approval. Expects POST body: { orderID: '...', cart: [...] }
const fetch = require('node-fetch');
const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PAYPAL_API = PAYPAL_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

// --- PLACEHOLDER: Define a function to handle email/invoicing ---
// In a real environment, you would use an external service like SendGrid, Mailgun, or another
// dedicated Netlify function for mailing here. This function is a placeholder.
async function sendOrderConfirmationEmail(orderData, cartItems) {
    const payerEmail = orderData.payer?.email_address;
    const orderID = orderData.id;

    if (!payerEmail) {
        console.error(`[INVOICE] Could not find email address for Order ID: ${orderID}`);
        return;
    }

    console.log(`[INVOICE] Payment successful. Preparing invoice/confirmation for ${payerEmail}`);
    console.log(`[INVOICE] Order ID: ${orderID}`);
    console.log(`[INVOICE] Cart Items: ${cartItems.length}`);
    
    // --- Invoice Content Generation (Simplified) ---
    const totalAmount = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 'N/A';
    
    let itemsTable = cartItems.map(item => 
        `<tr><td>${item.title}</td><td>${item.quantity}</td><td>${item.price}</td></tr>`
    ).join('');

    const emailBody = `
        <p>Thank you for your order! Your payment was successfully processed.</p>
        <p><strong>Order ID:</strong> ${orderID}</p>
        <p><strong>Total Paid:</strong> $${totalAmount} USD</p>
        <h3>Invoice Details (Proof of Purchase)</h3>
        <table border="1" style="border-collapse: collapse; width: 100%;">
            <thead><tr><th>Product</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>${itemsTable}</tbody>
        </table>
        <p>A full PDF invoice will be sent to your email shortly.</p>
    `;
    
    // In a production app, you would use Nodemailer or an API call here:
    // try {
    //   await fetch('https://your-site.com/.netlify/functions/send-email', { ... payload: { to: payerEmail, subject: 'Your Invoice', body: emailBody } });
    // } catch (e) { console.error('Email failed:', e); }

    return true;
}

// Helper: get access token (unchanged)
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
    // Extract cart data sent from the client
    const clientCart = body.cart; 
    
    if (!orderID) return { statusCode: 400, body: JSON.stringify({ error: 'Missing orderID in request body' }) };

    const token = await getAccessToken();

    // 1. CAPTURE THE PAYMENT
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

    // 2. INVOICING / CONFIRMATION TRIGGER
    // Only proceed if the payment status is COMPLETED
    if (captureJson.status === 'COMPLETED') {
        // Pass the full PayPal response and the client cart data to the invoicing handler
        await sendOrderConfirmationEmail(captureJson, clientCart);
    } else {
        console.warn(`[INVOICE] Payment captured but status is not COMPLETED for Order ID: ${orderID}`);
    }

    // captureJson contains capture details (payments.captures)
    return { statusCode: 200, body: JSON.stringify(captureJson) };

  } catch (err) {
    console.error('capture-paypal-order error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};