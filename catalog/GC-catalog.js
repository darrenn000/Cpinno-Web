const VALID_PRODUCTS = PRODUCTS.filter(p => p.partname && p.description);

const CONFIG = { ITEMS_PER_PAGE: 20, ALL_LABEL: "All" };

const state = {
  activeDesigns: new Set([CONFIG.ALL_LABEL]),
  sort: "default",
  query: "",
  page: 1
};

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
  modalTitle: document.getElementById("js-modal-title"),
  modalBadge: document.getElementById("js-modal-badge"),
  modalDesc: document.getElementById("js-modal-desc")
};

function getDesignTypes() {
  return [...new Set(VALID_PRODUCTS.map(p => p.designType).filter(Boolean))].sort();
}

function getDesignTypeCounts() {
  return VALID_PRODUCTS.reduce((acc, p) => {
    if (p.designType) acc[p.designType] = (acc[p.designType] ?? 0) + 1;
    return acc;
  }, {});
}

function getFilteredProducts() {
  const isAll = state.activeDesigns.has(CONFIG.ALL_LABEL);
  const q = state.query;
  let list = VALID_PRODUCTS.filter(p => {
    const matchesDesign = isAll || state.activeDesigns.has(p.designType);
    const matchesSearch = !q ||
      p.partname.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.designType && p.designType.toLowerCase().includes(q));
    return matchesDesign && matchesSearch;
  });
  if (state.sort === "az") list = list.slice().sort((a, b) => a.partname.localeCompare(b.partname));
  return list;
}

function getPageSlice(list) {
  const start = (state.page - 1) * CONFIG.ITEMS_PER_PAGE;
  return list.slice(start, start + CONFIG.ITEMS_PER_PAGE);
}

function renderFilters() {
  const designTypes = getDesignTypes();
  const counts = getDesignTypeCounts();
  const items = [
    { label: CONFIG.ALL_LABEL, count: VALID_PRODUCTS.length },
    ...designTypes.map(dt => ({ label: dt, count: counts[dt] ?? 0 }))
  ];
  dom.filterList.innerHTML = "";
  items.forEach(({ label, count }) => {
    const isAll = label === CONFIG.ALL_LABEL;
    const isChecked = isAll ? state.activeDesigns.has(CONFIG.ALL_LABEL) : state.activeDesigns.has(label);
    const li = document.createElement("li");
    const id = `filter-${label.replace(/\s+/g, "-").toLowerCase()}`;
    li.className = "sidebar__item" + (isAll ? " sidebar__item--all" : "");
    li.innerHTML = `
      <input type="checkbox" class="sidebar__checkbox" id="${id}" data-type="${label}" ${isChecked ? "checked" : ""} />
      <label class="sidebar__label" for="${id}">${label}</label>
      <span class="sidebar__count">${count}</span>`;
    li.querySelector("input").addEventListener("change", onFilterChange);
    dom.filterList.appendChild(li);
  });
}

function renderGrid() {
  const filtered = getFilteredProducts();
  const page = getPageSlice(filtered);
  dom.count.textContent = `${filtered.length} Product${filtered.length !== 1 ? "s" : ""}`;
  dom.grid.innerHTML = "";
  if (page.length === 0) {
    dom.grid.innerHTML = `<div class="grid-empty"><div class="grid-empty__icon">◻</div><p>No products match your filters.</p></div>`;
    return;
  }
  const fragment = document.createDocumentFragment();
  page.forEach(p => fragment.appendChild(createProductCard(p)));
  dom.grid.appendChild(fragment);
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `View details for ${product.partname}`);

  const imgHTML = product.image
    ? `<img src="${product.image}" alt="${product.partname}" loading="lazy" />`
    : `<div class="card__image-placeholder">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      </div>`;

  card.innerHTML = `
    <div class="card__image-wrap">${imgHTML}</div>
    <div class="card__body">
      <h3 class="card__name">${product.partname}</h3>
      <p class="card__desc">${product.description}</p>
      <div class="card__footer">
        ${product.designType ? `<span class="card__badge">${product.designType}</span>` : ""}
      </div>
    </div>`;

  card.addEventListener("click", () => openModal(product));
  card.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(product); }
  });
  return card;
}

function renderPagination() {
  const total = Math.ceil(getFilteredProducts().length / CONFIG.ITEMS_PER_PAGE);
  dom.pagination.innerHTML = "";
  if (total <= 1) return;
  const prev = makePaginationBtn("‹", state.page === 1, () => goToPage(state.page - 1));
  prev.setAttribute("aria-label", "Previous page");
  dom.pagination.appendChild(prev);
  buildPageRange(state.page, total).forEach(p => {
    if (p === "…") {
      const el = document.createElement("span");
      el.className = "pagination__ellipsis"; el.textContent = "…";
      dom.pagination.appendChild(el);
    } else {
      const btn = makePaginationBtn(String(p), false, () => goToPage(p));
      if (p === state.page) btn.classList.add("pagination__btn--active");
      dom.pagination.appendChild(btn);
    }
  });
  const next = makePaginationBtn("›", state.page === total, () => goToPage(state.page + 1));
  next.setAttribute("aria-label", "Next page");
  dom.pagination.appendChild(next);
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1].filter(p => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result = []; let prev = 0;
  sorted.forEach(p => { if (p - prev > 1) result.push("…"); result.push(p); prev = p; });
  return result;
}

function makePaginationBtn(label, disabled, onClick) {
  const btn = document.createElement("button");
  btn.className = "pagination__btn"; btn.textContent = label; btn.disabled = disabled;
  if (!disabled) btn.addEventListener("click", onClick);
  return btn;
}

function goToPage(page) {
  state.page = page; renderGrid(); renderPagination();
  dom.grid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openModal(product) {
  dom.modalImgWrap.innerHTML = product.image
    ? `<img src="${product.image}" alt="${product.partname}" />`
    : `<div class="modal__image-placeholder">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <span>No image available</span>
      </div>`;

  dom.modalTitle.textContent = product.partname;
  dom.modalBadge.textContent = product.designType ?? "";
  dom.modalBadge.style.display = product.designType ? "inline-block" : "none";
  dom.modalDesc.textContent = product.description;

  dom.modalOverlay.classList.add("modal-overlay--open");
  document.body.style.overflow = "hidden";
  dom.modalClose.focus();
}

function closeModal() {
  dom.modalOverlay.classList.remove("modal-overlay--open");
  document.body.style.overflow = "";
}

function onFilterChange(e) {
  const type = e.target.dataset.type;
  if (!type) return;
  if (type === CONFIG.ALL_LABEL) {
    if (e.target.checked) { state.activeDesigns.clear(); state.activeDesigns.add(CONFIG.ALL_LABEL); }
    else { e.target.checked = true; return; }
  } else {
    state.activeDesigns.delete(CONFIG.ALL_LABEL);
    if (e.target.checked) { state.activeDesigns.add(type); }
    else { state.activeDesigns.delete(type); if (state.activeDesigns.size === 0) state.activeDesigns.add(CONFIG.ALL_LABEL); }
  }
  state.page = 1; renderFilters(); renderGrid(); renderPagination();
}

function init() {
  renderFilters(); renderGrid(); renderPagination();

  let searchTimer;
  dom.search.addEventListener("input", e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = e.target.value.toLowerCase().trim();
      state.page = 1; renderGrid(); renderPagination();
    }, 220);
  });

  dom.sort.addEventListener("change", e => {
    state.sort = e.target.value; state.page = 1; renderGrid(); renderPagination();
  });

  dom.modalClose.addEventListener("click", closeModal);
  dom.modalOverlay.addEventListener("click", e => { if (e.target === dom.modalOverlay) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
}

document.addEventListener("DOMContentLoaded", init);

// Nav scroll + hamburger
const nav = document.querySelector(".nav");
window.addEventListener("scroll", () => nav.classList.toggle("scrolled", window.scrollY > 50));

const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
hamburger.addEventListener("click", () => {
  const isOpen = hamburger.classList.toggle("open");
  mobileMenu.classList.toggle("open", isOpen);
  mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  hamburger.setAttribute("aria-expanded", String(isOpen));
  document.body.style.overflow = isOpen ? "hidden" : "";
});
mobileMenu.querySelectorAll(".mobile-link").forEach(link => {
  link.addEventListener("click", () => {
    hamburger.classList.remove("open"); mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  });
});