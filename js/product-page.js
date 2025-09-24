// js/product-page.js
(async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const product = await getProductBySlug(slug);
  const container = document.getElementById('product-detail');

  if (!product) {
    container.innerHTML = '<p>Product not found</p>';
    return;
  }

  // gallery thumbnails
  const gallery = `
    <div class="gallery">
      <div class="main-image"><img id="main-img" src="${product.images[0]}" alt=""></div>
      <div class="thumbs">
        ${product.images.map((img, i) => `<img class="thumb" src="${img}" data-index="${i}">`).join('')}
      </div>
    </div>
  `;

  const details = `
    <h2>${product.title}</h2>
    <p>${product.description}</p>
    <p><strong>Price:</strong> ${product.currency} ${product.price.toFixed(2)}</p>
    <button id="add-to-cart">Add to Cart</button>
  `;

  container.innerHTML = gallery + details;

  // thumbnail behavior
  document.querySelectorAll('.thumb').forEach(t => {
    t.addEventListener('click', e => {
      document.getElementById('main-img').src = e.target.src;
    });
  });

  document.getElementById('add-to-cart').addEventListener('click', () => {
    addToCart({ id: product.id, title: product.title, price: product.price, currency: product.currency, images: product.images, quantity: 1 });
    alert('Added to cart');
  });

})();
