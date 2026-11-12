// ===== QUESTIONS (add new ones to this list) =====
// type: "single" = pick one, "multi" = pick any
// showIf: optional rule, the question only appears when it returns true
const PLAN_OPTIONS = [
  { value: "biweekly", label: "Bi-weekly", desc: "Pay every two weeks." },
  { value: "monthly", label: "Monthly", desc: "Pay once a month." },
  {
    value: "3months",
    label: "Every 3 months",
    desc: "Pay once every three months.",
  },
  { value: "6months", label: "Every 6 months", desc: "Pay twice a year." },
  { value: "yearly", label: "Yearly", desc: "Pay once a year." },
];

const RECOMMENDED_OPTIONS = [
  {
    value: "advancedSeo",
    label: "Advanced SEO",
    billing: "recurring",
    desc:
      "Keyword research, content updates, speed tuning and ranking checks. " +
      "Recurring payment, because search rankings need ongoing work to stay high.",
  },
  {
    value: "analytics",
    label: "Google Analytics setup",
    billing: "once",
    desc: "See how many people visit your site and where they come from. One-time setup.",
  },
  {
    value: "socials",
    label: "Social media setup",
    billing: "once",
    desc: "Business social accounts created and linked to your site. One-time setup.",
  },
];

const QUESTIONS = [
  {
    id: "knowledge",
    type: "single",
    title: "How much do you know about web development?",
    help: "There are no wrong answers. This just helps me explain things at the right level.",
    required: true,
    options: [
      {
        value: "none",
        label: "None",
        desc: "I'm new to this. Explain things to me.",
      },
      {
        value: "little",
        label: "Little",
        desc: "I know some of the basics, like what a domain is.",
      },
      {
        value: "enough",
        label: "Enough",
        desc: "I'm comfortable with hosting and websites.",
      },
    ],
  },
  {
    id: "recommended",
    type: "multi",
    title: "Recommended services",
    help: "These are optional, but they help your site get found and grow. Pick any that suit you, or none.",
    required: false,
    options: RECOMMENDED_OPTIONS,
  },
  {
    id: "paymentPlan",
    type: "single",
    title: "How would you like to pay for recurring services?",
    help: "Recurring services are billed separately from your website build. Pick the plan that suits you.",
    required: true,
    options: PLAN_OPTIONS,
    showIf: (answers) => hasRecurring(answers),
  },
];

// ===== MANDATORY SERVICES (prices stay blank until research is done) =====
// billing: "once" = part of the primary payment (website build)
//          "recurring" = ongoing service, billed on the chosen plan
// Contact form is included free, so it is not listed.
const MANDATORY = [
  { name: "Domain", amount: null, billing: "once" },
  { name: "HTTPS and basic security", amount: null, billing: "once" },
  { name: "Basic SEO", amount: null, billing: "once" },
];

// Prices for recommended services (blank until research is done)
const PRICES = { advancedSeo: null, analytics: null, socials: null };

// ===== STATE =====
const SAVE_KEY = "jdsd-quiz";
let state = { index: 0, reached: 0, answers: {} };
let items = [];
let shownTotal = 0;
let onFinalScreen = false; // true while the "coming soon" screen shows

try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved) state = saved;
} catch (e) {
  /* saving is optional */
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {}
}

// ===== HELPERS =====
function hasRecurring(answers) {
  const chosen = answers.recommended || [];
  return RECOMMENDED_OPTIONS.some(
    (o) => o.billing === "recurring" && chosen.includes(o.value),
  );
}

function visibleQuestions() {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(state.answers));
}

function isAnswered(q) {
  const a = state.answers[q.id];
  if (q.type === "multi") return Array.isArray(a) && a.length > 0;
  return a !== undefined;
}

function clampPosition() {
  const last = visibleQuestions().length - 1;
  if (state.index > last) state.index = last;
  if (state.reached > last) state.reached = last;
}
clampPosition();

// ===== ELEMENTS =====
const stage = document.getElementById("stage");
const stepsEl = document.getElementById("steps");
const progressFill = document.getElementById("progressFill");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const toolbar = document.getElementById("toolbar");
const counter = document.getElementById("counter");

// Smaller recurring line under the minimised counter (hidden when expanded)
const recurringLine = document.createElement("div");
recurringLine.id = "recurringLine";
recurringLine.style.cssText =
  "display:none;padding:0 1.1rem 0.8rem;font-size:0.85rem;color:var(--green);font-weight:600;";
document.getElementById("counterHead").after(recurringLine);

// ===== TOOLBAR =====
function renderToolbar() {
  const visible = visibleQuestions();
  stepsEl.innerHTML = "";
  for (let i = 0; i <= state.reached && i < visible.length; i++) {
    const q = visible[i];
    const li = document.createElement("li");
    li.className =
      "step " + (isAnswered(q) ? "done" : q.required ? "required" : "optional");
    if (i === state.index && !onFinalScreen) li.classList.add("current");
    li.dataset.index = i;
    li.innerHTML =
      '<span class="step-dot"></span><span>' +
      q.title.replace(/\?$/, "") +
      "</span>";
    li.addEventListener("click", () => goTo(i));
    stepsEl.appendChild(li);
  }
  const done = visible.filter(isAnswered).length;
  progressFill.style.width = (done / visible.length) * 100 + "%";
}

// ===== QUESTION WINDOW =====
function isChosen(q, value) {
  const a = state.answers[q.id];
  return q.type === "multi"
    ? Array.isArray(a) && a.includes(value)
    : a === value;
}

function renderQuestion(direction) {
  const q = visibleQuestions()[state.index];

  stage.innerHTML =
    '<div class="q-card"><h1>' +
    q.title +
    '</h1><p class="help">' +
    q.help +
    "</p>" +
    '<div class="options">' +
    q.options
      .map((o) => {
        const badge = o.billing
          ? ' <span class="tag" style="font-size:0.75rem;color:var(--gold)">' +
            (o.billing === "recurring" ? "Recurring" : "One-time") +
            " · Recommended</span>"
          : "";
        return (
          '<button class="option' +
          (isChosen(q, o.value) ? " selected" : "") +
          '" data-value="' +
          o.value +
          '"><strong>' +
          o.label +
          badge +
          "</strong>" +
          o.desc +
          "</button>"
        );
      })
      .join("") +
    "</div></div>";

  stage.classList.remove("in-left", "in-right", "out-left", "out-right");
  void stage.offsetWidth; // restart the animation
  stage.classList.add(direction === "back" ? "in-left" : "in-right");

  stage
    .querySelectorAll(".option")
    .forEach((btn) =>
      btn.addEventListener("click", () => answer(q, btn.dataset.value)),
    );

  // Back is always usable: on the first question it returns home
  backBtn.disabled = false;
  backBtn.textContent = state.index === 0 ? "Home" : "Back";
  nextBtn.disabled = false;
  nextBtn.textContent = "Next";
}

function answer(q, value) {
  if (q.type === "multi") {
    const list = Array.isArray(state.answers[q.id]) ? state.answers[q.id] : [];
    state.answers[q.id] = list.includes(value)
      ? list.filter((v) => v !== value)
      : list.concat(value);
  } else {
    state.answers[q.id] = value;
  }

  // No recurring services left: drop the payment plan answer
  if (!hasRecurring(state.answers)) delete state.answers.paymentPlan;

  save();
  stage
    .querySelectorAll(".option")
    .forEach((b) =>
      b.classList.toggle("selected", isChosen(q, b.dataset.value)),
    );
  clampPosition();
  renderToolbar();
  updateCounter();
}

// ===== NAVIGATION =====
function swapTo(index, direction) {
  stage.classList.remove("in-left", "in-right");
  stage.classList.add(direction === "back" ? "out-right" : "out-left");
  setTimeout(() => {
    onFinalScreen = false;
    state.index = index;
    state.reached = Math.max(state.reached, index);
    save();
    renderToolbar();
    renderQuestion(direction);
  }, 200);
}

function goTo(i) {
  if (i === state.index && !onFinalScreen) return;
  swapTo(i, i < state.index || onFinalScreen ? "back" : "next");
}

function pulseMissing() {
  const card = stage.querySelector(".q-card");
  const step = stepsEl.querySelector('.step[data-index="' + state.index + '"]');
  [card, step].forEach((el) => {
    if (!el) return;
    el.classList.remove("pulse");
    void el.offsetWidth;
    el.classList.add("pulse");
    setTimeout(() => el.classList.remove("pulse"), 800);
  });
  // Phones: open the step list so the red step is visible
  if (window.innerWidth <= 800) toolbar.classList.add("open");
}

nextBtn.addEventListener("click", () => {
  const visible = visibleQuestions();
  const q = visible[state.index];
  if (q.required && !isAnswered(q)) {
    pulseMissing();
    return;
  }
  if (state.index < visible.length - 1) {
    swapTo(state.index + 1, "next");
  } else {
    showComingSoon();
  }
});

backBtn.addEventListener("click", () => {
  if (onFinalScreen) {
    swapTo(state.index, "back"); // back to the last question
  } else if (state.index > 0) {
    swapTo(state.index - 1, "back"); // previous question
  } else {
    window.location.href = "index.html"; // first question: go home
  }
});

function showComingSoon() {
  stage.classList.remove("in-left", "in-right");
  stage.classList.add("out-left");
  setTimeout(() => {
    onFinalScreen = true;
    stage.innerHTML =
      '<div class="q-card"><h1>Nice, your answers are saved</h1>' +
      '<p class="help">The next questions (site type, services and design) arrive in the next build step.</p></div>';
    stage.classList.remove("out-left");
    void stage.offsetWidth;
    stage.classList.add("in-right");
    backBtn.disabled = false;
    backBtn.textContent = "Back";
    nextBtn.disabled = true;
    renderToolbar();
  }, 200);
}

// ===== PRICE COUNTER =====
function format(n) {
  return "$" + n.toLocaleString();
}

function buildItems() {
  const list = MANDATORY.map((m) => ({ ...m, tag: "Mandatory" }));
  (state.answers.recommended || []).forEach((value) => {
    const o = RECOMMENDED_OPTIONS.find((x) => x.value === value);
    if (o)
      list.push({
        name: o.label,
        amount: PRICES[value],
        billing: o.billing,
        tag: "Recommended",
      });
  });
  return list;
}

function totalFor(billing) {
  return items
    .filter((it) => it.billing === billing)
    .reduce((sum, it) => sum + (it.amount || 0), 0);
}

function recurringAmount() {
  const recurring = items.filter((it) => it.billing === "recurring");
  return recurring.some((it) => it.amount === null)
    ? "TBD"
    : format(totalFor("recurring"));
}

function planLabel() {
  const plan = PLAN_OPTIONS.find((p) => p.value === state.answers.paymentPlan);
  return plan ? plan.label : "Plan not chosen yet";
}

function rowsFor(billing, small) {
  return items
    .filter((it) => it.billing === billing)
    .map(
      (it) =>
        "<li" +
        (small ? ' style="font-size:0.85rem"' : "") +
        "><span>" +
        it.name +
        ' <span class="tag">' +
        it.tag +
        "</span></span><span>" +
        (it.amount === null ? "TBD" : format(it.amount)) +
        "</span></li>",
    )
    .join("");
}

function renderBreakdown() {
  // 1. Primary payment
  let html =
    '<li style="border:0;padding-top:0.8rem;font-weight:700;color:var(--green)">' +
    "Primary payment (website build)</li>" +
    rowsFor("once", false);

  // 2. Gold line, then recurring payments
  if (items.some((it) => it.billing === "recurring")) {
    html +=
      '<li style="border:0;padding:0;margin:0.9rem 0 0.4rem;height:2px;background:var(--gold);border-radius:2px"></li>' +
      '<li style="border:0;align-items:center">' +
      '<span><strong style="color:var(--green)">Recurring payments</strong>' +
      '<br><span style="font-size:0.8rem;opacity:0.75">' +
      planLabel() +
      "</span></span>" +
      '<span style="font-size:1.2rem;font-weight:700;color:var(--green)">' +
      recurringAmount() +
      "</span>" +
      "</li>" +
      rowsFor("recurring", true);
  }

  document.getElementById("breakdown").innerHTML = html;
}

function updateRecurringLine() {
  const hasRec = items.some((it) => it.billing === "recurring");
  const open = counter.classList.contains("open");
  if (hasRec && !open) {
    recurringLine.textContent =
      "Recurring payment: " + recurringAmount() + " (" + planLabel() + ")";
    recurringLine.style.display = "block";
  } else {
    recurringLine.style.display = "none";
  }
}

// Count the primary payment from the old price to the new one, with a gold flash
function animateTotal() {
  const from = shownTotal;
  const to = totalFor("once");
  if (from === to) return;
  const el = document.getElementById("counterTotal");
  const start = performance.now();
  const duration = 700;

  counter.classList.remove("flash");
  void counter.offsetWidth;
  counter.classList.add("flash");

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    shownTotal = Math.round(from + (to - from) * eased);
    el.textContent = format(shownTotal);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function updateCounter() {
  items = buildItems();
  counter.querySelector(".counter-label").textContent =
    "Estimate (Primary payment)";
  renderBreakdown();
  updateRecurringLine();
  animateTotal();
}

// Testing only: set a price from the browser console
// Example: setPrice("advancedSeo", 100)
window.setPrice = (key, amount) => {
  if (key in PRICES) PRICES[key] = amount;
  else {
    const m = MANDATORY.find((x) => x.name === key);
    if (m) m.amount = amount;
  }
  updateCounter();
};

document.getElementById("counterHead").addEventListener("click", () => {
  const open = counter.classList.toggle("open");
  document.getElementById("counterHead").setAttribute("aria-expanded", open);
  updateRecurringLine(); // hide the small line while expanded
});

// ===== PHONE TOOLBAR TOGGLE =====
document.getElementById("toolbarToggle").addEventListener("click", () => {
  const open = toolbar.classList.toggle("open");
  document.getElementById("toolbarToggle").setAttribute("aria-expanded", open);
});

// ===== START =====
renderToolbar();
renderQuestion("next");
updateCounter();
