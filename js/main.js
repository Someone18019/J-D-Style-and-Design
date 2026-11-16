// ===== SETTINGS =====
const PAGE_FADE_MS = 600; // fade time when going to the quiz
const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const finePointer = window.matchMedia("(pointer: fine)").matches; // true for a mouse
const desktop = window.matchMedia("(min-width: 801px)");

// ===== FOOTER YEAR =====
document.getElementById("year").textContent = new Date().getFullYear();

// ===== BACKGROUND GLOW FOLLOWS THE MOUSE =====
let mouseFrame = null;
window.addEventListener("pointermove", (e) => {
  if (reduceMotion || mouseFrame) return;
  mouseFrame = requestAnimationFrame(() => {
    const root = document.documentElement;
    root.style.setProperty("--mx", (e.clientX / window.innerWidth) * 100 + "%");
    root.style.setProperty(
      "--my",
      (e.clientY / window.innerHeight) * 100 + "%",
    );
    mouseFrame = null;
  });
});

// ===== HERO LIFTS AWAY, TOP BAR SLIDES IN =====
const hero = document.querySelector(".hero");

function onScroll() {
  const progress = Math.min(window.scrollY / (window.innerHeight * 0.7), 1);
  if (!reduceMotion) hero.style.setProperty("--h", progress.toFixed(3));
  document.body.classList.toggle(
    "scrolled",
    window.scrollY > window.innerHeight * 0.6,
  );
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ===== SIDE PANELS SLIDE IN WHEN THE LAYOUT APPEARS =====
const layout = document.querySelector(".layout");
new IntersectionObserver(
  (entries, obs) => {
    if (entries[0].isIntersecting) {
      layout.classList.add("in-view");
      obs.disconnect();
    }
  },
  { threshold: 0.05 },
).observe(layout);

// ===== SECTIONS FADE AND SLIDE IN AS YOU SCROLL =====
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 },
);
document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));

// ===== ICON BAR: icons swell as the mouse gets close (like a Mac dock) =====
const dock = document.getElementById("dock");
const dockItems = [...dock.querySelectorAll(".dock-item")];
const DOCK_REACH = 130; // how far away (px) the mouse starts to affect icons
const DOCK_GROW = 0.55; // how much bigger the closest icon gets (0.55 = 55%)

function resetDock() {
  dockItems.forEach((item) => item.style.setProperty("--s", 1));
}

window.addEventListener("pointermove", (e) => {
  if (reduceMotion || !finePointer || !desktop.matches) return;
  const box = dock.getBoundingClientRect();

  // Only react when the mouse is near the bar sideways
  if (e.clientX > box.right + 120) return resetDock();

  dockItems.forEach((item) => {
    const r = item.getBoundingClientRect();
    const centreY = r.top + r.height / 2;
    const distance = Math.abs(e.clientY - centreY);
    const pull = Math.max(0, 1 - distance / DOCK_REACH);
    item.style.setProperty("--s", (1 + DOCK_GROW * pull).toFixed(3));
  });
});
document.addEventListener("pointerleave", resetDock);
desktop.addEventListener("change", resetDock);

// ===== CARDS AND PREVIEW BOXES TILT TOWARDS THE MOUSE =====
const TILT = 6; // max tilt in degrees

document.querySelectorAll(".card, .show-box").forEach((el) => {
  if (reduceMotion || !finePointer) return;
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", (x * TILT * 2).toFixed(2) + "deg");
    el.style.setProperty("--rx", (-y * TILT * 2).toFixed(2) + "deg");
  });
  el.addEventListener("pointerleave", () => {
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  });
});

// ===== ESTIMATE PREVIEW: total ticks up with each chip (6 second loop) =====
const demoTotal = document.getElementById("demoTotal");
let demoShown = 0;

function countTo(target, duration = 500) {
  const from = demoShown;
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    demoShown = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
    demoTotal.textContent = "J$" + demoShown.toLocaleString();
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function runEstimateDemo() {
  setTimeout(() => countTo(60000), 700); // Website build
  setTimeout(() => countTo(63000), 1900); // Domain
  setTimeout(() => countTo(71000), 3100); // SEO
  setTimeout(() => countTo(0, 300), 5500); // reset before the loop restarts
}
if (demoTotal && !reduceMotion) {
  runEstimateDemo();
  setInterval(runEstimateDemo, 6000);
} else if (demoTotal) {
  demoTotal.textContent = "J$71,000";
}

// ===== ESTIMATE LINKS: fade the page out, then open the quiz =====
document.querySelectorAll(".js-quiz").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.getAttribute("href") || "quiz.html";
    document.body.style.transition = "opacity " + PAGE_FADE_MS + "ms ease";
    document.body.style.opacity = "0";
    setTimeout(() => {
      window.location.href = target;
    }, PAGE_FADE_MS);
  });
});

// Coming back with the browser's back button: show the page again
window.addEventListener("pageshow", () => {
  document.body.style.opacity = "";
});
