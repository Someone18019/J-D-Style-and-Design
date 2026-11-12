// Put the current year in the footer
document.getElementById("year").textContent = new Date().getFullYear();

// Fade cards and headings in as they scroll into view
const revealItems = document.querySelectorAll(".card, .social-card, h2");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 },
);

revealItems.forEach((item) => {
  item.classList.add("reveal");
  observer.observe(item);
});

// Glass panel grows from small to full size as you scroll
const panel = document.querySelector("main");

function updatePanel() {
  const top = panel.getBoundingClientRect().top;
  const screen = window.innerHeight;
  let progress = (screen - top) / (screen * 0.8);
  progress = Math.min(Math.max(progress, 0), 1); // keep between 0 and 1
  panel.style.setProperty("--p", progress);
}

window.addEventListener("scroll", updatePanel, { passive: true });
window.addEventListener("resize", updatePanel);
updatePanel();

// Estimate button: fade the page out, then open the quiz
const PAGE_FADE_MS = 600; // raise this for a longer pause

document.getElementById("startQuiz").addEventListener("click", (e) => {
  e.preventDefault();
  const target = e.currentTarget.getAttribute("href") || "quiz.html";
  document.body.style.transition =
    "opacity " +
    PAGE_FADE_MS +
    "ms ease, transform " +
    PAGE_FADE_MS +
    "ms ease";
  document.body.style.opacity = "0";
  document.body.style.transform = "translateY(-20px)";
  setTimeout(() => {
    window.location.href = target;
  }, PAGE_FADE_MS);
});

// If the visitor comes back with the browser's back button, show the page again
window.addEventListener("pageshow", () => {
  document.body.style.opacity = "";
  document.body.style.transform = "";
});
