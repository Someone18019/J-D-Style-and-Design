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

// ===== BRAND AND BUTTON GLIDE INTO THE TOP BAR =====
// Each pair: [element in the hero, matching element in the top bar]
const glidePairs = [
  [
    document.querySelector(".hero .brand"),
    document.querySelector(".topbar-brand"),
  ],
  [
    document.querySelector(".hero .btn"),
    document.querySelector(".topbar .btn"),
  ],
];
const GLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const GLIDE_MS = 700;
let glideTimer = null;

// Work out the move and scale that puts the top bar element over the hero element
function offsetBetween(barEl, heroEl) {
  barEl.style.transition = "none";
  barEl.style.transform = "";
  const bar = barEl.getBoundingClientRect();
  const hero = heroEl.getBoundingClientRect();
  const scale = hero.height / bar.height;
  return (
    "translate(" +
    (hero.left - bar.left) +
    "px, " +
    (hero.top - bar.top) +
    "px) scale(" +
    scale +
    ")"
  );
}

function runGlide(toBar) {
  clearTimeout(glideTimer);
  glidePairs.forEach(([heroEl, barEl]) => {
    if (!heroEl || !barEl) return;
    const offset = offsetBetween(barEl, heroEl);
    barEl.style.transformOrigin = "top left";

    if (toBar) {
      // Start over the hero element, then glide into the top bar
      barEl.style.transform = offset;
      barEl.getBoundingClientRect(); // apply the start position first
      barEl.style.transition =
        "transform " + GLIDE_MS + "ms " + GLIDE_EASE + ", opacity 0.3s ease";
      barEl.style.transform = "";
    } else {
      // Scrolling back up: glide back towards the hero and fade out
      barEl.getBoundingClientRect();
      barEl.style.transition =
        "transform 0.6s " + GLIDE_EASE + ", opacity 0.5s ease";
      barEl.style.transform = offset;
    }
  });

  // After gliding in, hand control back to the CSS (so the button hover works again)
  if (toBar) {
    glideTimer = setTimeout(() => {
      glidePairs.forEach(([, barEl]) => {
        if (barEl) barEl.style.transition = "";
      });
    }, GLIDE_MS + 50);
  }
}

// ===== HERO LIFTS AWAY, TOP BAR FILLS IN =====
const hero = document.querySelector(".hero");
let inTopBar = false;

function onScroll() {
  const progress = Math.min(window.scrollY / (window.innerHeight * 0.7), 1);
  if (!reduceMotion) hero.style.setProperty("--h", progress.toFixed(3));

  const scrolled = window.scrollY > window.innerHeight * 0.6;
  if (scrolled !== inTopBar) {
    inTopBar = scrolled;
    document.body.classList.toggle("scrolled", scrolled);
    if (!reduceMotion) runGlide(scrolled);
  }
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

  // Only react when the mouse is right of the bar's centre line (up to 120px past it)
  const centreX = box.left + box.width / 2;
  if (e.clientX < centreX || e.clientX > box.right + 120) return resetDock();

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

// ===== ICON BAR: glow on the current section, click to centre a section =====
const dockSections = dockItems
  .map((item) => document.querySelector(item.getAttribute("href")))
  .filter(Boolean);

// The current section is the last one whose top has passed the middle of the screen
function updateActiveIcon() {
  const middle = window.innerHeight / 2;
  let current = null;
  dockSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= middle) current = section;
  });
  dockItems.forEach((item) => {
    item.classList.toggle(
      "active",
      !!current && item.getAttribute("href") === "#" + current.id,
    );
  });
}
window.addEventListener("scroll", updateActiveIcon, { passive: true });
window.addEventListener("resize", updateActiveIcon);
updateActiveIcon();

dockItems.forEach((item) => {
  item.addEventListener("click", (e) => {
    const target = document.querySelector(item.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    history.replaceState(null, "", item.getAttribute("href"));
  });
});

// ===== SECTION SETTLE: after wheel scrolling stops, the nearest section glides to the centre (computers only) =====
const snapTargets = [...document.querySelectorAll(".panel")];
const SETTLE_DELAY_MS = 1200; // wait after the last wheel movement
const SETTLE_RANGE = 0.3; // only settle if a section's centre is within 30% of the screen height
const SETTLE_GLIDE_MS = 1600; // length of the glide (higher = slower, smoother)
const HERO_DELAY_MS = 500; // shorter wait in the zone between the top and Services
let settleTimer = null;
let glideFrame = null;

function cancelGlide() {
  if (glideFrame) cancelAnimationFrame(glideFrame);
  glideFrame = null;
  document.documentElement.style.scrollBehavior = "";
}

// Eased scroll to a position
function glideTo(y) {
  cancelGlide();
  const startY = window.scrollY;
  const dist = y - startY;
  const start = performance.now();
  document.documentElement.style.scrollBehavior = "auto"; // stop the CSS smooth scroll fighting the glide
  function frame(now) {
    const t = Math.min((now - start) / SETTLE_GLIDE_MS, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out: fast start, gentle stop
    window.scrollTo(0, startY + dist * eased);
    if (t < 1) glideFrame = requestAnimationFrame(frame);
    else cancelGlide();
  }
  glideFrame = requestAnimationFrame(frame);
}

// Where the page must scroll to so the first section (Services) is centred
function firstSectionY() {
  const r = snapTargets[0].getBoundingClientRect();
  return window.scrollY + (r.top + r.height / 2 - window.innerHeight / 2);
}

function settleToNearest() {
  // Zone between the top and Services: glide to whichever is nearer
  const servicesY = firstSectionY();
  if (window.scrollY < servicesY) {
    if (window.scrollY < 4 || servicesY - window.scrollY < 4) return;
    glideTo(window.scrollY < servicesY / 2 ? 0 : servicesY);
    return;
  }

  // Below that: the nearest section glides to the centre
  const middle = window.innerHeight / 2;
  let bestOffset = 0;
  let bestDist = Infinity;
  snapTargets.forEach((el) => {
    const r = el.getBoundingClientRect();
    const offset = r.top + r.height / 2 - middle;
    if (Math.abs(offset) < bestDist) {
      bestDist = Math.abs(offset);
      bestOffset = offset;
    }
  });
  if (bestDist < 4 || bestDist > window.innerHeight * SETTLE_RANGE) return;
  glideTo(window.scrollY + bestOffset);
}
// Only wheel or touchpad scrolling triggers a settle (not the scrollbar or arrow keys)
window.addEventListener(
  "wheel",
  () => {
    if (reduceMotion || !finePointer || !desktop.matches) return;
    cancelGlide();
    clearTimeout(settleTimer);
    const delay =
      window.scrollY < firstSectionY() ? HERO_DELAY_MS : SETTLE_DELAY_MS;
    settleTimer = setTimeout(settleToNearest, delay);
  },
  { passive: true },
);

// Any key press, click or touch cancels a pending or running settle
["keydown", "mousedown", "touchstart"].forEach((type) =>
  window.addEventListener(
    type,
    () => {
      clearTimeout(settleTimer);
      cancelGlide();
    },
    { passive: true },
  ),
);
// ===== LEFT SIDE PANEL: match the height of the three right boxes =====
const sidePanel = document.getElementById("sidePanel");
const showcaseCol = document.querySelector(".showcase");
function matchSideHeight() {
  if (sidePanel && showcaseCol)
    sidePanel.style.setProperty("--side-h", showcaseCol.offsetHeight + "px");
}
window.addEventListener("resize", matchSideHeight);
window.addEventListener("load", matchSideHeight);
matchSideHeight();

// ===== CENTRE PANELS: fade and drift based on distance from the screen centre =====
const fadePanels = [...document.querySelectorAll(".panel")];
const FADE_MIN = 0.1; // visibility at the screen edges (0.2 = 20%)
const FADE_CLEAR = 0.35; // fully clear while within 35% of centre
const FADE_SHIFT = 30; // how far (px) panels drift as they fade
let fadeFrame = null;

function updatePanelFade() {
  fadeFrame = null;
  const mid = window.innerHeight / 2;
  fadePanels.forEach((p) => {
    const r = p.getBoundingClientRect();
    const d = (r.top + r.height / 2 - mid) / (mid + r.height / 2); // -1 (above) to 1 (below)
    const t = Math.max(
      0,
      (Math.min(Math.abs(d), 1) - FADE_CLEAR) / (1 - FADE_CLEAR),
    );
    p.style.opacity = (1 - (1 - FADE_MIN) * t).toFixed(3);
    p.style.transform =
      "translateY(" + (Math.sign(d) * t * FADE_SHIFT).toFixed(1) + "px)";
  });
}

if (!reduceMotion) {
  fadePanels.forEach((p) => p.classList.add("scroll-fade"));
  const queueFade = () => {
    if (!fadeFrame) fadeFrame = requestAnimationFrame(updatePanelFade);
  };
  window.addEventListener("scroll", queueFade, { passive: true });
  window.addEventListener("resize", queueFade);
  updatePanelFade();
}

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

// ===== ESTIMATE PREVIEW: one timer drives both the chips and the total =====
const demoTotal = document.getElementById("demoTotal");
const demoChips = [...document.querySelectorAll(".ed-chip")];
const DEMO_VALUES = [60000, 3000, 8000]; // website build, domain, SEO
const DEMO_LOOP_MS = 8000; // one full cycle
let demoShown = 0;

// Count the total to a new number, with a small scale bump
function countTo(target, duration = 500) {
  const from = demoShown;
  const start = performance.now();

  demoTotal.classList.remove("bump");
  void demoTotal.offsetWidth; // restart the bump
  demoTotal.classList.add("bump");

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    demoShown = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
    demoTotal.textContent = "J$" + demoShown.toLocaleString();
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function runEstimateDemo() {
  let total = 0;
  DEMO_VALUES.forEach((value, i) => {
    // Add: chip pops in, total goes up
    setTimeout(
      () => {
        demoChips[i].classList.add("on");
        total += value;
        countTo(total);
      },
      600 + i * 1200,
    );

    // Remove, last chip first: chip fades out, total goes down
    setTimeout(
      () => {
        demoChips[i].classList.remove("on");
        total -= value;
        countTo(total);
      },
      5000 + (DEMO_VALUES.length - 1 - i) * 700,
    );
  });
}

if (demoTotal && demoChips.length === DEMO_VALUES.length) {
  if (reduceMotion) {
    demoChips.forEach((chip) => chip.classList.add("on"));
    demoTotal.textContent =
      "J$" + DEMO_VALUES.reduce((a, b) => a + b, 0).toLocaleString();
  } else {
    runEstimateDemo();
    setInterval(runEstimateDemo, DEMO_LOOP_MS);
  }
}

// ===== WEBSITE BUILDER: pick a type and sections, the preview rebuilds =====
// Big headline block for each site type
const BUILDER_HERO = {
  personal: "Your name + headline",
  business: "Your business + Call / WhatsApp",
  event: "Event name, date + sign-up",
  organisation: "Your group + welcome",
};
// Sections switched on when a type is picked
const BUILDER_DEFAULTS = {
  personal: ["about", "gallery", "socials"],
  business: ["services", "gallery", "contact"],
  event: ["events", "contact"],
  organisation: ["about", "events", "contact"],
};
// Every section, in the order it appears on the page
const BUILDER_SECTIONS = {
  about: { label: "About", kind: "block" },
  services: { label: "Services & prices", kind: "tiles" },
  gallery: { label: "Photo", kind: "tiles" },
  menu: { label: "Item", kind: "tiles" },
  events: { label: "Upcoming events", kind: "block" },
  socials: { label: "Instagram · TikTok · YouTube", kind: "block" },
  contact: { label: "Contact form", kind: "block" },
};

const builderPage = document.getElementById("builderPage");
const typePills = [...document.querySelectorAll("#builderType .pill")];
const sectionPills = [...document.querySelectorAll("#builderSections .pill")];
const builder = { type: "business", sections: [] };

function makeBlock(className, text, i) {
  const el = document.createElement("div");
  el.className = "bp " + className;
  el.style.setProperty("--i", i);
  if (text) el.textContent = text;
  return el;
}

function renderBuilder() {
  typePills.forEach((p) =>
    p.setAttribute("aria-pressed", p.dataset.type === builder.type),
  );
  sectionPills.forEach((p) =>
    p.setAttribute(
      "aria-pressed",
      builder.sections.includes(p.dataset.section),
    ),
  );

  builderPage.innerHTML = "";
  let i = 0;
  builderPage.append(makeBlock("bp-nav", "Logo · Menu", i++));
  builderPage.append(makeBlock("bp-hero", BUILDER_HERO[builder.type], i++));

  Object.keys(BUILDER_SECTIONS).forEach((key) => {
    if (!builder.sections.includes(key)) return;
    const s = BUILDER_SECTIONS[key];
    if (s.kind === "tiles") {
      const row = makeBlock("bp-tiles", "", i++);
      for (let n = 0; n < 3; n++) {
        const tile = document.createElement("i");
        if (n === 0) tile.textContent = s.label; // label the first tile only
        row.append(tile);
      }
      builderPage.append(row);
    } else {
      builderPage.append(makeBlock("bp-block", s.label, i++));
    }
  });

  builderPage.append(makeBlock("bp-footer", "", i++));
}

if (builderPage) {
  typePills.forEach((pill) =>
    pill.addEventListener("click", () => {
      builder.type = pill.dataset.type;
      builder.sections = [...BUILDER_DEFAULTS[builder.type]];
      renderBuilder();
    }),
  );
  sectionPills.forEach((pill) =>
    pill.addEventListener("click", () => {
      const key = pill.dataset.section;
      builder.sections = builder.sections.includes(key)
        ? builder.sections.filter((s) => s !== key)
        : [...builder.sections, key];
      renderBuilder();
    }),
  );
  builder.sections = [...BUILDER_DEFAULTS[builder.type]];
  renderBuilder();
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
