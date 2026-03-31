/**
 * catalog.js
 * ──────────────────────────────────────────────────────────────
 * Handles all interactivity for the NOE Formliners product catalog.
 *
 * Modules:
 *   1. Config
 *   2. State
 *   3. DOM references
 *   4. Data layer  (filter + sort)
 *   5. Render: sidebar filters
 *   6. Render: product grid
 *   7. Render: pagination
 *   8. Render: modal
 *   9. Event listeners
 *  10. Init
 * ──────────────────────────────────────────────────────────────
 */

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
  return [...new Set(PRODUCTS.map((p) => p.designType).filter(Boolean))].sort();
}

/**
 * Counts products per design type across the entire dataset.
 * Returns { [designType]: count }
 */
function getDesignTypeCounts() {
  return PRODUCTS.reduce((acc, p) => {
    if (p.designType) {
      acc[p.designType] = (acc[p.designType] ?? 0) + 1;
    }
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

  let list = PRODUCTS.filter((p) => {
    const matchesDesign =
      isAllSelected || state.activeDesigns.has(p.designType);
    const matchesSearch =
      !q ||
      p.partNo.toLowerCase().includes(q) ||
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
  const allCount = PRODUCTS.length;

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

  // Update count display
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

  page.forEach((product) => {
    const card = createProductCard(product);
    fragment.appendChild(card);
  });

  dom.grid.appendChild(fragment);
}
/**
 * Returns the correct media HTML for the modal panel.
 * Sketchfab URLs get a full interactive embed iframe.
 * Plain image paths get a regular <img>.
 */
function getModalMediaHTML(product) {
  if (!product.image) {
    return `<div class="modal__image-placeholder">No image available</div>`;
  }

  const sketchfabId = getSketchfabId(product.image);

  if (sketchfabId) {
    const embedUrl = `https://sketchfab.com/models/${sketchfabId}/embed?autostart=1&ui_hint=0`;
    return `
      <iframe
        title="${product.description} 3D model"
        src="${embedUrl}"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowfullscreen
        loading="lazy"
        style="width:100%; height:100%; min-height:340px; border:0;"
      ></iframe>
    `;
  }

  return `<img src="${product.image}" alt="${product.description}" />`;
}
/**
 * Returns the correct media HTML for a card thumbnail.
 * Sketchfab URLs get a static preview thumbnail.
 * Plain image paths get a regular <img>.
 */
function getCardMediaHTML(product) {
  if (!product.image) {
    return `<div class="card__image-placeholder">No image</div>`;
  }

  const sketchfabId = getSketchfabId(product.image);

  if (sketchfabId) {
    // Sketchfab provides a thumbnail image at this URL
    const thumb = `https://media.sketchfab.com/models/${sketchfabId}/thumbnails/default.jpg`;
    return `
      <img src="${thumb}" alt="${product.description}" loading="lazy" />
      <div class="card__3d-badge">3D</div>
    `;
  }

  return `<img src="${product.image}" alt="${product.description}" loading="lazy" />`;
}

/**
 * Extracts the Sketchfab model ID from a URL.
 * Returns the ID string, or null if not a Sketchfab URL.
 *
 * Handles formats:
 *   https://sketchfab.com/3d-models/name-MODELID
 *   https://sketchfab.com/models/MODELID
 *   https://sketchfab.com/models/MODELID/embed
 */
function getSketchfabId(url) {
  if (!url || !url.includes('sketchfab.com')) return null;

  // Match the last 32-char hex ID in the URL
  const match = url.match(/([a-f0-9]{32})(?:\/|$)/i);
  return match ? match[1] : null;
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

  const imageHTML = getCardMediaHTML(product);

  const dimPreview =
    product.matSizeA && product.matSizeB
      ? `${product.matSizeA} × ${product.matSizeB} mm`
      : "";

  card.innerHTML = `
    <div class="card__image-wrap">${imageHTML}</div>
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

  // Open modal on click or Enter key
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

  // Prev button
  const prev = makePaginationBtn("‹", state.page === 1, () =>
    goToPage(state.page - 1),
  );
  prev.setAttribute("aria-label", "Previous page");
  dom.pagination.appendChild(prev);

  // Page number buttons with ellipsis
  const pagesToShow = buildPageRange(state.page, totalPages);

  pagesToShow.forEach((p) => {
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

  // Next button
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
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
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
  // Scroll to top of grid
  dom.grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── 8. Render: modal ─────────────────────────────────────── */

function openModal(product) {
  // Image
      dom.modalImgWrap.innerHTML = getModalMediaHTML(product);

  // Header
  dom.modalPart.textContent = `Part No. ${product.partNo}`;
  dom.modalTitle.textContent = product.description;

  // Badge
  dom.modalBadge.textContent = product.designType ?? "";
  dom.modalBadge.style.display = product.designType ? "inline-block" : "none";

  // Specs rows
  const specs = [
    {
      label: "Mat size A",
      value: product.matSizeA ? `${product.matSizeA} mm` : "—",
    },
    {
      label: "Mat size B",
      value: product.matSizeB ? `${product.matSizeB} mm` : "—",
    },
    {
      label: "Thickness",
      value: product.thickness ? `${product.thickness} mm` : "—",
    },
    {
      label: "Weight",
      value: product.weight ? `${product.weight} kg/m²` : "—",
    },
    { label: "Design type", value: product.designType ?? "—" },
  ];

  dom.modalSpecs.innerHTML = specs
    .map(
      ({ label, value }) => `
      <tr>
        <td>${label}</td>
        <td>${value}</td>
      </tr>
    `,
    )
    .join("");

  // Open
  dom.modalOverlay.classList.add("modal-overlay--open");
  document.body.style.overflow = "hidden";
  dom.modalClose.focus();
}

function closeModal() {
  dom.modalOverlay.classList.remove("modal-overlay--open");
  document.body.style.overflow = "";
}

/* ── 9. Event listeners ───────────────────────────────────── */

function onFilterChange(e) {
  const { type, checked } = e.target.dataset.type
    ? { type: e.target.dataset.type, checked: e.target.checked }
    : {};

  if (!type) return;

  if (type === CONFIG.ALL_LABEL) {
    // "All" toggles everything
    if (e.target.checked) {
      state.activeDesigns.clear();
      state.activeDesigns.add(CONFIG.ALL_LABEL);
    } else {
      // Prevent unchecking "All" with nothing else selected
      e.target.checked = true;
      return;
    }
  } else {
    state.activeDesigns.delete(CONFIG.ALL_LABEL);
    if (e.target.checked) {
      state.activeDesigns.add(type);
    } else {
      state.activeDesigns.delete(type);
      // If nothing selected, fall back to "All"
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
  // Search — debounced
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

  // Sort
  dom.sort.addEventListener("change", (e) => {
    state.sort = e.target.value;
    state.page = 1;
    renderGrid();
    renderPagination();
  });

  // Modal close via button
  dom.modalClose.addEventListener("click", closeModal);

  // Modal close via overlay backdrop click
  dom.modalOverlay.addEventListener("click", (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });

  // Modal close via Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

/* ── 10. Init ─────────────────────────────────────────────── */

function init() {
  if (typeof PRODUCTS === "undefined" || !Array.isArray(PRODUCTS)) {
    dom.grid.innerHTML = `
      <div class="grid-empty">
        <p>⚠️ products.js not found. Run <code>node extract-catalog.js</code> first.</p>
      </div>
    `;
    return;
  }

  renderFilters();
  renderGrid();
  renderPagination();
  initEventListeners();
}

// Run when DOM is ready
document.addEventListener("DOMContentLoaded", init);
