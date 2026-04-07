// ── Loading screen ──────────────────────────────────────────
function hideLoadingScreen() {
  const ls = document.getElementById("loading-screen");
  if (ls) ls.classList.add("hidden");
}
if (document.readyState === "complete") {
  hideLoadingScreen();
} else {
  window.addEventListener("load", hideLoadingScreen);
}

// ── Mobile menu ─────────────────────────────────────────────
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

function openMenu() {
  hamburger.classList.add("open");
  mobileMenu.classList.add("open");
  hamburger.setAttribute("aria-expanded", "true");
  mobileMenu.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeMenu() {
  hamburger.classList.remove("open");
  mobileMenu.classList.remove("open");
  hamburger.setAttribute("aria-expanded", "false");
  mobileMenu.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
hamburger.addEventListener("click", () => {
  hamburger.classList.contains("open") ? closeMenu() : openMenu();
});
document.querySelectorAll(".mobile-link").forEach(l => l.addEventListener("click", closeMenu));
document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });

// ── Slider ──────────────────────────────────────────────────
const track = document.getElementById("slidesTrack");
const slides = track.querySelectorAll(".slide");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const indicators = document.querySelectorAll(".indicator");
const total = slides.length;
let current = 0;
let isAnimating = false;

function goTo(index) {
  if (isAnimating || index === current) return;
  isAnimating = true;

  slides[current].classList.remove("active");
  indicators[current].classList.remove("active");

  current = index;

  track.style.transform = `translateX(-${current * 100}%)`;
  slides[current].classList.add("active");
  indicators[current].classList.add("active");

  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === total - 1;

  setTimeout(() => { isAnimating = false; }, 650);
}

prevBtn.addEventListener("click", () => { if (current > 0) goTo(current - 1); });
nextBtn.addEventListener("click", () => { if (current < total - 1) goTo(current + 1); });

indicators.forEach(btn => {
  btn.addEventListener("click", () => goTo(parseInt(btn.dataset.index)));
});

// Keyboard navigation
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") { if (current > 0) goTo(current - 1); }
  if (e.key === "ArrowRight") { if (current < total - 1) goTo(current + 1); }
});

// Touch/swipe support
let touchStartX = 0;
track.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
track.addEventListener("touchend", e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0 && current < total - 1) goTo(current + 1);
    if (diff < 0 && current > 0) goTo(current - 1);
  }
}, { passive: true });