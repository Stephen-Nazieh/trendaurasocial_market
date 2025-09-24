// js/catalog.js
(async () => {
  const products = await fetchProducts();
  const grid = document.getElementById('product-grid') || document.getElementById('featured');
  if (!grid) return;

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <a href="product.html?slug=${p.slug}">
        <img src="${p.images[0]}" alt="${p.title}" />
        <h3>${p.title}</h3>
        <p>${p.currency} ${p.price.toFixed(2)}</p>
      </a>
    `;
    grid.appendChild(card);
  });
})();
