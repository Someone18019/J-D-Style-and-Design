// ===== CLIENT PORTAL (demo) =====
// Clients sign in with their client ID and the last 4 digits of their phone
// number, then see project progress, payments due, payment history and refunds.
// DEMO ONLY: the check runs against data saved in this browser, so it is not
// real security. A live version needs a server with proper logins.

const { esc, money, niceDate, niceTime } = Store;
const portal = document.getElementById("portal");
const SESSION_KEY = "jdsd-portal";

function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
}

function signedIn() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch (e) {
    return null;
  }
}
function setSession(id) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch (e) {}
}

const STATUS = {
  sent: "Due",
  viewed: "Due",
  processing: "Awaiting confirmation",
  paid: "Paid",
  refundRequested: "Refund requested",
  partRefunded: "Part refunded",
  refunded: "Refunded",
  void: "Cancelled",
};
function chip(inv) {
  const st = Store.displayStatus(inv);
  const cls = { sent: "sent", viewed: "sent" }[st] || st;
  return "<span class='chip " + esc(cls) + "'>" + esc(STATUS[st] || st) + "</span>";
}

// ===== SIGN IN =====
function renderLogin(error) {
  portal.innerHTML =
    "<header class='portal-top'><a href='index.html' class='portal-brand'>JD-Style <span class='gold'>and</span> Design</a>" +
    "<a href='quiz.html' class='btn ghost small'>Start a new build</a></header>" +
    // method=post: even if the script fails, the ID and PIN never end up in the address bar
    "<form class='glass login' id='loginForm' method='post' action='#' novalidate>" +
    "<h1>Client login</h1><p class='hint'>Check your project's progress, make payments and see your payment and refund status.</p>" +
    "<label class='field'>Client ID<input name='clientId' placeholder='JD-XXXXXX' autocomplete='username' autocapitalize='characters'></label>" +
    "<label class='field'>Last 4 digits of your phone number<input name='pin' inputmode='numeric' maxlength='4' autocomplete='off'></label>" +
    "<p class='form-error' role='alert'>" + esc(error || "") + "</p>" +
    "<button class='btn' type='submit'>Log in</button>" +
    "<p class='hint small'>Your client ID was given when you saved your details at the end of the quiz. " +
    "Lost it? <a href='https://wa.me/18765060220' target='_blank' rel='noopener'>Message us on WhatsApp</a>.</p>" +
    "<p class='demo-note'>Demo: you can only log in on the device where your client ID was created.</p></form>";
  portal.querySelector("[name=clientId]").focus();
}

portal.addEventListener("submit", (e) => {
  e.preventDefault(); // the only form on this page is the login form
  if (e.target.getAttribute("id") !== "loginForm") return;
  const f = e.target;
  const id = f.elements.clientId.value.trim().toUpperCase().replace(/^JD(?!-)/, "JD-");
  const pin = f.elements.pin.value.trim();
  const c = Store.load().clients.find((x) => x.id === id);
  const digits = c ? c.phone.replace(/\D/g, "") : "";
  if (!c || pin.length !== 4 || digits.slice(-4) !== pin) {
    return renderLogin("That client ID and phone number don't match. Please check and try again.");
  }
  setSession(c.id);
  render();
});

// ===== PORTAL =====
function render() {
  const id = signedIn();
  const data = Store.load();
  const c = id && data.clients.find((x) => x.id === id);
  if (!c) return renderLogin();

  const invs = data.invoices.filter((i) => i.clientId === c.id && i.status !== "draft");
  const project = data.invoices.filter((i) => i.clientId === c.id && i.kind === "project").sort((a, b) => a.stage - b.stage);
  const subs = data.subscriptions.filter((s) => s.clientId === c.id);
  const due = invs.filter((i) => ["sent", "viewed"].includes(i.status));
  const waiting = invs.filter((i) => i.status === "processing");
  const paid = invs.filter((i) => i.status === "paid");

  const refundedTotal = paid.reduce((s, i) => s + (i.refunds || []).reduce((a, x) => a + x.amount, 0), 0);
  const paidTotal = paid.reduce((s, i) => s + Store.totals(i).total, 0) - refundedTotal;
  const projectTotal = project.length ? Store.totals(project[0]).projectTotal : 0;
  const projectPaid = project.filter((i) => i.status === "paid").reduce((s, i) => s + Store.totals(i).total, 0);
  const nextDue = due.slice().sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))[0];

  portal.innerHTML =
    "<header class='portal-top'><a href='index.html' class='portal-brand'>JD-Style <span class='gold'>and</span> Design</a>" +
    "<button class='btn ghost small' id='logout'>Log out</button></header>" +
    "<section class='hello'><h1>Hi, " + esc(c.name || c.business) + "</h1>" +
    "<p class='hint'>" + esc([c.business && c.name ? c.business : "", c.siteType].filter(Boolean).join(" · ")) + "</p>" +
    "<p class='fine'>Client ID: " + esc(c.id) + "</p></section>" +
    "<section class='stats'>" +
    stat("Project total", projectTotal ? money(projectTotal) : "Being quoted", projectTotal ? Math.round((projectPaid / projectTotal) * 100) + "% paid" : "we'll confirm your price") +
    stat("Paid so far", money(paidTotal), refundedTotal ? money(refundedTotal) + " refunded" : paid.length + " payment(s)") +
    stat("Due now", money(due.reduce((s, i) => s + Store.totals(i).total, 0)), due.length ? due.length + " invoice(s)" : "nothing due") +
    stat("Next payment", nextDue ? money(Store.totals(nextDue).total) : "None", nextDue ? "due " + niceDate(nextDue.dueDate) : "you're all caught up") +
    "</section>" +
    projectHTML(c, project) +
    (due.length || waiting.length
      ? "<section class='section glass'><h2>Payments due</h2><div class='pay-list'>" +
        due.map((i) => dueCard(i)).join("") + waiting.map((i) => dueCard(i)).join("") + "</div></section>"
      : "") +
    upcomingHTML(project) +
    subsHTML(subs, data) +
    historyHTML(paid, data.settings) +
    "<p class='hint center'>Questions about your project? <a href='https://wa.me/18765060220' target='_blank' rel='noopener'>Message us on WhatsApp</a> · " +
    "<a href='terms.html'>Terms and Conditions</a></p>";
}

function stat(label, value, sub) {
  return "<div class='stat glass'><span>" + esc(label) + "</span><strong>" + esc(value) + "</strong><span>" + esc(sub) + "</span></div>";
}

// Project progress: request saved > work started > halfway > final paid > handed over
function projectHTML(c, project) {
  const paidStage = (n) => project[n] && project[n].status === "paid";
  const steps = [
    { label: "Request saved", done: true },
    { label: "Work started", done: paidStage(0), note: "after the commitment fee" },
    { label: "Halfway", done: paidStage(1), note: "half-completion payment" },
    { label: "Final payment", done: paidStage(2) },
    { label: "Site handed over", done: paidStage(2) },
  ];
  let at = 0;
  steps.forEach((s, i) => s.done && (at = i));
  const status = !project.length
    ? "We're preparing your quote. Your first invoice (the commitment fee) will appear here."
    : at === 0
      ? "Pay the commitment fee to start work on your site."
      : at === 1
        ? "Work on your site has started."
        : at === 2
          ? "Your site is halfway done."
          : "Your site is complete and ownership has been handed over to you.";
  return (
    "<section class='section glass'><div class='view-head'><h2>Project progress</h2></div>" +
    "<ol class='progress" + (at === 4 ? " paid" : "") + "'>" +
    steps.map((s, i) => "<li class='" + (s.done ? "done" : "") + (i === at ? " current" : "") + "'>" + esc(s.label) + "</li>").join("") +
    "</ol><p class='status-line'>" + esc(status) + "</p></section>"
  );
}

function dueCard(i) {
  const t = Store.totals(i);
  const kind = Store.kindLabel(i) || "Invoice";
  const waiting = i.status === "processing";
  return (
    "<article class='pay-card" + (waiting ? " waiting" : "") + "'><div><b>" + esc(kind) + "</b>" +
    "<span class='hint'>" + esc(i.id) + " · " + (waiting ? "submitted, we'll confirm soon" : "due " + esc(niceDate(i.dueDate))) + "</span></div>" +
    "<div class='pay-right'><strong>" + money(t.total) + "</strong>" +
    (waiting ? chip(i) : "<a class='btn small' href='invoice.html?id=" + encodeURIComponent(i.id) + "'>Pay now</a>") +
    "</div></article>"
  );
}

// Project payments not invoiced yet (drafts): show the amount and when it's due
function upcomingHTML(project) {
  const later = project.filter((i) => i.status === "draft");
  if (!later.length) return "";
  return (
    "<section class='section glass'><h2>Coming up</h2><div class='pay-list'>" +
    later
      .map((i) => {
        const st = Store.SCHEDULE[i.stage];
        return (
          "<article class='pay-card muted'><div><b>" + esc(Store.kindLabel(i)) + "</b><span class='hint'>" + esc(st.when) +
          "</span></div><div class='pay-right'><strong>" + money(Store.totals(i).total) + "</strong></div></article>"
        );
      })
      .join("") +
    "</div></section>"
  );
}

function subsHTML(subs) {
  if (!subs.length) return "";
  return (
    "<section class='section glass'><h2>Recurring services</h2><div class='pay-list'>" +
    subs
      .map((s) => {
        const bill = Store.cycleBill(s.items, s.cycle);
        return (
          "<article class='pay-card muted'><div><b>" + esc(s.items.map((x) => x.name).join(", ")) + "</b>" +
          "<span class='hint'>" + esc(Store.CYCLES[s.cycle].label) + " · " +
          (s.active ? "next invoice " + esc(niceDate(s.nextDate)) : "paused") + "</span></div>" +
          "<div class='pay-right'><strong>" + money(bill.amount) + "</strong></div></article>"
        );
      })
      .join("") +
    "</div></section>"
  );
}

// Paid invoices: receipt links, refund status, and a way to ask for a refund
function historyHTML(paid, settings) {
  if (!paid.length) return "";
  return (
    "<section class='section glass'><h2>Payment history</h2><div class='table-wrap'><table class='list'>" +
    "<thead><tr><th>Payment</th><th>Paid</th><th>Status</th><th class='num'>Amount</th><th></th></tr></thead><tbody>" +
    paid
      .sort((a, b) => (b.payment.paidAt > a.payment.paidAt ? 1 : -1))
      .map((i) => {
        const r = Store.refundInfo(i, settings);
        const req = i.refundRequest;
        let refund = "";
        if (r.refunded) refund = money(r.refunded) + " refunded";
        if (req && !req.closed) refund = "Refund requested " + niceDate(req.at);
        else if (req && req.outcome === "declined") refund = "Refund request declined";
        else if (!r.refunded && r.eligible) refund = "Refund available until " + niceDate(r.deadline);
        else if (!r.refunded && r.why && r.why !== "Fully refunded") refund = r.why;
        return (
          "<tr><td><b>" + esc(Store.kindLabel(i) || "Invoice") + "</b><div class='hint'>" + esc(i.id) + " · " +
          esc(Store.METHODS[i.payment.method] || i.payment.method) + "</div>" + (refund ? "<div class='refund-note'>" + esc(refund) + "</div>" : "") +
          "</td><td>" + esc(niceDate(i.payment.paidAt)) + "</td><td>" + chip(i) + "</td><td class='num'>" + money(Store.totals(i).total) +
          "</td><td class='num'><a href='invoice.html?id=" + encodeURIComponent(i.id) + "'>" + (r.eligible && !(req && !req.closed) ? "Receipt / refund" : "Receipt") + "</a></td></tr>"
        );
      })
      .join("") +
    "</tbody></table></div></section>"
  );
}

portal.addEventListener("click", (e) => {
  if (e.target.id === "logout") {
    setSession(null);
    toast("Logged out");
    renderLogin();
  }
});

// Updates made elsewhere (a payment confirmed on the dashboard) show straight away
window.addEventListener("storage", (e) => {
  if (e.key === Store.KEY && signedIn()) render();
});

render();
