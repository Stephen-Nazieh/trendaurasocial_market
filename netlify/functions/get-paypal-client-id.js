// netlify/functions/get-paypal-client-id.js
// Returns the public PayPal client id for the client to load SDK
exports.handler = async () => {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID || '';
    return {
      statusCode: 200,
      body: JSON.stringify({ clientId })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || String(err) })
    };
  }
};
