const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");
const nav = document.querySelector("nav");

// ── Toggle mobile menu ──────────────────────────────────────────
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

document.querySelectorAll(".mobile-link").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

// ── Sticky nav ──────────────────────────────────────────────────
window.addEventListener("scroll", () => {
  nav.style.background =
    window.scrollY > 60 ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0.52)";
});

// ── Directional fade-in on scroll ──────────────────────────────
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translate(0, 0)";
      }
    });
  },
  { threshold: 0.1 }
);

function observe(el, translateX, translateY = 0) {
  el.style.opacity = "0";
  el.style.transform = `translate(${translateX}px, ${translateY}px)`;
  el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
  observer.observe(el);
}


// ── Override animations to bottom-to-top on mobile ──────────────
function resetMobileAnimations() {
  const isMobile = window.innerWidth <= 768;

  const about = document.querySelector(".about");
  const serviceBlocks = document.querySelectorAll(".service-block");

  if (isMobile) {
    if (about) observe(about, 0, 40);
    if (serviceBlocks[0]) observe(serviceBlocks[0], 0, 40);
    if (serviceBlocks[1]) observe(serviceBlocks[1], 0, 40);
  } else {
    if (about) observe(about, 80);
    if (serviceBlocks[0]) observe(serviceBlocks[0], -30);
    if (serviceBlocks[1]) observe(serviceBlocks[1], 30);
  }
}

resetMobileAnimations();
window.addEventListener("resize", resetMobileAnimations);

// ── Loading screen ──────────────────────────────────────────────
window.addEventListener("load", () => {
  const loadingScreen = document.getElementById("loading-screen");
  loadingScreen.classList.add("hidden");
});