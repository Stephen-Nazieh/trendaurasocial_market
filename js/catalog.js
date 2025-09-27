// /js/catalog.js
// Reusable product loader + renderer with category filter (menu) and sort-by support.
// Expects:
// - A container with id="product-grid" (where cards will be rendered).
// - A select (or any input) with id="menu-selector" for category (optional).
// - A select with id="sort-by" for sorting (optional).
// - products.json at site root: /products.json
//
// Usage: include <script src="/js/catalog.js"></script> after products/cart/toast scripts.
// It will auto-run on DOMContentLoaded.

(function () {
  'use strict';

  // Config: change if you use other element IDs
  const SELECTORS = {
    grid: '#product-grid',
    noProducts: '#no-products',
    menu: '#menu-selector', // Browse by / Menu selector
    sort: '#sort-by'        // Sort by selector
  };

  // Internal state
  let PRODUCTS = null; // loaded product array
  let FILTERED = null; // last filtered list

  // Helper: safely escape HTML
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Read query param
  function readQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // Update URL (pushState) without reloading
  function updateUrlParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(k => {
      if (params[k] === null || params[k] === undefined || params[k] === 'all') url.searchParams.delete(k);
      else url.searchParams.set(k, params[k]);
    });
    window.history.replaceState({}, '', url.toString());
  }

  // Normalize category value for comparisons (lowercase)
  function normalizeCategory(cat) {
    return (cat || '').toString().trim().toLowerCase();
  }

  // Check if a product matches category (supports product.category as string or array)
  function productMatchesCategory(product, category) {
    if (!category || category === 'all') return true;
    const c = normalizeCategory(category);
    if (!product) return false;
    const prodCat = product.category;
    if (!prodCat) return false;
    if (Array.isArray(prodCat)) {
      return prodCat.map(normalizeCategory).includes(c);
    }
    return normalizeCategory(prodCat) === c;
  }

  // Sort helpers
  const SORTERS = {
    'featured': (a, b) => 0, // keep original order (stable)
    'price-asc': (a, b) => Number(a.price || 0) - Number(b.price || 0),
    'price-desc': (a, b) => Number(b.price || 0) - Number(a.price || 0),
    'name-asc': (a, b) => String(a.title || '').localeCompare(String(b.title || '')),
    'name-desc': (a, b) => String(b.title || '').localeCompare(String(a.title || ''))
  };

  // Build product card HTML (same structure as shop)
  function buildProductCardHTML(p) {
    const img = (Array.isArray(p.images) && p.images[0]) ? p.images[0] : '/assets/images/placeholder.png';
    const title = escapeHtml(p.title || 'Untitled');
    const desc = escapeHtml(p.description || '');
    const price = (typeof p.price !== 'undefined') ? ( (p.currency ? escapeHtml(p.currency) + ' ' : '') + Number(p.price).toFixed(2) ) : '';
    const id = escapeHtml(p.id || '');
    const slug = encodeURIComponent(p.slug || id);

    return `
      <article class="product-card" data-id="${id}">
        <div class="product-media">
          <a href="product.html?slug=${slug}" title="${title}">
            <img src="${escapeHtml(img)}" alt="${title}">
          </a>
        </div>
        <div class="product-info">
          <a href="product.html?slug=${slug}" class="product-title">${title}</a>
          <p class="product-desc">${desc}</p>
          <div class="price-row">
            <span class="price">${price}</span>
            <button class="btn add-cart" data-id="${id}">Add to Cart</button>
          </div>
        </div>
      </article>
    `;
  }

  // Render a list of products into the grid
  function renderProducts(list) {
    const gridEl = document.querySelector(SELECTORS.grid);
    const noEl = document.querySelector(SELECTORS.noProducts);

    if (!gridEl) {
      console.warn('catalog.js: product grid container not found:', SELECTORS.grid);
      return;
    }

    if (!list || list.length === 0) {
      gridEl.innerHTML = '';
      if (noEl) noEl.style.display = 'block';
      return;
    }
    if (noEl) noEl.style.display = 'none';

    // create HTML in one pass for performance
    const html = list.map(buildProductCardHTML).join('');
    gridEl.innerHTML = html;

    // Wire up Add to Cart buttons
    gridEl.querySelectorAll('.add-cart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        const product = PRODUCTS.find(p => String(p.id) === String(id));
        if (!product) {
          try { toast && toast.show('Product not found', { type: 'error' }); } catch(e){/*ignore*/ }
          return;
        }
        const item = {
          id: product.id,
          slug: product.slug,
          title: product.title,
          price: product.price,
          currency: product.currency || 'USD',
          images: product.images || [],
          quantity: 1
        };
        try {
          if (typeof addToCart === 'function') {
            addToCart(item);
          } else {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const existing = cart.find(ci => String(ci.id) === String(item.id));
            if (existing) existing.quantity = Number(existing.quantity || 0) + 1;
            else cart.push(item);
            localStorage.setItem('cart', JSON.stringify(cart));
          }
          // feedback
          btn.textContent = 'Added';
          try { toast && toast.show(`${product.title} added to cart`, { duration: 1800, type: 'success' }); } catch(e){}
          setTimeout(() => { btn.textContent = 'Add to Cart'; }, 1000);
        } catch (err) {
          console.error('Add to cart failed', err);
          try { toast && toast.show('Could not add to cart', { type: 'error' }); } catch(e){}
        }
      });
    });
  }

  // Apply current filters/sorting and render
  function applyFiltersAndRender() {
    if (!PRODUCTS) return;
    const menuEl = document.querySelector(SELECTORS.menu);
    const sortEl = document.querySelector(SELECTORS.sort);

    const category = menuEl ? menuEl.value : (readQueryParam('category') || 'all');
    const sort = sortEl ? sortEl.value : (readQueryParam('sort') || 'featured');

    // Filter
    let items = PRODUCTS.filter(p => productMatchesCategory(p, category));

    // Sort (stable-ish via slice())
    if (SORTERS[sort]) {
      items = items.slice(); // copy
      items.sort(SORTERS[sort]);
    }

    FILTERED = items;
    renderProducts(items);

    // Update URL params (so sharing keeps filters)
    updateUrlParams({ category: category === 'all' ? null : category, sort: sort === 'featured' ? null : sort });
  }

  // Populate menu selector options automatically from product categories (if menu exists)
  function populateMenuOptions() {
    const menuEl = document.querySelector(SELECTORS.menu);
    if (!menuEl || !PRODUCTS) return;

    // Gather unique categories
    const set = new Set();
    PRODUCTS.forEach(p => {
      const c = p.category;
      if (!c) return;
      if (Array.isArray(c)) {
        c.forEach(x => set.add(normalizeCategory(x)));
      } else {
        set.add(normalizeCategory(c));
      }
    });
    // Convert set to array and sort
    const categories = Array.from(set).sort();

    // Clear existing options but keep the 'All' option if present
    const currentVal = menuEl.value || 'all';
    menuEl.innerHTML = '<option value="all">All</option>';
    categories.forEach(cat => {
      // humanize label: replace hyphens with spaces and capitalize words
      const label = cat.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = label;
      menuEl.appendChild(opt);
    });

    // If URL asked for a category, set it
    const urlCategory = readQueryParam('category');
    if (urlCategory) {
      const normalized = normalizeCategory(urlCategory);
      if ([...menuEl.options].some(o => normalizeCategory(o.value) === normalized)) {
        menuEl.value = normalized;
      } else {
        menuEl.value = 'all';
      }
    } else {
      menuEl.value = currentVal || 'all';
    }
  }

  // Initialize: load products.json, wire controls
  async function init() {
    const gridEl = document.querySelector(SELECTORS.grid);
    if (!gridEl) {
      console.warn('catalog.js: grid element not found:', SELECTORS.grid);
      return;
    }

    // Load products.json
    try {
      const res = await fetch('/products.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load products.json: ' + res.status);
      PRODUCTS = await res.json();
    } catch (err) {
      console.error('catalog.js: Error loading products.json', err);
      const noEl = document.querySelector(SELECTORS.noProducts);
      if (noEl) { noEl.style.display = 'block'; noEl.textContent = 'Failed to load products.'; }
      return;
    }

    // Ensure each product has slug normalized and id
    PRODUCTS.forEach(p => {
      if (!p.slug && p.title) p.slug = String(p.title).toLowerCase().replace(/\s+/g, '-');
      if (!p.id) p.id = p.slug || Math.random().toString(36).slice(2,9);
    });

    // Populate menu options if present
    populateMenuOptions();

    // Set initial sort dropdown from URL (if provided)
    const sortEl = document.querySelector(SELECTORS.sort);
    const urlSort = readQueryParam('sort');
    if (sortEl && urlSort && SORTERS[urlSort]) {
      sortEl.value = urlSort;
    }

    // Wire up event listeners for selectors
    const menuEl = document.querySelector(SELECTORS.menu);
    if (menuEl) {
      menuEl.addEventListener('change', () => {
        applyFiltersAndRender();
      });
    }
    if (sortEl) {
      sortEl.addEventListener('change', () => {
        applyFiltersAndRender();
      });
    }

    // Initial render (reads selectors / URL)
    applyFiltersAndRender();
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging if needed
  window.Catalog = {
    getProducts: () => PRODUCTS,
    getFiltered: () => FILTERED,
    applyFiltersAndRender: applyFiltersAndRender
  };

})();
