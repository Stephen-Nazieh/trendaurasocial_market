// js/cart.js

// Function to get the current cart from local storage
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch (e) {
    return [];
  }
}

// Function to save the cart to local storage
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Function to add an item to the cart
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

// Function to render the cart contents (this is a simplified version)
// Note: Your cart.html file already has a more robust renderCart function,
// so this file's renderCart function isn't used directly for the cart page itself.
function renderCart() {
  const cart = getCart();
  const el = document.getElementById('cart-contents');
  if (!el) return;
  if (cart.length === 0) {
    el.innerHTML = '<p>Your cart is empty</p>';
    return;
  }
  const rows = cart.map(ci => `
    <div class="cart-item">
      <img src="${ci.images[0]}" width="80">
      <div>${ci.title} x ${ci.quantity}</div>
      <div>${ci.currency} ${(ci.price * ci.quantity).toFixed(2)}</div>
    </div>
  `).join('');
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  el.innerHTML = rows + `<hr/><p>Total: USD ${total.toFixed(2)}</p>`;
}

// This function is included for completeness, but your cart.html
// already handles its own rendering and listeners.
// renderCart();