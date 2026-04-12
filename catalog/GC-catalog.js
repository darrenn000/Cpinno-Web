/**
 * catalog.js
 * ──────────────────────────────────────────────────────────────
 * Handles all interactivity for the NOE Formliners product catalog.
 *
 * Modules:
 *   1. Config
 *   2. State
 *   3. DOM references
 *   4. Data layer        (filter + sort)
 *   5. Render: sidebar filters
 *   6. Render: product grid
 *   7. Render: pagination
 *   8. Render: modal
 *   9. Media helpers     (image + 3D Sketchfab)
 *  10. Event listeners
 *  11. Init
 * ──────────────────────────────────────────────────────────────
 */

/* ── 0. Valid products (filter out empty rows from products.js) ── */
// products.js may contain a trailing empty object; exclude any row missing partNo or description.
const VALID_PRODUCTS = (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS))
  ? PRODUCTS.filter((p) => p.partNo && p.description)
  : [];

/* ── 1. Config ────────────────────────────────────────────── */
const CONFIG = {
  ITEMS_PER_PAGE: 20, // products shown per page
  ALL_LABEL: "All", // label used for the "show all" filter
};

/* ── 2. State ─────────────────────────────────────────────── */
const state = {
  activeDesigns: new Set([CONFIG.ALL_LABEL]), // selected filter checkboxes
  sort: "default", // 'default' | 'az'
  query: "", // search string (lowercase)
  page: 1, // current page (1-indexed)
};

/* ── 3. DOM references ────────────────────────────────────── */
const dom = {
  filterList: document.getElementById("js-filter-list"),
  grid: document.getElementById("js-grid"),
  pagination: document.getElementById("js-pagination"),
  count: document.getElementById("js-count"),
  search: document.getElementById("js-search"),
  sort: document.getElementById("js-sort"),
  modalOverlay: document.getElementById("js-modal-overlay"),
  modal: document.getElementById("js-modal"),
  modalClose: document.getElementById("js-modal-close"),
  modalImgWrap: document.getElementById("js-modal-img-wrap"),
  modalPart: document.getElementById("js-modal-part"),
  modalTitle: document.getElementById("js-modal-title"),
  modalBadge: document.getElementById("js-modal-badge"),
  modalSpecs: document.getElementById("js-modal-specs"),
};

/* ── 4. Data layer ────────────────────────────────────────── */

/**
 * Returns a deduplicated, sorted list of all design types in the dataset.
 */
function getDesignTypes() {
  return [...new Set(VALID_PRODUCTS.map((p) => p.designType).filter(Boolean))].sort();
}

/**
 * Counts products per design type across the entire dataset.
 * Returns { [designType]: count }
 */
function getDesignTypeCounts() {
  return VALID_PRODUCTS.reduce((acc, p) => {
    if (p.designType) acc[p.designType] = (acc[p.designType] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * Applies current state filters and sort to PRODUCTS.
 * Returns the filtered+sorted array.
 */
function getFilteredProducts() {
  const isAllSelected = state.activeDesigns.has(CONFIG.ALL_LABEL);
  const q = state.query;

  let list = VALID_PRODUCTS.filter((p) => {
    const matchesDesign =
      isAllSelected || state.activeDesigns.has(p.designType);
    const matchesSearch =
      !q ||
      String(p.partNo).toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.designType && p.designType.toLowerCase().includes(q));
    return matchesDesign && matchesSearch;
  });

  if (state.sort === "az") {
    list = list
      .slice()
      .sort((a, b) => a.description.localeCompare(b.description));
  }

  return list;
}

/**
 * Returns the page slice of a filtered list.
 */
function getPageSlice(list) {
  const start = (state.page - 1) * CONFIG.ITEMS_PER_PAGE;
  return list.slice(start, start + CONFIG.ITEMS_PER_PAGE);
}

/* ── 5. Render: sidebar filters ───────────────────────────── */

function renderFilters() {
  const designTypes = getDesignTypes();
  const counts = getDesignTypeCounts();
  const allCount = VALID_PRODUCTS.length;

  const items = [
    { label: CONFIG.ALL_LABEL, count: allCount },
    ...designTypes.map((dt) => ({ label: dt, count: counts[dt] ?? 0 })),
  ];

  dom.filterList.innerHTML = "";

  items.forEach(({ label, count }) => {
    const isAll = label === CONFIG.ALL_LABEL;
    const isChecked = isAll
      ? state.activeDesigns.has(CONFIG.ALL_LABEL)
      : state.activeDesigns.has(label);

    const li = document.createElement("li");
    const id = `filter-${label.replace(/\s+/g, "-").toLowerCase()}`;

    li.className = "sidebar__item" + (isAll ? " sidebar__item--all" : "");
    li.innerHTML = `
      <input
        type="checkbox"
        class="sidebar__checkbox"
        id="${id}"
        data-type="${label}"
        ${isChecked ? "checked" : ""}
      />
      <label class="sidebar__label" for="${id}">${label}</label>
      <span class="sidebar__count">${count}</span>
    `;

    li.querySelector("input").addEventListener("change", onFilterChange);
    dom.filterList.appendChild(li);
  });
}

/* ── 6. Render: product grid ──────────────────────────────── */

function renderGrid() {
  const filtered = getFilteredProducts();
  const page = getPageSlice(filtered);

  dom.count.textContent = `${filtered.length} Product${filtered.length !== 1 ? "s" : ""}`;
  dom.grid.innerHTML = "";

  if (page.length === 0) {
    dom.grid.innerHTML = `
      <div class="grid-empty">
        <div class="grid-empty__icon">◻</div>
        <p>No products match your current filters.</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  page.forEach((product) => fragment.appendChild(createProductCard(product)));
  dom.grid.appendChild(fragment);
}

/**
 * Returns a dimension preview string for a product card.
 * Shows the first A×B pair and a "+N sizes" badge when multiple values exist.
 */
function buildDimPreview(a, b) {
  const aVals = String(a).split(",").map((s) => s.trim());
  const bVals = String(b).split(",").map((s) => s.trim());
  const first = `${aVals[0]} × ${bVals[0]} mm`;
  const extra =
    aVals.length > 1
      ? ` <span class="card__more-sizes">+${aVals.length - 1} sizes</span>`
      : "";
  return first + extra;
}

/**
 * Creates and returns a product card DOM element.
 */
function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `View details for ${product.description}`);

  const dimPreview =
    product.matSizeA && product.matSizeB
      ? buildDimPreview(product.matSizeA, product.matSizeB)
      : "";

  card.innerHTML = `
    <div class="card__image-wrap">${getCardMediaHTML(product)}</div>
    <div class="card__body">
      <p class="card__part">Part No. ${product.partNo}</p>
      <h3 class="card__name">${product.description}</h3>
      <div class="card__footer">
        ${
          product.designType
            ? `<span class="card__badge">${product.designType}</span>`
            : "<span></span>"
        }
        ${
          dimPreview
            ? `<span class="card__specs-preview">${dimPreview}</span>`
            : ""
        }
      </div>
    </div>
  `;

  card.addEventListener("click", () => openModal(product));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal(product);
    }
  });

  return card;
}

/* ── 7. Render: pagination ────────────────────────────────── */

function renderPagination() {
  const totalItems = getFilteredProducts().length;
  const totalPages = Math.ceil(totalItems / CONFIG.ITEMS_PER_PAGE);

  dom.pagination.innerHTML = "";
  if (totalPages <= 1) return;

  const prev = makePaginationBtn("‹", state.page === 1, () =>
    goToPage(state.page - 1),
  );
  prev.setAttribute("aria-label", "Previous page");
  dom.pagination.appendChild(prev);

  buildPageRange(state.page, totalPages).forEach((p) => {
    if (p === "…") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "pagination__ellipsis";
      ellipsis.textContent = "…";
      dom.pagination.appendChild(ellipsis);
    } else {
      const btn = makePaginationBtn(String(p), false, () => goToPage(p));
      if (p === state.page) btn.classList.add("pagination__btn--active");
      dom.pagination.appendChild(btn);
    }
  });

  const next = makePaginationBtn("›", state.page === totalPages, () =>
    goToPage(state.page + 1),
  );
  next.setAttribute("aria-label", "Next page");
  dom.pagination.appendChild(next);
}

/**
 * Returns an array of page numbers + '…' strings to render.
 * Always shows first, last, and a window around the current page.
 */
function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set(
    [1, total, current, current - 1, current + 1].filter(
      (p) => p >= 1 && p <= total,
    ),
  );
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  sorted.forEach((p) => {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  });
  return result;
}

function makePaginationBtn(label, disabled, onClick) {
  const btn = document.createElement("button");
  btn.className = "pagination__btn";
  btn.textContent = label;
  btn.disabled = disabled;
  if (!disabled) btn.addEventListener("click", onClick);
  return btn;
}

function goToPage(page) {
  state.page = page;
  renderGrid();
  renderPagination();
  dom.grid.scrollIntoView({ behavior: "smooth", block: "start" });}

  /* ── 8. Render: modal ─────────────────────────────────────── */

function openModal(product) {
  dom.modalImgWrap.innerHTML = getModalMediaHTML(product);

  dom.modalPart.textContent = `Part No. ${product.partName}`;
  dom.modalTitle.textContent = product.description;

  dom.modalBadge.textContent = product.designType ?? "";
  dom.modalBadge.style.display = product.designType ? "inline-block" : "none";

  const specs = [
    { label: "Design type", value: product.designType ?? "—" },
  ];
}


function getModalMediaHTML(product) {
  const sketchfabId = getSketchfabId(product.link3d);
  const hasImage = !!product.image;
  const has3d = !!sketchfabId;
}
 // Nothing available
  if (!hasImage && !has3d) {
    return `<div class="modal__image-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="1.2" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span>No image available</span>
            </div>
            `;
            
  // Photo only, no 3D link
  if (hasImage && !has3d) {
    return `<img src="${product.image}" alt="${product.description}" class="modal__image">`;
  } 
}

/* ── 10. Event listeners ──────────────────────────────────── */

function onFilterChange(e) {
  const type = e.target.dataset.type;
  if (!type) return;

  if (type === CONFIG.ALL_LABEL) {
    if (e.target.checked) {
      state.activeDesigns.clear();
      state.activeDesigns.add(CONFIG.ALL_LABEL);
    } else {
      // Prevent unchecking "All" when nothing else is selected
      e.target.checked = true;
      return;
    }
  } else {
    state.activeDesigns.delete(CONFIG.ALL_LABEL);
    if (e.target.checked) {
      state.activeDesigns.add(type);
    } else {
      state.activeDesigns.delete(type);
      // Fall back to "All" if nothing selected
      if (state.activeDesigns.size === 0) {
        state.activeDesigns.add(CONFIG.ALL_LABEL);
      }
    }
  }

  state.page = 1;
  renderFilters();
  renderGrid();
  renderPagination();
}

function initEventListeners() {
  // Search — debounced 220ms
  let searchTimer;
  dom.search.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = e.target.value.toLowerCase().trim();
      state.page = 1;
      renderGrid();
      renderPagination();
    }, 220);
  });

  // Sort dropdown
  dom.sort.addEventListener("change", (e) => {
    state.sort = e.target.value;
    state.page = 1;
    renderGrid();
    renderPagination();
  });

  // Modal — close button
  dom.modalClose.addEventListener("click", closeModal);

  // Modal — click outside to close
  dom.modalOverlay.addEventListener("click", (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });

  // Modal — Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

/* ── 11. Init ─────────────────────────────────────────────── */

function init() {
  if (VALID_PRODUCTS.length === 0) {
    dom.grid.innerHTML = `
      <div class="grid-empty">
        <p>⚠️ products.js not found or empty. Run <code>node extract-catalog.js</code> first.</p>
      </div>
    `;
    return;
  }

  renderFilters();
  renderGrid();
  renderPagination();
  initEventListeners();
}

document.addEventListener("DOMContentLoaded", init);

// ── Hamburger / mobile menu (matches index.js behaviour) ──
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

const nav = document.querySelector(".nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 50);
});

hamburger.addEventListener("click", () => {
  const isOpen = hamburger.classList.toggle("open");
  mobileMenu.classList.toggle("open", isOpen);
  mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  hamburger.setAttribute("aria-expanded", String(isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";
});

// Close drawer when a mobile link is clicked
mobileMenu.querySelectorAll(".mobile-link").forEach((link) => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("open");
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  });
});
