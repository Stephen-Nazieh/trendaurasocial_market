// js/wishlist.js

// Utility functions for localStorage
function getWishlist() {
  try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); }
  catch (e) { return []; }
}
function saveWishlist(wishlist) {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}
function addToWishlist(product) {
  const wishlist = getWishlist();
  if (!wishlist.find(item => item.id === product.id)) {
    wishlist.push(product);
    saveWishlist(wishlist);
  }
}
function removeFromWishlist(id) {
  let wishlist = getWishlist();
  wishlist = wishlist.filter(item => item.id !== id);
  saveWishlist(wishlist);
  renderWishlist();
}

// Function to move an item from wishlist to cart
function moveToCart(id) {
  let wishlist = getWishlist();
  const itemToMove = wishlist.find(item => item.id === id);
  if (!itemToMove) return;

  // Add to cart logic
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existingInCart = cart.find(i => i.id === itemToMove.id);
  if (existingInCart) {
    existingInCart.quantity = (existingInCart.quantity || 1) + 1;
  } else {
    cart.push({ ...itemToMove, quantity: 1 });
  }
  localStorage.setItem('cart', JSON.stringify(cart));

  // Remove from wishlist
  removeFromWishlist(id);

  try {
    toast && toast.show(`${itemToMove.title} moved to cart`, { duration: 2500, type: 'success' });
  } catch (e) {
    console.warn('toast failed', e);
  }
}

// Render wishlist page
function renderWishlist() {
  const wishlist = getWishlist();
  const wishlistArea = document.getElementById('wishlist-area');
  const wishlistEmpty = document.getElementById('wishlist-empty');

  if (!wishlist.length) {
    wishlistArea.innerHTML = '';
    wishlistEmpty.style.display = 'block';
    return;
  }
  wishlistEmpty.style.display = 'none';

  let html = '<table class="cart-table"><thead><tr><th>Item</th><th>Product</th><th>Price</th><th></th></tr></thead><tbody>';
  wishlist.forEach(item => {
    html += `<tr>
      <td><img src="${item.images?.[0] || '/assets/images/placeholder.png'}" alt="${item.title}" width="80"></td>
      <td>${item.title}</td>
      <td>${item.currency} ${item.price.toFixed(2)}</td>
      <td>
        <div class="wishlist-actions">
          <button class="btn move-to-cart-btn" onclick="moveToCart('${item.id}')">Add to Cart</button>
          <button class="remove-btn" onclick="removeFromWishlist('${item.id}')" aria-label="Remove ${item.title} from wishlist">✕</button>
        </div>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';

  wishlistArea.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('wishlist-area')) {
    renderWishlist();
  }
});