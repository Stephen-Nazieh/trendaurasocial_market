// js/products.js
async function fetchProducts() {
  const res = await fetch('/products.json');
  return await res.json();
}

async function getProductBySlug(slug) {
  const products = await fetchProducts();
  return products.find(p => p.slug === slug);
}

// export functions for modules pattern if you use bundlers — for simple pages, global functions are fine.
window.fetchProducts = fetchProducts;
window.getProductBySlug = getProductBySlug;
