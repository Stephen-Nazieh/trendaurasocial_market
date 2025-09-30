// netlify/functions/hello.js
exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      message: "Netlify functions are working",
      ts: new Date().toISOString()
    })
  };
};
