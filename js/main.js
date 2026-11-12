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

// Estimate button opens the quiz page
document.getElementById("startQuiz").addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "quiz.html";
});
