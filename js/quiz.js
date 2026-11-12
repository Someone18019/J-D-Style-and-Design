// ===== PAGE FADE IN (matches the fade out on the home page) =====
const PAGE_FADE_MS = 600;
document.body.style.opacity = "0";
document.body.style.transition = "opacity " + PAGE_FADE_MS + "ms ease";
requestAnimationFrame(() =>
  requestAnimationFrame(() => {
    document.body.style.opacity = "1";
  }),
);

// Fade out, then go to another page
function leaveTo(url) {
  document.body.style.opacity = "0";
  setTimeout(() => {
    window.location.href = url;
  }, PAGE_FADE_MS);
}

// Coming back with the browser's back button: show the page again
window.addEventListener("pageshow", () => {
  document.body.style.opacity = "1";
});

// ===== OPTION LISTS =====
const PLAN_OPTIONS = [
  { value: "biweekly", label: "Bi-weekly", desc: "Pay every two weeks." },
  { value: "monthly", label: "Monthly", desc: "Pay once a month." },
  {
    value: "3months",
    label: "Every 3 months",
    desc: "Pay once every three months, with a discount.",
  },
  {
    value: "6months",
    label: "Every 6 months",
    desc: "Pay twice a year, with a bigger discount.",
  },
  {
    value: "yearly",
    label: "Yearly",
    desc: "Pay once a year, with a capped price.",
  },
];

// How many months each payment covers (bi-weekly = half a month)
const PLAN_MONTHS = {
  biweekly: 0.5,
  monthly: 1,
  "3months": 3,
  "6months": 6,
  yearly: 12,
};

// Plan discounts and caps (Jamaican dollars)
// 3 months: 27,000 - 2,000 = 25,000 | 6 months: 54,000 - 4,000 = 50,000 | yearly capped at 100,000
const PLAN_DISCOUNTS = { "3months": 2000, "6months": 4000 };
const PLAN_CAPS = { yearly: 100000 };

// Plans that unlock the free bonus (change this list to change the rule)
const BONUS_PLANS = ["6months", "yearly"];

const SITE_TYPE_OPTIONS = [
  {
    value: "personal",
    label: "Personal brand and portfolio",
    desc: "Show off your work and look professional online, for creatives, content creators, freelancers or job seekers.",
  },
  {
    value: "business",
    label: "Small business",
    desc: "For shops, salons, barbers, restaurants, mechanics and other local services.",
  },
  {
    value: "event",
    label: "Event or landing page",
    desc: "A single page for an event, a launch or a promotion.",
  },
  {
    value: "organisation",
    label: "Community or organisation",
    desc: "For churches, clubs, schools or charities.",
  },
  {
    value: "notsure",
    label: "Not sure yet",
    desc: "That's fine. Your other answers will help us work it out together.",
  },
];

// Recurring services are only offered to these site types
const RECURRING_SITE_TYPES = ["business", "organisation"];

// These site types get a single home page build
const ONE_PAGE_TYPES = ["event", "organisation"];

// "What is the site for?" options change with the site type
const PURPOSE_BY_TYPE = {
  personal: [
    {
      value: "showWork",
      label: "Show my work and projects",
      desc: "A gallery or showcase of what you've done.",
    },
    {
      value: "expertise",
      label: "Share my expertise and experience",
      desc: "Your skills, background and achievements.",
    },
    {
      value: "brand",
      label: "Build my personal brand",
      desc: "Look professional and memorable online.",
    },
    {
      value: "hired",
      label: "Get hired or contacted",
      desc: "Make it easy for clients or employers to reach you.",
    },
  ],
  business: [
    {
      value: "customers",
      label: "Get new customers",
      desc: "Help people find your business and choose you.",
    },
    {
      value: "details",
      label: "Share services, hours and prices",
      desc: "The details customers look for first.",
    },
    {
      value: "menu",
      label: "Show a menu or products",
      desc: "Let people see what you offer before they visit.",
    },
    {
      value: "contact",
      label: "Make it easy to get in touch",
      desc: "Calls, WhatsApp, email or a contact form.",
    },
  ],
  event: [
    {
      value: "eventDetails",
      label: "Share event details",
      desc: "Date, time, place and what to expect.",
    },
    {
      value: "signups",
      label: "Get sign-ups through a form",
      desc: "Collect names and contact details from attendees.",
    },
    {
      value: "promote",
      label: "Promote a launch or offer",
      desc: "One focused page to get attention fast.",
    },
  ],
  organisation: [
    {
      value: "news",
      label: "Share news and events",
      desc: "Keep members and visitors up to date.",
    },
    {
      value: "info",
      label: "Share information",
      desc: "Who you are, what you do and how to find you.",
    },
    {
      value: "members",
      label: "Attract members or volunteers",
      desc: "Help people join or get involved.",
    },
  ],
  notsure: [
    {
      value: "showWork",
      label: "Show my work",
      desc: "A gallery or showcase of what you've done.",
    },
    {
      value: "customers",
      label: "Get new customers or enquiries",
      desc: "Help people find you and get in touch.",
    },
    {
      value: "info",
      label: "Share information",
      desc: "Hours, services, news or details people need.",
    },
    {
      value: "brand",
      label: "Build my brand",
      desc: "Look professional and memorable online.",
    },
  ],
};

const RECOMMENDED_OPTIONS = [
  {
    value: "advancedSeo",
    label: "Advanced SEO",
    billing: "recurring",
    detail: "SEO monitoring, keyword updates and ranking checks",
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

// ===== QUESTIONS (add new ones to this list) =====
// type: "single" = pick one (moves on automatically), "multi" = pick any (press Next)
// options: a list, or a rule that builds the list from earlier answers
// showIf: optional rule, the question only appears when it returns true
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
    id: "siteType",
    type: "single",
    title: "What kind of website do you need?",
    help: "Pick the one closest to what you have in mind.",
    required: true,
    options: SITE_TYPE_OPTIONS,
  },
  {
    id: "purpose",
    type: "multi",
    title: "What is the site for?",
    help: "Pick everything that applies. Most sites do more than one job.",
    required: true,
    options: (answers) =>
      PURPOSE_BY_TYPE[answers.siteType] || PURPOSE_BY_TYPE.notsure,
  },
  {
    id: "recommended",
    type: "multi",
    title: "Recommended services",
    help: "These are optional, but they help your site get found and grow. Pick any that suit you, or none.",
    required: false,
    options: (answers) =>
      RECOMMENDED_OPTIONS.filter(
        (o) => o.billing !== "recurring" || offersRecurring(answers),
      ),
  },
  {
    id: "paymentPlan",
    type: "single",
    title: "How would you like to pay for recurring services?",
    help: "Recurring services are billed separately from your website build and start after your first month. Pick the plan that suits you.",
    required: true,
    options: PLAN_OPTIONS,
    showIf: (answers) => hasRecurring(answers),
  },
];

// ===== PLACEHOLDER PRICES (Jamaican dollars, based on 2026 market ranges) =====
// Swap these for your final prices later.

// Base website build, by site type
const BUILD_PRICES = {
  personal: 40000,
  business: 60000,
  event: 30000,
  organisation: 50000,
  notsure: 45000,
};

// billing: "once" = part of the primary payment (website build)
//          "recurring" = ongoing service, priced per month, billed on the chosen plan
// Contact form is included free, so it is not listed.
const MANDATORY = [
  { name: "Domain (1 year)", amount: 3000, billing: "once" },
  { name: "HTTPS and basic security", amount: 5000, billing: "once" },
  { name: "Basic SEO", amount: 8000, billing: "once" },
];

// Recommended services (Advanced SEO is a monthly price)
const PRICES = { advancedSeo: 9000, analytics: 5000, socials: 10000 };

// ===== STATE =====
// "flagged" = steps the client pressed Next past while empty (these show red or yellow)
const SAVE_KEY = "jdsd-quiz";
function freshState() {
  return { index: 0, reached: 0, answers: {}, flagged: [] };
}
let state = freshState();
let items = [];
let shownTotal = 0;
let onFinalScreen = false; // true while the end screen shows
let busy = false; // true while a question is sliding, so clicks wait

try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved) state = saved;
} catch (e) {
  /* saving is optional */
}
if (!state.answers) state.answers = {};
if (!Array.isArray(state.flagged)) state.flagged = [];
delete state.visited; // old setting, no longer used

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {}
}

// ===== HELPERS =====
function offersRecurring(answers) {
  return RECURRING_SITE_TYPES.includes(answers.siteType);
}

function hasRecurring(answers) {
  if (!offersRecurring(answers)) return false;
  const chosen = answers.recommended || [];
  return RECOMMENDED_OPTIONS.some(
    (o) => o.billing === "recurring" && chosen.includes(o.value),
  );
}

function getOptions(q) {
  return typeof q.options === "function" ? q.options(state.answers) : q.options;
}

function visibleQuestions() {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(state.answers));
}

function isAnswered(q) {
  const a = state.answers[q.id];
  if (q.type === "multi") return Array.isArray(a) && a.length > 0;
  return a !== undefined;
}

// Flag a step only if it is still empty when the client presses Next past it
function flagIfEmpty(q) {
  if (q && !isAnswered(q) && !state.flagged.includes(q.id))
    state.flagged.push(q.id);
}

// An earlier answer changed: every later step goes back to grey
function clearFlagsAfter(id) {
  const pos = QUESTIONS.findIndex((x) => x.id === id);
  const later = QUESTIONS.slice(pos + 1).map((x) => x.id);
  state.flagged = state.flagged.filter((f) => !later.includes(f));
}

// Remove answers that no longer fit, e.g. after the site type changes
function pruneAnswers() {
  QUESTIONS.forEach((q) => {
    const a = state.answers[q.id];
    if (a === undefined) return;
    const valid = getOptions(q).map((o) => o.value);
    if (q.type === "multi") {
      state.answers[q.id] = (Array.isArray(a) ? a : []).filter((v) =>
        valid.includes(v),
      );
    } else if (!valid.includes(a)) {
      delete state.answers[q.id];
    }
  });
  if (!hasRecurring(state.answers)) {
    delete state.answers.paymentPlan;
    state.flagged = state.flagged.filter((id) => id !== "paymentPlan");
  }
}

function clampPosition() {
  const last = visibleQuestions().length - 1;
  if (state.index > last) state.index = last;
  if (state.reached > last) state.reached = last;
}

pruneAnswers();
clampPosition();

// ===== ELEMENTS =====
const stage = document.getElementById("stage");
const stepsEl = document.getElementById("steps");
const progressFill = document.getElementById("progressFill");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const toolbar = document.getElementById("toolbar");
const counter = document.getElementById("counter");
const quizWindow = document.querySelector(".window");

// "← Home" link fades out too
const homeLink = document.querySelector(".home-link");
if (homeLink) {
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    leaveTo(homeLink.getAttribute("href") || "index.html");
  });
}

// Smaller recurring line under the minimised counter (hidden when expanded)
const recurringLine = document.createElement("div");
recurringLine.id = "recurringLine";
recurringLine.style.cssText =
  "display:none;padding:0 1.1rem 0.8rem;font-size:0.85rem;color:var(--green);font-weight:600;";
document.getElementById("counterHead").after(recurringLine);

// "Start over" button, top right of the question window
quizWindow.style.position = "relative";
const restartBtn = document.createElement("button");
restartBtn.id = "restartBtn";
restartBtn.textContent = "Start over";
restartBtn.style.cssText =
  "position:absolute;top:1.6rem;right:2rem;background:none;border:2px solid var(--gold);" +
  "color:var(--text);font:inherit;font-size:0.85rem;font-weight:600;padding:0.35rem 0.9rem;" +
  "border-radius:50px;cursor:pointer;";
restartBtn.addEventListener("click", restartQuiz);
quizWindow.appendChild(restartBtn);

// ===== THEMED CONFIRM BOX (replaces the browser pop-up) =====
// Returns a promise: true if they confirm, false if they cancel
function showConfirm(title, message, confirmText) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;" +
      "padding:1rem;background:rgba(0,30,15,0.55);backdrop-filter:blur(6px);" +
      "-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity 0.2s ease;";
    overlay.innerHTML =
      '<div role="dialog" aria-modal="true" style="background:var(--white);border-top:4px solid var(--gold);' +
      "border-radius:20px;padding:1.75rem;max-width:420px;width:100%;" +
      'box-shadow:0 20px 50px rgba(0,0,0,0.35);transform:scale(0.92);transition:transform 0.2s ease;">' +
      '<h2 style="color:var(--green);margin-bottom:0.5rem">' +
      title +
      "</h2>" +
      '<p style="margin-bottom:1.5rem;opacity:0.85">' +
      message +
      "</p>" +
      '<div style="display:flex;justify-content:flex-end;gap:0.75rem;flex-wrap:wrap">' +
      '<button class="nav-btn" data-choice="no">Cancel</button>' +
      '<button class="nav-btn primary" data-choice="yes">' +
      confirmText +
      "</button>" +
      "</div>" +
      "</div>";
    document.body.appendChild(overlay);
    const box = overlay.firstChild;

    // Fade and scale in
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      box.style.transform = "scale(1)";
    });

    function close(result) {
      overlay.style.opacity = "0";
      box.style.transform = "scale(0.92)";
      document.removeEventListener("keydown", onKey);
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    }

    function onKey(e) {
      if (e.key === "Escape") close(false);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return close(false); // clicked outside the box
      const choice = e.target.closest("[data-choice]");
      if (choice) close(choice.dataset.choice === "yes");
    });
    document.addEventListener("keydown", onKey);
    overlay.querySelector('[data-choice="no"]').focus();
  });
}

// ===== TOOLBAR =====
// Step colours: green = done, grey = not answered yet (including the current step),
// red = Next pressed while empty and required, yellow = Next pressed while empty and optional
function renderToolbar() {
  const visible = visibleQuestions();
  stepsEl.innerHTML = "";
  for (let i = 0; i <= state.reached && i < visible.length; i++) {
    const q = visible[i];
    const li = document.createElement("li");

    let status;
    if (isAnswered(q)) status = "done";
    else if (state.flagged.includes(q.id))
      status = q.required ? "required" : "optional";
    else status = "pending";

    li.className = "step " + status;
    if (i === state.index && !onFinalScreen) li.classList.add("current");
    li.dataset.index = i;
    li.innerHTML =
      '<span class="step-dot"></span><span>' +
      q.title.replace(/\?$/, "") +
      "</span>";

    // Neutral grey for steps not answered yet
    if (status === "pending") {
      li.style.borderLeftColor = "#c9d3ce";
      li.querySelector(".step-dot").style.background = "#c9d3ce";
    }

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
    getOptions(q)
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
  if (busy) return;
  const before = visibleQuestions().map((x) => x.id);
  const previous = JSON.stringify(state.answers[q.id]);

  if (q.type === "multi") {
    const list = Array.isArray(state.answers[q.id]) ? state.answers[q.id] : [];
    state.answers[q.id] = list.includes(value)
      ? list.filter((v) => v !== value)
      : list.concat(value);
  } else {
    state.answers[q.id] = value;
  }

  // Answer changed: later steps reset to grey
  if (JSON.stringify(state.answers[q.id]) !== previous) clearFlagsAfter(q.id);

  pruneAnswers();

  // A question was just unlocked: add it to the toolbar straight away (grey)
  visibleQuestions().forEach((x, i) => {
    if (!before.includes(x.id) && i > state.reached) state.reached = i;
  });

  save();
  stage
    .querySelectorAll(".option")
    .forEach((b) =>
      b.classList.toggle("selected", isChosen(q, b.dataset.value)),
    );
  clampPosition();
  renderToolbar();
  updateCounter();

  // Pick-one questions move on by themselves after a short pause
  if (q.type === "single") {
    busy = true;
    setTimeout(() => {
      busy = false;
      goNext();
    }, 350);
  }
}

// ===== NAVIGATION =====
function swapTo(index, direction) {
  // Only moving forward checks the step being left
  if (!onFinalScreen && direction === "next")
    flagIfEmpty(visibleQuestions()[state.index]);

  busy = true;
  stage.classList.remove("in-left", "in-right");
  stage.classList.add(direction === "back" ? "out-right" : "out-left");
  setTimeout(() => {
    onFinalScreen = false;
    state.index = index;
    state.reached = Math.max(state.reached, index);
    save();
    renderQuestion(direction);
    renderToolbar();
    busy = false;
  }, 200);
}

function goTo(i) {
  if (busy) return;
  if (i === state.index && !onFinalScreen) return;
  swapTo(i, i < state.index || onFinalScreen ? "back" : "next");
}

function goNext() {
  const visible = visibleQuestions();
  const q = visible[state.index];
  if (q.required && !isAnswered(q)) {
    pulseMissing();
    return;
  }
  if (state.index < visible.length - 1) {
    swapTo(state.index + 1, "next");
  } else {
    showEndScreen();
  }
}

function pulseMissing() {
  // Tried to move on without answering: this step now shows red
  flagIfEmpty(visibleQuestions()[state.index]);
  save();
  renderToolbar();

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

// ===== START OVER =====
async function restartQuiz() {
  if (busy) return;
  const ok = await showConfirm(
    "Start over?",
    "This clears all of your answers and takes you back to the first question.",
    "Yes, start over",
  );
  if (!ok) return;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {}

  busy = true;
  stage.classList.remove("in-left", "in-right");
  stage.classList.add("out-right");
  setTimeout(() => {
    state = freshState();
    onFinalScreen = false;
    toolbar.classList.remove("open");
    renderQuestion("back");
    renderToolbar();
    updateCounter();
    busy = false;
  }, 200);
}

// Next button: on the end screen it becomes "Start over"
nextBtn.addEventListener("click", () => {
  if (busy) return;
  if (onFinalScreen) restartQuiz();
  else goNext();
});

backBtn.addEventListener("click", () => {
  if (busy) return;
  if (onFinalScreen) {
    swapTo(state.index, "back"); // back to the last question
  } else if (state.index > 0) {
    swapTo(state.index - 1, "back"); // previous question
  } else {
    leaveTo("index.html"); // first question: fade out and go home
  }
});

// ===== END SCREEN: what's included, built from the answers =====
function sectionHead(title, sub) {
  return (
    '<h3 style="color:var(--green);margin:1.1rem 0 0.4rem">' +
    title +
    (sub
      ? ' <span style="font-size:0.85rem;font-weight:600;opacity:0.7">(' +
        sub +
        ")</span>"
      : "") +
    "</h3>"
  );
}

function goldLine() {
  return '<div style="height:2px;background:var(--gold);border-radius:2px;margin:1rem 0 0.2rem"></div>';
}

function listOf(lines) {
  return (
    '<ul style="padding-left:1.2rem;display:grid;gap:0.4rem">' +
    lines.map((t) => "<li>" + t + "</li>").join("") +
    "</ul>"
  );
}

function tagText(tag) {
  return (
    ' <span style="font-size:0.8rem;color:var(--gold);font-weight:600">' +
    tag +
    "</span>"
  );
}

// Gold-edged warning box for things NOT covered by the primary payment
function noticeBox(html) {
  return (
    '<div style="margin-top:0.9rem;padding:0.75rem 0.9rem;background:#fbf4e2;' +
    'border-left:4px solid var(--gold);border-radius:10px;font-size:0.9rem">' +
    html +
    "</div>"
  );
}

function bonusLines() {
  const lines = [];
  const plan = state.answers.paymentPlan;
  if (plan && BONUS_PLANS.includes(plan)) {
    lines.push(
      "<strong>Plan bonus:</strong> your " +
        planLabel().toLowerCase() +
        " plan unlocks one free event or seasonal update.",
    );
  } else if (plan) {
    lines.push(
      "<strong>Plan bonus:</strong> switch to a 6-month or yearly plan to unlock one free event or seasonal update.",
    );
  }
  lines.push(
    "<strong>Returning customers</strong> get a discount on future projects and/or updates.",
  );
  return lines;
}

function buildSummary() {
  const once = items.filter((it) => it.billing === "once");
  const recurring = items.filter((it) => it.billing === "recurring");

  // 1. Primary payment
  let html =
    sectionHead("Primary payment", "one-time fee") +
    listOf(
      once
        .map((it) => "<strong>" + it.name + "</strong>" + tagText(it.tag))
        .concat([
          "<strong>Contact form on your site</strong>" + tagText("Included"),
          "<strong>Two revisions</strong>" + tagText("Included"),
        ]),
    );

  // Not part of the primary payment
  html += noticeBox(
    "<strong>Not included in the primary payment:</strong> extra revisions or bigger changes " +
      "are quoted separately and may be subject to additional fees.",
  );

  // 2. Recurring services (or a note about future updates)
  html += goldLine();
  if (recurring.length) {
    html +=
      sectionHead("Recurring services", planLabel()) +
      listOf(
        recurring
          .map((it) => {
            const o = RECOMMENDED_OPTIONS.find((x) => x.label === it.name);
            return (
              "<strong>" +
              it.name +
              "</strong>" +
              (o && o.detail ? ": " + o.detail : "") +
              tagText(it.tag)
            );
          })
          .concat([
            "Recurring payments start after your first month and are billed separately from the primary payment.",
            "<strong>Event and seasonal updates</strong> can be added to your plan when you need them.",
          ]),
      );
  } else {
    html +=
      sectionHead("Future updates", "optional") +
      listOf([
        "Events or seasonal changes can be added later as a one-off job, or done regularly with a subscription.",
      ]);
  }

  // 3. Bonuses
  html += goldLine() + sectionHead("Bonuses") + listOf(bonusLines());
  return html;
}

function showEndScreen() {
  flagIfEmpty(visibleQuestions()[state.index]);
  busy = true;
  stage.classList.remove("in-left", "in-right");
  stage.classList.add("out-left");
  setTimeout(() => {
    onFinalScreen = true;
    save();
    stage.innerHTML =
      '<div class="q-card"><h1>Your answers are saved</h1>' +
      '<p class="help">Check your estimate in the bottom right corner, or refer to the sidebar on your left to revisit your answers.</p>' +
      '<h2 style="color:var(--green);font-size:1.3rem;margin-top:1rem">What\'s included</h2>' +
      buildSummary() +
      "</div>";
    stage.classList.remove("out-left");
    void stage.offsetWidth;
    stage.classList.add("in-right");
    backBtn.disabled = false;
    backBtn.textContent = "Back";
    nextBtn.disabled = false;
    nextBtn.textContent = "Start over"; // Next becomes Start over on the last page
    renderToolbar();
    busy = false;
  }, 200);
}

// ===== PRICE COUNTER =====
function format(n) {
  return "J$" + n.toLocaleString();
}

function roundHundred(n) {
  return Math.round(n / 100) * 100;
}

function buildItems() {
  const list = [];

  // Base website build, once the site type is known
  const type = state.answers.siteType;
  if (type && BUILD_PRICES[type] !== undefined) {
    list.push({
      name: ONE_PAGE_TYPES.includes(type)
        ? "Website build (home page)"
        : "Website build (home page plus one or two additional pages)",
      amount: BUILD_PRICES[type],
      billing: "once",
      tag: "Base",
    });
  }

  MANDATORY.forEach((m) => list.push({ ...m, tag: "Mandatory" }));

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

// Recurring total for the chosen plan:
// monthly price x months, minus any discount, capped, rounded to the nearest hundred
function recurringAmount() {
  const recurring = items.filter((it) => it.billing === "recurring");
  if (recurring.some((it) => it.amount === null)) return "TBD";
  const monthly = totalFor("recurring");
  const plan = state.answers.paymentPlan;
  const months = PLAN_MONTHS[plan];
  if (!months) return format(monthly) + "/mo";

  let amount = monthly * months - (PLAN_DISCOUNTS[plan] || 0);
  if (PLAN_CAPS[plan]) amount = Math.min(amount, PLAN_CAPS[plan]);
  return format(roundHundred(amount));
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
        (it.amount === null
          ? "TBD"
          : format(it.amount) + (billing === "recurring" ? "/mo" : "")) +
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
      ", starts after the first month</span></span>" +
      '<span style="font-size:1.2rem;font-weight:700;color:var(--green)">' +
      recurringAmount() +
      "</span>" +
      "</li>" +
      rowsFor("recurring", true);
  }

  // 3. Placeholder note
  html +=
    '<li style="border:0;font-size:0.75rem;opacity:0.65;padding-top:0.6rem">' +
    "Placeholder prices in Jamaican dollars, based on 2026 market ranges.</li>";

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

// Testing only: change a price from the browser console
// Example: setPrice("advancedSeo", 12000)
window.setPrice = (key, amount) => {
  if (key in PRICES) PRICES[key] = amount;
  else if (key in BUILD_PRICES) BUILD_PRICES[key] = amount;
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
renderQuestion("next");
renderToolbar();
updateCounter();
