// netlify/functions/get-paypal-client-id.js
exports.handler = async () => {
  return { statusCode: 200, body: JSON.stringify({ clientId: process.env.PAYPAL_CLIENT_ID || '' }) };
};
