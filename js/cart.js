// js/cart.js
function getCart() {
  return JSON.parse(localStorage.getItem('cart') || '[]');
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}
function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id);
  if (existing) existing.quantity += item.quantity;
  else cart.push(item);
  saveCart(cart);
}

function renderCart() {
  const cart = getCart();
  const el = document.getElementById('cart-contents');
  if (!el) return;
  if (cart.length === 0) { el.innerHTML = '<p>Your cart is empty</p>'; return; }
  const rows = cart.map(ci => `
    <div class="cart-item">
      <img src="${ci.images[0]}" width="80">
      <div>${ci.title} x ${ci.quantity}</div>
      <div>${ci.currency} ${(ci.price * ci.quantity).toFixed(2)}</div>
    </div>
  `).join('');
  const total = cart.reduce((s,i)=> s + i.price*i.quantity, 0);
  el.innerHTML = rows + `<hr/><p>Total: USD ${total.toFixed(2)}</p>`;
}

renderCart();


