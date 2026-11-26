// ===== DASHBOARD (demo) =====
// Views: #overview, #invoices, #invoice/INV-1001, #subscriptions, #clients,
//        #pricing, #settings, #search/<words>
// Data lives in js/store.js. Client pages (invoice.html) update the same data,
// and this page redraws live when that happens (the browser's "storage" event).

const { esc, money, niceDate, niceTime } = Store;
const main = document.getElementById("main");
let seenEvents = {}; // invoice id -> number of events, to spot new activity

// ===== SMALL HELPERS =====
function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ===== DIALOG: asks a question in the page (instead of browser pop-ups) =====
// fields: [{ name, label, type: "text" | "number" | "select" | "textarea", value, options }]
// Resolves with the entered values, or null if cancelled.
function dialog({ title, text = "", fields = [], ok = "OK", danger = false }) {
  return new Promise((resolve) => {
    const back = document.createElement("div");
    back.className = "modal-back";
    const input = (f) => {
      if (f.type === "select")
        return "<select name='" + esc(f.name) + "'>" + f.options.map((o) =>
          "<option value='" + esc(o.value) + "'" + (o.value === f.value ? " selected" : "") + ">" + esc(o.label) + "</option>").join("") + "</select>";
      if (f.type === "textarea") return "<textarea name='" + esc(f.name) + "'>" + esc(f.value || "") + "</textarea>";
      return "<input name='" + esc(f.name) + "' type='" + (f.type || "text") + "' value='" + esc(f.value ?? "") + "'" +
        (f.type === "number" ? " min='0' step='any'" : "") + ">";
    };
    back.innerHTML =
      "<form class='modal glass' role='dialog' aria-modal='true' aria-labelledby='modalTitle'>" +
      "<h2 id='modalTitle'>" + esc(title) + "</h2>" + (text ? "<p class='hint'>" + esc(text) + "</p>" : "") +
      fields.map((f) => "<label class='field'>" + esc(f.label) + input(f) + "</label>").join("") +
      "<div class='btn-row'><button class='btn" + (danger ? " danger" : "") + "' type='submit'>" + esc(ok) + "</button>" +
      "<button class='btn ghost' type='button' data-cancel>Cancel</button></div></form>";
    document.body.appendChild(back);
    const form = back.querySelector("form");
    const before = document.activeElement;
    (form.querySelector("input, select, textarea") || form.querySelector("button")).focus();
    const close = (value) => {
      back.classList.add("closing");
      setTimeout(() => back.remove(), 180);
      document.removeEventListener("keydown", onKey);
      if (before && before.focus) before.focus();
      resolve(value);
    };
    const onKey = (e) => e.key === "Escape" && close(null);
    document.addEventListener("keydown", onKey);
    back.addEventListener("click", (e) => {
      if (e.target === back || e.target.closest("[data-cancel]")) close(null);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const out = {};
      fields.forEach((f) => (out[f.name] = form.elements[f.name].value.trim()));
      close(out);
    });
  });
}
const askConfirm = (title, text, ok, danger) => dialog({ title, text, ok: ok || "Yes", danger }).then((v) => v !== null);

const STATUS_TEXT = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  processing: "Payment submitted",
  paid: "Paid",
  void: "Void",
  refundRequested: "Refund requested",
  partRefunded: "Part refunded",
  refunded: "Refunded",
};
// Pass an invoice (shows refunds too) or a status word
function chip(x) {
  const status = typeof x === "string" ? x : Store.displayStatus(x);
  return "<span class='chip " + esc(status) + "'>" + esc(STATUS_TEXT[status] || status) + "</span>";
}

function progressHTML(inv) {
  const at = Store.progressIndex(inv);
  return (
    "<ol class='progress" + (inv.status === "paid" ? " paid" : "") + "'>" +
    Store.PROGRESS.map(
      (p, i) =>
        "<li class='" + (i <= at ? "done" : "") + (i === at ? " current" : "") + "'>" + p.label + "</li>",
    ).join("") +
    "</ol>"
  );
}

// Small grey label: "Commitment fee · 15%" or "Monthly · Dec 1 – Dec 31"
function kindTag(inv) {
  const k = Store.kindLabel(inv);
  return k ? "<div class='kind'>" + esc(k) + "</div>" : "";
}

function clientOf(data, id) {
  return data.clients.find((c) => c.id === id);
}

function clientLink(inv) {
  return new URL("invoice.html?id=" + encodeURIComponent(inv.id), location.href).href;
}

function lastEvent(inv) {
  return inv.events[inv.events.length - 1];
}

// ===== ROUTER =====
function route() {
  const hash = location.hash.slice(1) || "overview";
  const [view, arg] = hash.split("/");
  document.querySelectorAll(".side-nav a").forEach((a) => {
    const v = view === "invoice" ? "invoices" : view;
    a.classList.toggle("active", a.dataset.view === v);
  });
  const data = Store.load();
  if (view === "invoice" && arg) renderEditor(data, decodeURIComponent(arg));
  else if (view === "invoices") renderInvoices(data);
  else if (view === "clients") renderClients(data);
  else if (view === "subscriptions") renderSubscriptions(data);
  else if (view === "pricing") renderPricing(data);
  else if (view === "settings") renderSettings(data);
  else if (view === "search") renderSearch(data, decodeURIComponent(arg || ""));
  else renderOverview(data);

  // Play the entrance animation only when moving to a different page
  const key = view === "search" ? "search" : hash;
  if (key !== lastViewKey) animateIn();
  lastViewKey = key;
}
let lastViewKey = "";
window.addEventListener("hashchange", route);

// ===== OVERVIEW: stats, live payment progress, activity =====
function renderOverview(data) {
  const live = data.invoices.filter((i) => !["draft", "void"].includes(i.status));
  const sum = (list) => list.reduce((s, i) => s + Store.totals(i).total, 0);
  const outstanding = live.filter((i) => i.status !== "paid");
  const waiting = live.filter((i) => i.status === "processing");
  const paid = live.filter((i) => i.status === "paid");
  const refundAsks = live.filter((i) => i.refundRequest && !i.refundRequest.closed);
  const refunded = paid.reduce((s, i) => s + (i.refunds || []).reduce((a, x) => a + x.amount, 0), 0);

  live.sort((a, b) => (lastEvent(b).at > lastEvent(a).at ? 1 : -1));

  const tracks = live.length
    ? live.map((inv) => trackHTML(data, inv)).join("")
    : "<p class='empty'>No invoices sent yet. Create one under Invoices, or load the sample data.</p>";

  const events = data.invoices
    .flatMap((inv) => inv.events.map((e) => ({ ...e, inv })))
    .sort((a, b) => (b.at > a.at ? 1 : -1))
    .slice(0, 12);

  main.innerHTML =
    "<header class='view-head'><div><h1>Overview</h1><p>Payments update here as clients pay.</p></div>" +
    "<a class='btn' href='#invoice/new'>+ New invoice</a></header>" +
    "<section class='stats'>" +
    stat("Outstanding", money(sum(outstanding)), outstanding.length + " invoice(s)") +
    stat("Awaiting your confirmation", waiting.length, money(sum(waiting))) +
    stat("Paid", money(sum(paid) - refunded), paid.length + " invoice(s)" + (refunded ? " · " + money(refunded) + " refunded" : "")) +
    stat("Refund requests", refundAsks.length, refundAsks.length ? "waiting for you" : "none open") +
    stat("Clients", data.clients.length, data.clients.filter((c) => c.source === "quiz").length + " from the quiz") +
    "</section>" +
    "<div class='overview-grid'>" +
    "<section class='section glass'><div class='view-head'><h2>Payment progress</h2><span class='live'>Live</span></div>" +
    "<div class='track-list'>" + tracks + "</div></section>" +
    "<section class='section glass'><h2>Recent activity</h2>" +
    (events.length
      ? "<ul class='feed'>" +
        events
          .map(
            (e) =>
              "<li><span><a href='#invoice/" + esc(e.inv.id) + "'>" + esc(e.inv.id) + "</a> " + esc(e.text) +
              "</span><time>" + esc(niceTime(e.at)) + "</time></li>",
          )
          .join("") +
        "</ul>"
      : "<p class='empty'>Nothing yet.</p>") +
    "</section></div>";
}

function stat(label, value, sub) {
  return (
    "<div class='stat glass'><span>" + esc(label) + "</span><strong>" + esc(value) +
    "</strong><span>" + esc(sub) + "</span></div>"
  );
}

function trackHTML(data, inv) {
  const c = clientOf(data, inv.clientId);
  const e = lastEvent(inv);
  const confirm =
    inv.status === "processing"
      ? "<div class='track-action btn-row'><button class='btn ok small' data-action='confirm' data-id='" +
        esc(inv.id) + "'>Confirm payment received</button></div>"
      : inv.refundRequest && !inv.refundRequest.closed
        ? "<div class='track-action'><p class='hint'>Refund requested: " + esc(inv.refundRequest.reason || "no reason given") +
          "</p><div class='btn-row'><button class='btn small' data-action='refund' data-id='" + esc(inv.id) +
          "'>Refund</button><button class='btn ghost small' data-action='declineRefund' data-id='" + esc(inv.id) +
          "'>Decline</button></div></div>"
        : "";
  return (
    "<article class='track' data-track='" + esc(inv.id) + "'>" +
    "<div class='track-top'><a href='#invoice/" + esc(inv.id) + "'>" + esc(inv.id) + " · " +
    esc(Store.clientLabel(c)) + kindTag(inv) + "</a><span>" + chip(inv) + " <b>" +
    money(Store.totals(inv).total) + "</b></span></div>" +
    progressHTML(inv) +
    "<p class='track-last'>" + esc(e.text) + " · " + esc(niceTime(e.at)) + "</p>" + confirm +
    "<p class='fine'>Client ID: " + esc(inv.clientId) + "</p></article>"
  );
}

// ===== INVOICES LIST =====
function renderInvoices(data) {
  const rows = data.invoices
    .map((inv) => {
      const c = clientOf(data, inv.clientId);
      return (
        "<tr class='row-link' data-open='" + esc(inv.id) + "'><td><b>" + esc(inv.id) + "</b>" + kindTag(inv) + "</td><td>" +
        esc(Store.clientLabel(c)) + "<div class='fine'>Client ID: " + esc(inv.clientId) + "</div></td><td>" +
        chip(inv) + "</td><td>" + esc(niceDate(inv.dueDate)) + "</td><td class='num'>" +
        money(Store.totals(inv).total) + "</td></tr>"
      );
    })
    .join("");
  main.innerHTML =
    "<header class='view-head'><div><h1>Invoices</h1><p>Create, edit, send and track invoices.</p></div>" +
    "<a class='btn' href='#invoice/new'>+ New invoice</a></header>" +
    "<section class='section glass'>" +
    (rows
      ? "<div class='table-wrap'><table class='list'><thead><tr><th>Invoice</th><th>Client</th><th>Status</th><th>Due</th><th class='num'>Total</th></tr></thead><tbody>" +
        rows + "</tbody></table></div>"
      : "<p class='empty'>No invoices yet.</p>") +
    "</section>";
}

// ===== INVOICE EDITOR: form on the left, live preview on the right =====
let editingId = null;
let previewMode = "invoice"; // or "receipt" once paid

function renderEditor(data, id) {
  if (id === "new") return newInvoiceScreen(data);
  const inv = Store.findInvoice(data, id);
  if (!inv) {
    main.innerHTML = "<p class='empty'>Invoice not found. <a href='#invoices'>Back to invoices</a></p>";
    return;
  }
  editingId = id;
  if (inv.status !== "paid") previewMode = "invoice";
  const locked = ["paid", "void"].includes(inv.status) || priceLocked(data, inv);
  const clientOptions = data.clients
    .map(
      (c) =>
        "<option value='" + esc(c.id) + "'" + (c.id === inv.clientId ? " selected" : "") + ">" +
        esc(Store.clientLabel(c)) + " · " + esc(c.id) + "</option>",
    )
    .join("");

  main.innerHTML =
    "<header class='view-head'><div><h1>" + esc(inv.id) + "</h1><p><a href='#invoices'>&larr; All invoices</a></p></div>" +
    "<div id='edActions' class='btn-row'></div></header>" +
    "<section class='section glass' id='edStatus'></section>" +
    "<div class='editor'>" +
    "<form class='section glass' id='edForm'>" +
    "<fieldset " + (locked ? "disabled" : "") + " style='border:0;display:grid;gap:1rem'>" +
    "<div class='form-grid'>" +
    "<label class='field wide'>Client<select name='clientId'>" + clientOptions + "</select></label>" +
    "<label class='field'>Issue date<input type='date' name='issueDate' value='" + esc(inv.issueDate) + "'></label>" +
    "<label class='field'>Due date<input type='date' name='dueDate' value='" + esc(inv.dueDate) + "'></label>" +
    "</div>" +
    "<div><div class='line line-head'><span>Description</span><span>Qty</span><span>Price (J$)</span><span></span></div>" +
    "<div class='lines' id='lines'></div>" +
    "<div class='btn-row' style='margin-top:0.6rem'><button type='button' class='btn ghost small' data-action='addLine'>+ Add line</button>" +
    "<button type='button' class='btn ghost small' data-action='fromEstimate'>Fill from client's quiz estimate</button>" +
    "<select id='addService' aria-label='Add a service' class='small-select'><option value=''>+ Add a service…</option>" +
    data.settings.catalog.services
      .map((x, i) => (x.on ? "<option value='" + i + "'>" + esc(x.name) + " · " + money(x.price) + (x.billing === "monthly" ? "/mo" : "") + "</option>" : ""))
      .join("") +
    "</select></div></div>" +
    "<div class='form-grid'>" +
    "<label class='field'>Discount (J$)<input type='number' min='0' step='any' name='discount' value='" + esc(inv.discount) + "'></label>" +
    "<label class='field'>GCT / tax (%)<input type='number' min='0' max='100' step='0.5' name='taxRate' value='" + esc(inv.taxRate) + "'></label>" +
    "<label class='field wide'>Notes for the client<textarea name='notes' placeholder='e.g. 50% deposit to start, balance on launch.'>" +
    esc(inv.notes) + "</textarea></label></div>" +
    (inv.kind === "project"
      ? "<p class='hint'>Lines, discount and tax are shared by all three payments of this project" +
        (priceLocked(data, inv) ? ", and are locked because a payment has been made." : ".") + "</p>"
      : "") +
    "<p class='hint'>Changes save automatically. Look and payment details are under <a href='#settings'>Settings</a>.</p>" +
    "</fieldset></form>" +
    "<div class='preview-col'><div class='view-head'><span class='hint'>Preview</span><span id='edToggle'></span></div>" +
    "<div class='print-area' id='edPreview'></div></div></div>";

  renderLines(inv, locked);
  refreshEditor();
}

// A project's price can't change once any of its payments is paid
// (otherwise the three payments would no longer add up to 100%)
function priceLocked(data, inv) {
  if (inv.kind !== "project") return false;
  return Store.projectInvoices(data, inv.projectId).some((i) => i.status === "paid");
}

function scheduleOf(data, inv) {
  return inv.kind === "project" ? Store.projectInvoices(data, inv.projectId) : null;
}

function newInvoiceScreen(data) {
  if (!data.clients.length) {
    main.innerHTML =
      "<header class='view-head'><h1>New invoice</h1></header><section class='section glass'>" +
      "<p class='empty'>Add a client first. Clients from the quiz appear automatically.</p>" +
      "<a class='btn' href='#clients'>Go to clients</a></section>";
    return;
  }
  main.innerHTML =
    "<header class='view-head'><div><h1>New invoice</h1><p><a href='#invoices'>&larr; All invoices</a></p></div></header>" +
    "<form class='section glass' id='newInvForm'><div class='form-grid'>" +
    "<label class='field wide'>Who is it for?<select name='clientId'>" +
    data.clients
      .map((c) => "<option value='" + esc(c.id) + "'>" + esc(Store.clientLabel(c)) + " · " + esc(c.id) + "</option>")
      .join("") +
    "</select></label>" +
    "<label class='field wide'>Type<select name='type'>" +
    "<option value='project'>Website project · 3 payments (" + Store.SCHEDULE.map((x) => x.pct + "% " + x.label.toLowerCase()).join(", ") + ")</option>" +
    "<option value='standard'>Single invoice (extras, one-off jobs)</option></select></label>" +
    "<label class='check wide'><input type='checkbox' name='useEstimate' checked> Fill lines from their quiz estimate (if they have one)</label>" +
    "</div><div class='btn-row' style='margin-top:1rem'><button class='btn' type='submit'>Create invoice</button></div></form>";
}

function renderLines(inv, locked) {
  document.getElementById("lines").innerHTML = inv.lines
    .map(
      (l, i) =>
        "<div class='line' data-line='" + i + "'>" +
        "<input aria-label='Description' data-k='desc' value='" + esc(l.desc) + "'>" +
        "<input aria-label='Quantity' type='number' min='0' data-k='qty' value='" + esc(l.qty) + "'>" +
        "<input aria-label='Price' type='number' min='0' step='any' data-k='price' value='" + esc(l.price) + "'>" +
        "<button type='button' class='icon-btn' data-action='removeLine' data-i='" + i + "' aria-label='Remove line'" +
        (locked ? " disabled" : "") + ">&times;</button></div>",
    )
    .join("");
}

// Redraw the parts that change: status, actions and preview (the form keeps focus)
function refreshEditor() {
  const data = Store.load();
  const inv = Store.findInvoice(data, editingId);
  if (!inv || !document.getElementById("edPreview")) return;
  const client = clientOf(data, inv.clientId);
  const t = Store.totals(inv);

  // Status and progress
  const e = lastEvent(inv);
  let extra = "";
  if (inv.status === "processing" && inv.payment) {
    extra =
      "<p>Client says they paid by <b>" + esc(Store.METHODS[inv.payment.method]) + "</b>" +
      (inv.payment.reference ? ", reference <b>" + esc(inv.payment.reference) + "</b>" : "") +
      ". Check your account, then confirm.</p>";
  }
  const share = ["sent", "viewed", "processing"].includes(inv.status)
    ? "<div class='share'><b>Client link</b><input readonly value='" + esc(clientLink(inv)) + "'>" +
      "<div class='btn-row'><button class='btn small' data-action='copyLink'>Copy link</button>" +
      "<a class='btn ghost small' target='_blank' rel='noopener' href='" + esc(clientLink(inv)) + "'>Open as client</a>" +
      (client && client.phone
        ? "<a class='btn ghost small' target='_blank' rel='noopener' href='https://wa.me/" +
          esc(client.phone.replace(/\D/g, "")) + "?text=" +
          encodeURIComponent("Hi " + (client.name || client.business) + ", here is your invoice " + inv.id + " for " + money(t.total) + ": " + clientLink(inv)) +
          "'>Send on WhatsApp</a>"
        : "") +
      "</div><p class='hint'>In this demo the link only works in this browser.</p></div>"
    : "";

  const schedule = scheduleOf(data, inv);
  const schedulePanel = schedule
    ? "<div class='sched'>" +
      schedule
        .map((s, i) => {
          const st = Store.SCHEDULE[i];
          return (
            "<a class='sched-step" + (s.id === inv.id ? " here" : "") + "' href='#invoice/" + esc(s.id) + "'><span>" +
            (i + 1) + ". " + esc(st.label) + " · " + t.pcts[i] + "%</span><b>" + money(t.shares[i]) + "</b>" + chip(s) +
            "<small>" + esc(s.id) + "</small></a>"
          );
        })
        .join("") +
      "<p class='hint'>Project total " + money(t.projectTotal) + " · the three payments add up to 100%. " +
      "Send each one when that stage is reached.</p></div>"
    : "";

  document.getElementById("edStatus").innerHTML =
    "<div class='view-head'><div>" + chip(inv) + " <b>" + money(t.total) + "</b> · " +
    esc(Store.clientLabel(client)) + (Store.kindLabel(inv) ? " · " + esc(Store.kindLabel(inv)) : "") + "</div><span class='hint'>" + esc(e.text) + " · " + esc(niceTime(e.at)) + "</span></div>" +
    progressHTML(inv) + extra + refundPanel(inv, data.settings) + share + schedulePanel +
    "<p class='fine'>Client ID: " + esc(inv.clientId) + " · Invoice " + esc(inv.id) + "</p>";

  // Actions for the current status
  const a = [];
  if (inv.status === "draft") a.push("<button class='btn' data-action='send'>Send invoice</button>");
  if (inv.status === "processing") a.push("<button class='btn ok' data-action='confirm' data-id='" + esc(inv.id) + "'>Confirm payment received</button>");
  if (["sent", "viewed", "processing"].includes(inv.status)) a.push("<button class='btn ghost' data-action='manualPaid'>Record payment</button>");
  a.push("<button class='btn ghost' data-action='print'>Print / PDF</button>");
  if (inv.refundRequest && !inv.refundRequest.closed) {
    a.push("<button class='btn' data-action='refund'>Approve refund</button>");
    a.push("<button class='btn ghost' data-action='declineRefund'>Decline refund</button>");
  } else if (inv.status === "paid" && Store.refundInfo(inv, data.settings).net > 0) {
    a.push("<button class='btn ghost' data-action='refund'>Refund</button>");
  }
  if (inv.status === "draft") a.push("<button class='btn ghost' data-action='delete'>Delete</button>");
  else if (inv.status !== "paid" && inv.status !== "void") a.push("<button class='btn ghost' data-action='void'>Void</button>");
  document.getElementById("edActions").innerHTML = a.join("");

  // Invoice / receipt toggle once paid
  document.getElementById("edToggle").innerHTML =
    inv.status === "paid"
      ? "<span class='toggle-view'><button data-action='mode' data-mode='invoice' aria-pressed='" + (previewMode === "invoice") +
        "'>Invoice</button><button data-action='mode' data-mode='receipt' aria-pressed='" + (previewMode === "receipt") +
        "'>Receipt</button></span>"
      : "";

  document.getElementById("edPreview").innerHTML = Store.documentHTML(inv, client, data.settings, previewMode === "receipt", schedule);
}

// Save form changes as they're typed
main.addEventListener("input", (e) => {
  const form = e.target.closest("#edForm");
  if (!form) return;
  Store.update((data) => {
    const inv = Store.findInvoice(data, editingId);
    if (!inv || ["paid", "void"].includes(inv.status)) return;
    const line = e.target.closest("[data-line]");
    if (line) {
      if (priceLocked(data, inv)) return;
      const l = inv.lines[+line.dataset.line];
      const k = e.target.dataset.k;
      l[k] = k === "desc" ? e.target.value : +e.target.value || 0;
    } else if (e.target.name) {
      const name = e.target.name;
      if (["discount", "taxRate", "clientId"].includes(name) && priceLocked(data, inv)) return;
      const v = e.target.value;
      inv[name] = ["discount", "taxRate"].includes(name) ? +v || 0 : v;
    }
    syncProject(data, inv);
  });
  refreshEditor();
});

// Copy the shared parts (client, lines, discount, tax) to the project's other unpaid payments
function syncProject(data, inv) {
  if (inv.kind !== "project") return;
  Store.projectInvoices(data, inv.projectId).forEach((other) => {
    if (other === inv || ["paid", "void"].includes(other.status)) return;
    other.clientId = inv.clientId;
    other.lines = structuredClone(inv.lines);
    other.discount = inv.discount;
    other.taxRate = inv.taxRate;
  });
}

// Add a line from the services catalog
main.addEventListener("change", (e) => {
  if (e.target.id !== "addService" || e.target.value === "") return;
  const data = Store.load();
  const inv = Store.findInvoice(data, editingId);
  if (priceLocked(data, inv) || ["paid", "void"].includes(inv.status)) return toast("This invoice can't be changed");
  const svc = data.settings.catalog.services[+e.target.value];
  Store.update((d) => {
    const i = Store.findInvoice(d, editingId);
    i.lines.push({ desc: svc.name + (svc.billing === "monthly" ? " (monthly)" : ""), qty: 1, price: svc.price });
    syncProject(d, i);
  });
  toast(svc.name + " added");
  route();
});

// ===== REFUNDS =====
function refundPanel(inv, settings) {
  if (inv.status !== "paid") return "";
  const r = Store.refundInfo(inv, settings);
  const parts = [];
  if (r.refunded) parts.push(money(r.refunded) + " refunded · net " + money(r.net));
  if (inv.refundRequest && !inv.refundRequest.closed)
    parts.push("<b>Client asked for a refund</b>" + (inv.refundRequest.reason ? ": " + esc(inv.refundRequest.reason) : ""));
  parts.push(
    r.eligible
      ? "Refund window open until " + esc(niceDate(r.deadline)) + " (" + settings.refundDays + " days from payment)"
      : esc(r.why),
  );
  return "<p class='refund-line'>" + parts.join(" · ") + "</p>";
}

async function doRefund(id) {
  const data = Store.load();
  const inv = Store.findInvoice(data, id);
  const r = Store.refundInfo(inv, data.settings);
  if (r.net <= 0) return toast("Already fully refunded");
  const v = await dialog({
    title: "Refund " + id,
    text: r.eligible
      ? "Up to " + money(r.net) + " can be refunded. The refund window is open until " + niceDate(r.deadline) + "."
      : r.why + ". Your terms don't cover this refund, but you can still give one.",
    fields: [
      { name: "amount", label: "Amount (J$)", type: "number", value: r.net },
      { name: "reason", label: "Reason (shown on the receipt)", type: "textarea", value: (inv.refundRequest && inv.refundRequest.reason) || "" },
    ],
    ok: "Refund",
    danger: !r.eligible,
  });
  if (!v) return;
  const amount = Math.round(parseFloat(String(v.amount).replace(/[^0-9.]/g, "")));
  if (!(amount > 0) || amount > r.net) return toast("Enter an amount between J$1 and " + money(r.net));
  const reason = v.reason;
  Store.update((d) => {
    const i = Store.findInvoice(d, id);
    i.refunds = i.refunds || [];
    i.refunds.push({ amount, reason, at: new Date().toISOString(), method: i.payment.method });
    if (i.refundRequest && !i.refundRequest.closed) {
      i.refundRequest.closed = true;
      i.refundRequest.outcome = "refunded";
    }
    Store.event(i, "refunded", "Refund of " + money(amount) + " issued" + (reason ? " · " + reason : ""));
  });
  const how = {
    card: "Issue it in PayPal too (Activity > the payment > Refund).",
    paypal: "Issue it in PayPal too (Activity > the payment > Refund).",
    bank: "Send the money back by bank transfer.",
    lynk: "Send it back on Lynk.",
  };
  toast("Refund recorded. " + (how[inv.payment.method] || ""));
  route();
}

// ===== SEARCH: clients, invoices and subscriptions =====
const searchBox = document.getElementById("search");
searchBox.addEventListener("input", () => {
  const q = searchBox.value.trim();
  history.replaceState(null, "", q ? "#search/" + encodeURIComponent(q) : "#overview");
  route();
});
document.addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (e.key === "/" && !typing) {
    e.preventDefault();
    searchBox.focus();
  }
  if (e.key === "Escape" && document.activeElement === searchBox && searchBox.value) {
    searchBox.value = "";
    searchBox.dispatchEvent(new Event("input"));
  }
});

// Wrap matching words in <mark> (text is escaped first)
function highlight(text, words) {
  let html = esc(text);
  words.forEach((w) => {
    const safe = esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp("(" + safe + ")", "ig"), "<mark>$1</mark>");
  });
  return html;
}

function renderSearch(data, q) {
  if (searchBox.value.trim() !== q) searchBox.value = q;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (parts) => {
    const hay = parts.join(" ").toLowerCase();
    return words.length && words.every((w) => hay.includes(w));
  };

  const clients = data.clients.filter((c) => hit([c.id, c.name, c.business, c.phone, c.email, c.siteType, c.plan]));
  const invoices = data.invoices.filter((inv) => {
    const c = clientOf(data, inv.clientId);
    return hit([
      inv.id, inv.clientId, Store.clientLabel(c), STATUS_TEXT[Store.displayStatus(inv)] || inv.status,
      Store.kindLabel(inv), inv.notes, money(Store.totals(inv).total), String(Store.totals(inv).total),
      inv.lines.map((l) => l.desc).join(" "), inv.payment && inv.payment.reference,
    ]);
  });
  const subs = data.subscriptions.filter((sub) =>
    hit([sub.id, sub.clientId, Store.clientLabel(clientOf(data, sub.clientId)), Store.CYCLES[sub.cycle].label, sub.items.map((x) => x.name).join(" ")]),
  );
  const total = clients.length + invoices.length + subs.length;

  const group = (title, items) =>
    items ? "<section class='section glass'><h2>" + title + "</h2><div class='results'>" + items + "</div></section>" : "";

  main.innerHTML =
    "<header class='view-head'><div><h1>Search</h1><p>" +
    (words.length ? total + " result" + (total === 1 ? "" : "s") + " for “" + esc(q) + "”" : "Type a name, phone number, client ID, invoice number, amount or status.") +
    "</p></div></header>" +
    group(
      "Clients",
      clients.slice(0, 20).map((c) =>
        "<a class='result' href='#clients'><b>" + highlight(Store.clientLabel(c), words) + "</b><span>" +
        highlight([c.phone, c.email].filter(Boolean).join(" · "), words) + "</span><span class='fine'>Client ID: " +
        highlight(c.id, words) + "</span></a>").join(""),
    ) +
    group(
      "Invoices",
      invoices.slice(0, 30).map((inv) => {
        const c = clientOf(data, inv.clientId);
        return (
          "<a class='result' href='#invoice/" + esc(inv.id) + "'><b>" + highlight(inv.id, words) + " · " +
          highlight(Store.clientLabel(c), words) + "</b><span>" + chip(inv) + " " + money(Store.totals(inv).total) +
          (Store.kindLabel(inv) ? " · " + highlight(Store.kindLabel(inv), words) : "") + "</span><span class='fine'>Client ID: " +
          highlight(inv.clientId, words) + "</span></a>"
        );
      }).join(""),
    ) +
    group(
      "Subscriptions",
      subs.map((sub) =>
        "<a class='result' href='#subscriptions'><b>" + highlight(sub.id, words) + " · " +
        highlight(Store.clientLabel(clientOf(data, sub.clientId)), words) + "</b><span>" +
        esc(Store.CYCLES[sub.cycle].label) + " · " + highlight(sub.items.map((x) => x.name).join(", "), words) + "</span></a>").join(""),
    ) +
    (words.length && !total ? "<section class='section glass'><p class='empty'>Nothing matches. Try fewer words.</p></section>" : "");
}

// ===== PRICING AND SERVICES =====
// Prices used by the quiz, the home page and invoices (saved in this browser for the demo)
const BUILD_LABELS = {
  personal: "Personal brand and portfolio",
  business: "Small business",
  event: "Event or landing page",
  organisation: "Community or organisation",
  notsure: "Not sure yet",
};
const ADDON_LABELS = {
  ownDomain: "Own domain upgrade (event sites, 1 year)",
  advancedSeo: "Advanced SEO (per month)",
  analytics: "Google Analytics setup",
  socials: "Social media setup",
};

function renderPricing(data) {
  const cat = data.settings.catalog;
  const s = data.settings;
  const num = (label, name, value, extra) =>
    "<label class='field" + (extra || "") + "'>" + label + "<input type='number' min='0' step='any' name='" + name + "' value='" + esc(value) + "'></label>";

  main.innerHTML =
    "<header class='view-head'><div><h1>Pricing and services</h1><p>Change prices and switch services on or off. The quiz, home page and new invoices use these.</p></div></header>" +
    "<form id='pricingForm' class='pricing'>" +
    "<section class='section glass'><h2>Website builds</h2><div class='form-grid'>" +
    Object.keys(BUILD_LABELS).map((k) => num(BUILD_LABELS[k] + " (J$)", "build." + k, cat.build[k])).join("") +
    "</div></section>" +
    "<section class='section glass'><h2>Included and requested items</h2><div class='form-grid'>" +
    num("HTTPS and basic security (J$)", "https", cat.https) + num("Basic SEO (J$)", "seo", cat.seo) +
    num("Domain, 1 year (J$)", "domain", cat.domain) + num("Logo design (J$)", "logo", cat.logo) +
    "</div></section>" +
    "<section class='section glass'><h2>Recommended add-ons</h2><p class='hint'>Switched-off add-ons are hidden from the quiz.</p><div class='addon-rows'>" +
    Object.keys(ADDON_LABELS).map((k) =>
      "<div class='addon-row'><label class='check'><input type='checkbox' name='addon.on." + k + "'" + (cat.addons[k].on ? " checked" : "") + "> " +
      esc(ADDON_LABELS[k]) + "</label><input type='number' min='0' aria-label='" + esc(ADDON_LABELS[k]) + " price' name='addon.price." + k + "' step='any' value='" + esc(cat.addons[k].price) + "'></div>").join("") +
    "</div></section>" +
    "<section class='section glass'><h2>Discounts and plans</h2><div class='form-grid'>" +
    num("Community discount (% off build)", "communityDiscount", cat.communityDiscount) +
    num("…with an ongoing plan (%)", "communityDiscountOngoing", cat.communityDiscountOngoing) +
    num("Every 3 months discount (J$)", "plan.3months", cat.planDiscounts["3months"]) +
    num("Every 6 months discount (J$)", "plan.6months", cat.planDiscounts["6months"]) +
    num("Yearly price cap (J$)", "yearlyCap", cat.yearlyCap, " wide") +
    "</div></section>" +
    "<section class='section glass'><h2>Project payment schedule</h2><p class='hint'>Must add up to 100%. New projects use these; existing projects keep theirs.</p><div class='form-grid three'>" +
    Store.SCHEDULE.map((x, i) => "<label class='field'>" + esc(x.label) + " (%)<input type='number' min='0' max='100' step='1' name='schedule." + i + "' value='" + cat.schedule[i] + "'></label>").join("") +
    "</div><p class='hint' id='schedSum'></p></section>" +
    "<section class='section glass'><h2>Refund policy</h2><div class='form-grid'>" +
    "<label class='field'>Refund window (days after payment)<input type='number' min='0' max='365' step='1' name='refundDays' value='" + esc(s.refundDays) + "'></label>" +
    "<label class='check'><input type='checkbox' name='commitmentNonRefundable'" + (s.commitmentNonRefundable ? " checked" : "") + "> Commitment fee is non-refundable</label>" +
    "</div><p class='hint'>Shown on invoices and receipts. Remember to match it in terms.html.</p></section>" +
    "<section class='section glass'><h2>Extra services</h2><p class='hint'>Add these to any invoice with “+ Add a service”.</p><div id='svcRows' class='svc-rows'>" +
    cat.services.map((x, i) => serviceRow(x, i)).join("") +
    "</div><button type='button' class='btn ghost small' data-action='addSvc'>+ Add service</button></section>" +
    "<div class='btn-row sticky-save'><button class='btn' type='submit'>Save pricing</button><span class='hint'>The quiz and home page pick up changes on their next load.</span></div>" +
    "</form>";
  checkScheduleSum();
}

function serviceRow(x, i) {
  return (
    "<div class='svc-row' data-svc='" + i + "'>" +
    "<label class='check'><input type='checkbox' data-k='on'" + (x.on ? " checked" : "") + " aria-label='Offered'></label>" +
    "<input data-k='name' value='" + esc(x.name) + "' aria-label='Service name' placeholder='Service name'>" +
    "<input data-k='price' type='number' min='0' step='any' value='" + esc(x.price) + "' aria-label='Price'>" +
    "<select data-k='billing' aria-label='Billing'><option value='once'" + (x.billing === "once" ? " selected" : "") + ">One-time</option>" +
    "<option value='monthly'" + (x.billing === "monthly" ? " selected" : "") + ">Monthly</option></select>" +
    "<button type='button' class='icon-btn' data-action='removeSvc' aria-label='Remove service'>&times;</button></div>"
  );
}

function checkScheduleSum() {
  const form = document.getElementById("pricingForm");
  if (!form) return true;
  const sum = [0, 1, 2].reduce((t, i) => t + (parseFloat(form.elements["schedule." + i].value) || 0), 0);
  const el = document.getElementById("schedSum");
  el.textContent = "Total: " + sum + "%" + (sum === 100 ? " ✓" : " — must be 100%");
  el.classList.toggle("bad", sum !== 100);
  return sum === 100;
}

function readPricingForm(cat) {
  const f = document.getElementById("pricingForm");
  const n = (name) => Math.max(0, parseFloat(f.elements[name].value) || 0);
  const out = structuredClone(cat);
  Object.keys(BUILD_LABELS).forEach((k) => (out.build[k] = n("build." + k)));
  ["https", "seo", "domain", "logo", "communityDiscount", "communityDiscountOngoing", "yearlyCap"].forEach((k) => (out[k] = n(k)));
  out.planDiscounts = { "3months": n("plan.3months"), "6months": n("plan.6months") };
  Object.keys(ADDON_LABELS).forEach((k) => {
    out.addons[k] = { price: n("addon.price." + k), on: f.elements["addon.on." + k].checked };
  });
  out.schedule = [0, 1, 2].map((i) => n("schedule." + i));
  out.services = [...f.querySelectorAll(".svc-row")]
    .map((row) => ({
      name: row.querySelector("[data-k=name]").value.trim(),
      price: Math.max(0, parseFloat(row.querySelector("[data-k=price]").value) || 0),
      billing: row.querySelector("[data-k=billing]").value,
      on: row.querySelector("[data-k=on]").checked,
    }))
    .filter((x) => x.name);
  return out;
}

main.addEventListener("input", (e) => {
  if (e.target.name && e.target.name.startsWith("schedule.")) checkScheduleSum();
});

// ===== ANIMATIONS =====
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Page entrance: sections rise in one after another; numbers count up
function animateIn() {
  if (reduceMotion) return;
  main.classList.remove("enter");
  void main.offsetWidth; // restart the animation
  main.classList.add("enter");
  [...main.children].forEach((el, i) => el.style.setProperty("--i", i));
  main.querySelectorAll(".stat, .client-card, .track, .result, .sched-step, table.list tbody tr").forEach((el, i) =>
    el.style.setProperty("--j", Math.min(i, 12)),
  );
  main.querySelectorAll(".stat strong").forEach(countUp);
}

function countUp(el) {
  const text = el.textContent;
  const m = text.match(/^(J\$)?([\d,]+)$/);
  if (!m) return;
  const target = parseInt(m[2].replace(/,/g, ""), 10);
  if (!target) return;
  const start = performance.now();
  const dur = 700;
  (function frame(now) {
    const t = Math.min((now - start) / dur, 1);
    const v = Math.round(target * (1 - Math.pow(1 - t, 3)));
    el.textContent = (m[1] || "") + v.toLocaleString();
    if (t < 1) requestAnimationFrame(frame);
  })(start);
}

// ===== CLIENTS =====
function renderClients(data) {
  const cards = data.clients
    .map((c) => {
      const invs = data.invoices.filter((i) => i.clientId === c.id);
      const once = (c.estimate || []).filter((x) => x.billing === "once");
      const monthly = (c.estimate || []).filter((x) => x.billing === "recurring");
      const estTotal = once.reduce((s, x) => s + (x.amount || 0), 0);
      return (
        "<article class='client-card glass'>" +
        "<h3>" + esc(Store.clientLabel(c)) + "</h3>" +
        "<p>" + esc(c.phone) + (c.email ? " · " + esc(c.email) : "") + "</p>" +
        (c.siteType ? "<p>" + esc(c.siteType) + (c.plan ? " · " + esc(c.plan) + " plan" : "") + "</p>" : "") +
        (once.length
          ? "<ul>" + once.concat(monthly).map((x) => "<li><span>" + esc(x.name) + "</span><span>" +
              (x.amount ? money(x.amount) + (x.billing === "recurring" ? "/mo" : "") : "Free") + "</span></li>").join("") +
            "<li><b>Estimate (one-time)</b><b>" + money(estTotal) + "</b></li></ul>"
          : "") +
        "<p>" + (invs.length ? invs.map((i) => "<a href='#invoice/" + esc(i.id) + "'>" + esc(i.id) + "</a> " + chip(i)).join("<br>") : "No invoices yet") + "</p>" +
        "<div class='btn-row'><button class='btn small' data-action='invoiceFor' data-id='" + esc(c.id) + "'>" +
        (once.length ? "Project invoices from estimate" : "New project invoices") + "</button></div>" +
        subscriptionBlock(data, c, monthly) +
        "<p class='fine'>Client ID: " + esc(c.id) + " · Added " + esc(niceDate(c.createdAt)) +
        (c.source === "quiz" ? " from the quiz" : "") + "</p></article>"
      );
    })
    .join("");

  main.innerHTML =
    "<header class='view-head'><div><h1>Clients</h1><p>People who finished the quiz appear here with their estimate.</p></div></header>" +
    "<details class='section glass'><summary><b>+ Add a client</b></summary>" +
    "<form id='clientForm' class='form-grid' style='margin-top:1rem'>" +
    "<label class='field'>Name<input name='name'></label>" +
    "<label class='field'>Business name<input name='business'></label>" +
    "<label class='field'>Phone / WhatsApp<input name='phone' type='tel' required></label>" +
    "<label class='field'>Email (optional)<input name='email' type='email'></label>" +
    "<div class='wide btn-row'><button class='btn' type='submit'>Add client</button></div></form></details>" +
    (cards ? "<section class='client-grid'>" + cards + "</section>" : "<p class='empty'>No clients yet.</p>");
}

// Subscription on a client card: what's running, or a form to start one
function subscriptionBlock(data, c, monthly) {
  const sub = data.subscriptions.find((s) => s.clientId === c.id);
  if (sub) {
    const bill = Store.cycleBill(sub.items, sub.cycle);
    return (
      "<p><b>Subscription " + esc(sub.id) + "</b> · " + esc(Store.CYCLES[sub.cycle].label) + " · " + money(bill.amount) +
      (sub.active ? " · next invoice " + esc(niceDate(sub.nextDate)) : " · paused") +
      " <a href='#subscriptions'>Manage</a></p>"
    );
  }
  if (!monthly.length) return "";
  const start = new Date();
  start.setMonth(start.getMonth() + 1); // recurring billing starts after the first month
  const cycle = c.planKey && Store.CYCLES[c.planKey] ? c.planKey : "monthly";
  return (
    "<form class='sub-start' data-client='" + esc(c.id) + "'><b>Recurring services</b>" +
    "<div class='form-grid'><label class='field'>Billing cycle<select name='cycle'>" +
    Object.entries(Store.CYCLES)
      .map(([k, v]) => "<option value='" + k + "'" + (k === cycle ? " selected" : "") + ">" + esc(v.label) + "</option>")
      .join("") +
    "</select></label><label class='field'>First invoice<input type='date' name='start' value='" + Store.isoDay(start) + "'></label></div>" +
    "<button class='btn ghost small' type='submit'>Start subscription</button>" +
    (c.planKey ? "<p class='hint'>Cycle chosen by the client in the quiz.</p>" : "") + "</form>"
  );
}

// ===== SUBSCRIPTIONS: recurring invoices on the client's chosen cycle =====
function renderSubscriptions(data) {
  const rows = data.subscriptions
    .map((sub) => {
      const c = clientOf(data, sub.clientId);
      const bill = Store.cycleBill(sub.items, sub.cycle);
      const invs = data.invoices.filter((i) => i.subscriptionId === sub.id);
      return (
        "<article class='section glass sub'>" +
        "<div class='view-head'><div><h2 style='margin:0'>" + esc(sub.id) + " · " + esc(Store.clientLabel(c)) + "</h2>" +
        "<p class='hint'>" + sub.items.map((it) => esc(it.name) + " " + money(it.monthly) + "/mo").join(" · ") + "</p></div>" +
        "<span class='chip " + (sub.active ? "paid" : "draft") + "'>" + (sub.active ? "Active" : "Paused") + "</span></div>" +
        "<div class='stats' style='margin:1rem 0'>" +
        stat("Billing cycle", Store.CYCLES[sub.cycle].label, "matches the client's plan") +
        stat("Each invoice", money(bill.amount), bill.discount ? "plan discount " + money(bill.discount) : "no discount") +
        stat("Next invoice", sub.active ? niceDate(sub.nextDate) : "Paused", "created and sent automatically") +
        "</div>" +
        "<div class='btn-row'><button class='btn small' data-action='billNow' data-sub='" + esc(sub.id) + "'>Bill next cycle now</button>" +
        "<button class='btn ghost small' data-action='toggleSub' data-sub='" + esc(sub.id) + "'>" + (sub.active ? "Pause" : "Resume") + "</button>" +
        "<label class='check'><input type='checkbox' data-action='autoSend' data-sub='" + esc(sub.id) + "'" + (sub.autoSend ? " checked" : "") +
        "> Send automatically</label></div>" +
        (invs.length
          ? "<div class='table-wrap' style='margin-top:1rem'><table class='list'><tbody>" +
            invs.map((i) => "<tr class='row-link' data-open='" + esc(i.id) + "'><td><b>" + esc(i.id) + "</b>" + kindTag(i) +
              "</td><td>" + chip(i) + "</td><td class='num'>" + money(Store.totals(i).total) + "</td></tr>").join("") +
            "</tbody></table></div>"
          : "<p class='hint' style='margin-top:0.8rem'>No invoices yet. The first one is created on " + esc(niceDate(sub.nextDate)) + ".</p>") +
        "<p class='fine'>Client ID: " + esc(sub.clientId) + " · " + esc(sub.id) + "</p></article>"
      );
    })
    .join("");
  main.innerHTML =
    "<header class='view-head'><div><h1>Subscriptions</h1><p>Recurring services bill on the cycle the client chose: bi-weekly, monthly, every 3 or 6 months, or yearly.</p></div></header>" +
    (rows || "<section class='section glass'><p class='empty'>No subscriptions yet. Start one from a client who picked recurring services in the quiz.</p><a class='btn' href='#clients'>Go to clients</a></section>");
}

// Turn a quiz estimate into invoice lines (and a discount for any negative rows).
// Only one-time items: monthly services are billed by a subscription instead.
function linesFromEstimate(client) {
  const est = (client && client.estimate) || [];
  const once = est.filter((x) => x.billing !== "recurring");
  const lines = once.filter((x) => x.amount > 0).map((x) => ({ desc: x.name, qty: 1, price: x.amount }));
  const discount = once.filter((x) => x.amount < 0).reduce((s, x) => s - x.amount, 0);
  return { lines, discount };
}

function createFor(clientId, useEstimate, type) {
  const data = Store.load();
  const client = clientOf(data, clientId);
  const fromEst = useEstimate ? linesFromEstimate(client) : { lines: [], discount: 0 };
  if (type === "project") {
    const first = Store.createProject(clientId, fromEst.lines, fromEst.discount);
    location.hash = "invoice/" + first.id;
    return toast("Project created: 3 invoices (15% / 35% / 50%)");
  }
  const inv = Store.createInvoice(clientId, fromEst.lines);
  if (fromEst.discount) Store.update((d) => (Store.findInvoice(d, inv.id).discount = fromEst.discount));
  location.hash = "invoice/" + inv.id;
  toast(inv.id + " created");
}

// ===== SETTINGS =====
function renderSettings(data) {
  const s = data.settings;
  const b = s.bank;
  const f = (label, name, value, type, extra) =>
    "<label class='field" + (extra || "") + "'>" + label + "<input name='" + name + "' type='" + (type || "text") +
    "' value='" + esc(value) + "'></label>";
  const m = (key, label) =>
    "<label class='check'><input type='checkbox' name='m_" + key + "'" + (s.methods[key] ? " checked" : "") + "> " + label + "</label>";

  main.innerHTML =
    "<header class='view-head'><div><h1>Settings</h1><p>Your business details, invoice look and how clients pay you.</p></div></header>" +
    "<div class='editor'><form class='section glass' id='settingsForm' style='display:grid;gap:1.4rem'>" +
    "<div><h2>Business</h2><div class='form-grid'>" +
    f("Business name", "businessName", s.businessName, "text", " wide") +
    f("Tagline", "tagline", s.tagline, "text", " wide") +
    f("Phone", "phone", s.phone) + f("Email", "email", s.email, "email") + "</div></div>" +
    "<div><h2>Invoice look</h2><div class='form-grid'>" +
    f("Logo text", "logoText", s.logoText) +
    "<label class='field'>Accent colour<input type='color' name='accent' value='" + esc(s.accent) + "'></label>" +
    "<label class='field'>Template<select name='template'><option value='modern'" + (s.template === "modern" ? " selected" : "") +
    ">Modern</option><option value='classic'" + (s.template === "classic" ? " selected" : "") + ">Classic</option></select></label>" +
    f("Invoice number prefix", "invoicePrefix", s.invoicePrefix) +
    f("Next invoice number", "nextNumber", s.nextNumber, "number") + f("Days until due", "dueDays", s.dueDays, "number") +
    "<label class='field wide'>Payment terms (on invoices)<textarea name='terms'>" + esc(s.terms) + "</textarea></label>" +
    "<label class='field wide'>Thank-you note (on receipts)<textarea name='thanks'>" + esc(s.thanks) + "</textarea></label></div></div>" +
    "<div><h2>Bank account for deposits</h2><p class='hint' style='margin-bottom:0.8rem'>Shown on invoices for bank transfers. Saved in this browser only, never in the website files.</p><div class='form-grid'>" +
    f("Bank", "bank_bankName", b.bankName) + f("Branch", "bank_branch", b.branch) +
    f("Account name", "bank_accountName", b.accountName) +
    "<label class='field'>Account type<select name='bank_accountType'>" +
    ["Savings", "Chequing"].map((t) => "<option" + (b.accountType === t ? " selected" : "") + ">" + t + "</option>").join("") +
    "</select></label>" + f("Account number", "bank_accountNumber", b.accountNumber, "text", " wide") + "</div></div>" +
    "<div><h2>Payment options</h2><div class='form-grid'>" +
    f("PayPal link", "paypal", s.paypal, "text") + f("Lynk handle", "lynk", s.lynk, "text") +
    "<div class='wide' style='display:grid;gap:0.4rem'>" +
    m("bank", "Bank transfer") + m("card", "Credit / debit card (Visa, Mastercard)") + m("paypal", "PayPal") + m("lynk", "Lynk") +
    "<p class='hint'>Bank transfer, PayPal and Lynk only show to clients once their details are filled in.</p></div></div></div>" +
    "<div><h2>Card and PayPal processing</h2><div class='form-grid'>" +
    "<label class='field wide'>Mode<select name='processor'>" +
    "<option value='paypal-sandbox'" + (s.processor === "paypal-sandbox" ? " selected" : "") + ">PayPal sandbox: real checkout, test cards, no real money</option>" +
    "<option value='simulated'" + (s.processor === "simulated" ? " selected" : "") + ">Simulated: pretend checkout, nothing leaves the page</option>" +
    "</select></label>" +
    f("PayPal sandbox client ID", "paypalClientId", s.paypalClientId, "text", " wide") +
    f("J$ per US$1", "usdRate", s.usdRate, "number") +
    "<p class='hint wide'>PayPal charges in US dollars, so invoices are converted at this rate. Check the current rate. " +
    "<b>sb</b> is PayPal's shared test ID; to see test payments in your own sandbox account, create a free app at developer.paypal.com and paste its sandbox client ID here. " +
    "Going live later needs a PayPal Business account and a small server, so the secret key never sits in the website.</p></div></div>" +
    "<div class='btn-row'><button class='btn' type='submit'>Save settings</button></div></form>" +
    "<div class='preview-col'><span class='hint'>Preview with sample lines</span><div id='settingsPreview'></div></div></div>";
  previewSettings();
}

function readSettingsForm(base) {
  const form = document.getElementById("settingsForm");
  const s = structuredClone(base);
  [...form.elements].forEach((el) => {
    if (!el.name) return;
    if (el.name.startsWith("m_")) s.methods[el.name.slice(2)] = el.checked;
    else if (el.name.startsWith("bank_")) s.bank[el.name.slice(5)] = el.value.trim();
    else if (["nextNumber", "dueDays"].includes(el.name)) s[el.name] = Math.max(0, parseInt(el.value, 10) || 0);
    else if (el.name === "usdRate") s.usdRate = Math.max(1, parseFloat(el.value) || 157);
    else s[el.name] = el.value.trim();
  });
  return s;
}

function previewSettings() {
  const data = Store.load();
  const s = readSettingsForm(data.settings);
  const sample = {
    id: s.invoicePrefix + "-" + s.nextNumber,
    clientId: "JD-SAMPLE",
    status: "sent",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + s.dueDays * 864e5).toISOString().slice(0, 10),
    lines: [
      { desc: "Website build (home page plus one or two additional pages)", qty: 1, price: 60000 },
      { desc: "Domain (1 year)", qty: 1, price: 3000 },
    ],
    discount: 0,
    taxRate: 0,
    notes: "",
    events: [],
  };
  document.getElementById("settingsPreview").innerHTML = Store.documentHTML(
    sample,
    { name: "Sample Client", business: "Sample Barber Shop", phone: "876-555-0100" },
    s,
    false,
  );
}

main.addEventListener("input", (e) => {
  if (e.target.closest("#settingsForm")) previewSettings();
});

// ===== FORMS =====
main.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === "pricingForm") {
    if (!checkScheduleSum()) return toast("The payment schedule must add up to 100%");
    Store.update((data) => {
      data.settings.catalog = readPricingForm(data.settings.catalog);
      data.settings.refundDays = Math.max(0, parseInt(form.elements.refundDays.value, 10) || 0);
      data.settings.commitmentNonRefundable = form.elements.commitmentNonRefundable.checked;
    });
    toast("Pricing saved");
    return route();
  }
  if (form.id === "settingsForm") {
    Store.update((data) => (data.settings = readSettingsForm(data.settings)));
    toast("Settings saved");
  }
  if (form.id === "clientForm") {
    const v = (n) => form.elements[n].value.trim();
    if (!v("name") && !v("business")) return toast("Enter a name or business name");
    if (!v("phone")) return toast("Enter a phone number");
    const c = Store.addClient({ name: v("name"), business: v("business"), phone: v("phone"), email: v("email") });
    toast("Client added · " + c.id);
    route();
  }
  if (form.classList.contains("sub-start")) {
    const data = Store.load();
    const c = clientOf(data, form.dataset.client);
    const items = (c.estimate || []).filter((x) => x.billing === "recurring" && x.amount > 0).map((x) => ({ name: x.name, monthly: x.amount }));
    const sub = Store.createSubscription(c.id, items, form.elements.cycle.value, form.elements.start.value);
    const made = Store.runSubscriptions();
    toast(sub.id + " started" + (made.length ? " · " + made.length + " invoice(s) created" : ""));
    location.hash = "subscriptions";
    return route();
  }
  if (form.id === "newInvForm") {
    createFor(form.elements.clientId.value, form.elements.useEstimate.checked, form.elements.type.value);
  }
});

// ===== BUTTONS =====
main.addEventListener("click", async (e) => {
  const row = e.target.closest("[data-open]");
  if (row && !e.target.closest("a")) {
    location.hash = "invoice/" + row.dataset.open;
    return;
  }
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id || editingId;

  if (action === "billNow") {
    const inv = Store.billNow(btn.dataset.sub);
    rememberEvents(Store.load());
    toast(inv.id + " created" + (inv.status === "sent" ? " and sent" : ""));
    return route();
  }
  if (action === "toggleSub" || action === "autoSend") {
    Store.update((data) => {
      const sub = data.subscriptions.find((x) => x.id === btn.dataset.sub);
      if (action === "toggleSub") sub.active = !sub.active;
      else sub.autoSend = btn.checked;
    });
    return route();
  }
  if (action === "addSvc") {
    const rows = document.getElementById("svcRows");
    rows.insertAdjacentHTML("beforeend", serviceRow({ name: "", price: 0, billing: "once", on: true }, rows.children.length));
    return rows.lastElementChild.querySelector("[data-k=name]").focus();
  }
  if (action === "removeSvc") return btn.closest(".svc-row").remove();
  if (action === "invoiceFor") return createFor(btn.dataset.id, true, "project");

  if (action === "confirm") {
    Store.update((data) => {
      const inv = Store.findInvoice(data, id);
      if (!inv || inv.status !== "processing") return;
      inv.status = "paid";
      inv.payment.paidAt = new Date().toISOString();
      Store.event(inv, "paid", "Payment confirmed · receipt issued");
    });
    toast(id + " marked paid");
    return route();
  }

  if (action === "refund") return doRefund(id);
  if (action === "declineRefund") {
    const v = await dialog({
      title: "Decline refund request",
      fields: [{ name: "why", label: "Reason (shown in the activity log)", type: "textarea", value: "Outside our refund terms" }],
      ok: "Decline request",
      danger: true,
    });
    if (!v) return;
    const why = v.why;
    Store.update((data) => {
      const inv = Store.findInvoice(data, id);
      inv.refundRequest.closed = true;
      inv.refundRequest.outcome = "declined";
      Store.event(inv, "refundDeclined", "Refund request declined" + (why ? " · " + why : ""));
    });
    toast("Refund request declined");
    return route();
  }

  if (action === "mode") {
    previewMode = btn.dataset.mode;
    return refreshEditor();
  }
  if (action === "print") return window.print();

  if (action === "copyLink") {
    const inv = Store.findInvoice(Store.load(), id);
    navigator.clipboard.writeText(clientLink(inv)).then(
      () => toast("Link copied"),
      () => toast("Couldn't copy. Select the link and copy it."),
    );
    return;
  }

  // The rest change the open invoice
  if (action === "addLine" || action === "removeLine" || action === "fromEstimate") {
    const cur = Store.load();
    if (priceLocked(cur, Store.findInvoice(cur, editingId))) return toast("This project's price is locked");
    let inv;
    Store.update((data) => {
      inv = Store.findInvoice(data, editingId);
      if (action === "addLine") inv.lines.push({ desc: "", qty: 1, price: 0 });
      if (action === "removeLine") inv.lines.splice(+btn.dataset.i, 1);
      if (action === "fromEstimate") {
        const est = linesFromEstimate(clientOf(data, inv.clientId));
        if (!est.lines.length) return;
        inv.lines = est.lines;
        inv.discount = est.discount;
      }
      syncProject(data, inv);
    });
    if (action === "fromEstimate") {
      const c = clientOf(Store.load(), inv.clientId);
      if (!c || !(c.estimate || []).length) toast("This client has no quiz estimate");
      return route(); // redraw discount field too
    }
    renderLines(inv, false);
    if (action === "addLine") document.querySelector(".line:last-child input").focus();
    return refreshEditor();
  }

  if (action === "send") {
    const ok = Store.update((data) => {
      const inv = Store.findInvoice(data, editingId);
      if (!inv.clientId || Store.totals(inv).total <= 0) return false;
      inv.status = "sent";
      Store.event(inv, "sent", "Invoice sent to client");
      return true;
    });
    if (!ok) return toast("Add a client and at least one priced line first");
    toast(editingId + " sent · share the link with your client");
    return route();
  }

  if (action === "manualPaid") {
    const v = await dialog({
      title: "Record a payment for " + editingId,
      text: "For payments made outside the invoice page, such as cash.",
      fields: [
        {
          name: "method", label: "How was it paid?", type: "select", value: "cash",
          options: [["cash", "Cash"], ["bank", "Bank transfer"], ["card", "Card"], ["paypal", "PayPal"], ["lynk", "Lynk"]].map(([value, label]) => ({ value, label })),
        },
        { name: "reference", label: "Reference (optional)" },
      ],
      ok: "Mark as paid",
    });
    if (!v) return;
    const { method, reference } = v;
    Store.update((data) => {
      const inv = Store.findInvoice(data, editingId);
      inv.status = "paid";
      inv.payment = { method: method.trim().toLowerCase(), reference, paidAt: new Date().toISOString() };
      Store.event(inv, "paid", "Payment recorded by you (" + method + ") · receipt issued");
    });
    toast("Payment recorded");
    return route();
  }

  if (action === "void") {
    if (!(await askConfirm("Void " + editingId + "?", "The client can no longer pay it.", "Void invoice", true))) return;
    Store.update((data) => {
      const inv = Store.findInvoice(data, editingId);
      inv.status = "void";
      Store.event(inv, "void", "Invoice voided");
    });
    return route();
  }

  if (action === "delete") {
    if (!(await askConfirm("Delete draft " + editingId + "?", "This can't be undone.", "Delete", true))) return;
    Store.update((data) => (data.invoices = data.invoices.filter((i) => i.id !== editingId)));
    toast(editingId + " deleted");
    location.hash = "invoices";
  }
});

// ===== LIVE UPDATES: another tab (the client's invoice page) changed the data =====
window.addEventListener("storage", (e) => {
  if (e.key !== Store.KEY) return;
  const data = Store.load();
  const fresh = [];
  data.invoices.forEach((inv) => {
    if (seenEvents[inv.id] !== undefined && inv.events.length > seenEvents[inv.id]) fresh.push(inv);
  });
  rememberEvents(data);

  // Keep the form intact while editing; redraw everything else
  if (location.hash.startsWith("#invoice/") && document.getElementById("edForm")) refreshEditor();
  else if (!/^#(settings|pricing)/.test(location.hash)) route();

  fresh.forEach((inv) => {
    toast(inv.id + ": " + lastEvent(inv).text);
    const el = document.querySelector("[data-track='" + CSS.escape(inv.id) + "']");
    if (el) {
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 2500);
    }
  });
});

function rememberEvents(data) {
  seenEvents = {};
  data.invoices.forEach((inv) => (seenEvents[inv.id] = inv.events.length));
}

// ===== DEMO DATA =====
document.getElementById("seedBtn").addEventListener("click", async () => {
  if (!(await askConfirm("Load sample data?", "Adds sample clients and invoices. Your own demo data is kept.", "Load samples"))) return;
  const ago = (days, hours = 0) => new Date(Date.now() - days * 864e5 - hours * 36e5).toISOString();
  const a = Store.addClient({
    name: "Andre Campbell", business: "Fresh Cutz Barbershop", phone: "876-555-0142", source: "quiz",
    siteType: "Small business", plan: "Monthly", planKey: "monthly",
    estimate: [
      { name: "Website build (home page plus one or two additional pages)", amount: 60000, billing: "once" },
      { name: "HTTPS and basic security", amount: 5000, billing: "once" },
      { name: "Basic SEO", amount: 8000, billing: "once" },
      { name: "Domain (1 year)", amount: 3000, billing: "once" },
      { name: "Advanced SEO", amount: 9000, billing: "recurring" },
    ],
  });
  const b = Store.addClient({ name: "Keisha Brown", phone: "876-555-0177", email: "keisha@example.com", source: "quiz", siteType: "Personal brand and portfolio" });
  const c = Store.addClient({ business: "Grace Chapel", name: "Pastor Reid", phone: "876-555-0110", source: "manual" });

  const p1 = Store.createProject(a.id, linesFromEstimate(a).lines, 0); // 3 payments
  const i1 = p1;
  const i2 = Store.createInvoice(b.id, [{ desc: "Portfolio website build", qty: 1, price: 40000 }, { desc: "Logo design", qty: 1, price: 15000 }]);
  const i3 = Store.createInvoice(c.id, [{ desc: "Church website (home page)", qty: 1, price: 50000 }]);
  Store.update((data) => {
    const set = (id, status, events, payment) => {
      const inv = Store.findInvoice(data, id);
      inv.status = status;
      inv.events = events.map(([at, type, text]) => ({ at, type, text }));
      if (payment) inv.payment = payment;
    };
    const [, i1b, i1c] = Store.projectInvoices(data, p1.projectId);
    set(i1.id, "processing", [
      [ago(3), "created", "Invoice created"], [ago(3, -1), "sent", "Invoice sent to client"],
      [ago(2), "viewed", "Client opened the invoice"], [ago(0, 2), "submitted", "Client sent a bank transfer · ref FC-2291"],
    ], { method: "bank", reference: "FC-2291" });
    set(i2.id, "paid", [
      [ago(9), "created", "Invoice created"], [ago(9, -1), "sent", "Invoice sent to client"],
      [ago(8), "viewed", "Client opened the invoice"], [ago(8, -2), "paid", "Card payment approved · receipt issued"],
    ], { method: "card", reference: "DEMO-4242", paidAt: ago(8, -2) });
    set(i3.id, "sent", [[ago(1), "created", "Invoice created"], [ago(0, 5), "sent", "Invoice sent to client"]]);
    void i1b, i1c; // half-completion and final payments stay as drafts until those stages
    Store.findInvoice(data, i3.id).discount = 15000;
    Store.findInvoice(data, i3.id).notes = "Community discount (30%) applied.";
  });
  // Andre's Advanced SEO bills monthly, starting today
  Store.createSubscription(a.id, [{ name: "Advanced SEO", monthly: 9000 }], "monthly", Store.isoDay(new Date()));
  Store.runSubscriptions();
  rememberEvents(Store.load());
  toast("Sample data added");
  route();
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!(await askConfirm("Reset the demo?", "Deletes all demo clients, invoices and settings in this browser. This can't be undone.", "Reset", true))) return;
  try {
    localStorage.removeItem(Store.KEY);
  } catch (err) {}
  rememberEvents(Store.load());
  toast("Demo reset");
  location.hash = "overview";
  route();
});

// ===== START =====
const dueNow = Store.runSubscriptions();
if (dueNow.length) setTimeout(() => toast(dueNow.length + " recurring invoice(s) created"), 400);
rememberEvents(Store.load());
route();
