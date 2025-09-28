// js/paypal-client.js
// Handles PayPal Buttons, order creation, capture, and redirect flow.

// The script that loads this file already ensures PayPal SDK is loaded.
// So, we can directly call paypal.Buttons().

paypal.Buttons({
  style: {
    layout: "vertical",
    color: "gold",
    shape: "rect",
    label: "paypal"
  },

  // 1. Create an order (server-side)
  createOrder: async function (data, actions) {
    try {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      if (cart.length === 0) {
        // This check is good, but the button should be hidden if cart is empty.
        // The renderCart() function in cart.html already handles this.
        throw new Error("No items in cart");
      }

      // Build purchase units from cart
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shipping = subtotal > 100 ? 0 : 10;
      const total = subtotal + shipping;

      const purchase_units = [
        {
          amount: {
            currency_code: "USD",
            value: total.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: subtotal.toFixed(2)
              },
              shipping: {
                currency_code: "USD",
                value: shipping.toFixed(2)
              }
            }
          }
        }
      ];

      const res = await fetch("/.netlify/functions/create-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchase_units })
      });

      const order = await res.json();
      if (!res.ok) {
        console.error("Error creating order", order);
        throw new Error("Order creation failed");
      }

      return order.id; // PayPal expects order id here
    } catch (err) {
      console.error("createOrder error:", err);
      alert("We couldn’t create your PayPal order. Try again later.");
      throw err;
    }
  },

  // 2. On approval (when buyer approves in PayPal popup)
  onApprove: async function (data, actions) {
    try {
      // Capture the order server-side
      const res = await fetch("/.netlify/functions/capture-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID: data.orderID })
      });

      const captureJson = await res.json();
      if (!res.ok) {
        console.error("PayPal capture failed", captureJson);
        window.location = "/cancel.html";
        return;
      }

      // Clear the cart (client-side)
      try {
        localStorage.removeItem("cart");
      } catch (e) {
        console.warn("Could not clear cart:", e);
      }

      // Redirect to success page with PayPal order ID
      const orderIdForUrl = encodeURIComponent(data.orderID);
      window.location = `/success.html?paypal_order_id=${orderIdForUrl}`;
    } catch (err) {
      console.error("Error in onApprove:", err);
      window.location = "/cancel.html";
    }
  },

  // 3. Handle cancellations
  onCancel: function (data) {
    console.log("Payment cancelled", data);
    window.location = "/cancel.html";
  },

  // 4. Handle errors
  onError: function (err) {
    console.error("PayPal error", err);
    alert("An error occurred with PayPal. Please try again.");
    window.location = "/cancel.html";
  }
}).render("#paypal-button-container");