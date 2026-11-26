// ===== DEMO DATA STORE (shared by the quiz, dashboard and invoice pages) =====
// Everything is saved in this browser only (localStorage). There is no server,
// so no real payments happen and nothing leaves the device.
// A real version needs a backend, a login for the dashboard and a payment provider.
// Do not type real bank details into files in this repo; enter them in Settings instead.

const Store = (() => {
  const KEY = "jdsd-demo-v1";

  const DEFAULT_SETTINGS = {
    businessName: "JD-Style and Design",
    tagline: "Modern websites, built to fit your business and your budget.",
    phone: "+1 (876) 506-0220",
    email: "jaheemstyle12@gmail.com",
    logoText: "JD",
    accent: "#d4a937",
    template: "modern", // "modern" or "classic"
    invoicePrefix: "INV",
    nextNumber: 1001,
    dueDays: 14,
    terms: "Payment due within 14 days. Work begins once the deposit is received.",
    thanks: "Thank you for choosing JD-Style and Design!",
    bank: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
      accountType: "Savings",
    },
    paypal: "", // e.g. paypal.me/yourname
    lynk: "", // e.g. @yourhandle
    methods: { bank: true, card: true, paypal: true, lynk: true },
    // Card and PayPal processing:
    //   "simulated"      - pretend checkout, nothing leaves the page
    //   "paypal-sandbox" - PayPal's test system: real checkout window, test cards, no real money
    processor: "paypal-sandbox",
    // "sb" is PayPal's shared sandbox ID. Paste your own sandbox app's client ID
    // (developer.paypal.com) to see test payments in your own sandbox account.
    paypalClientId: "sb",
    usdRate: 157, // J$ per US$1 (PayPal can't charge in Jamaican dollars) - check the current rate

    // Refunds (also described in terms.html - keep the two in step)
    refundDays: 14, // clients can ask for a refund up to this many days after paying
    commitmentNonRefundable: true, // the 15% commitment fee can't be refunded once work has started

    // ===== PRICING AND SERVICES (edited under Dashboard > Pricing) =====
    // The quiz, the home page and invoices all read these.
    catalog: {
      build: { personal: 40000, business: 60000, event: 30000, organisation: 50000, notsure: 45000 },
      https: 5000,
      seo: 8000,
      domain: 3000,
      logo: 15000,
      addons: {
        ownDomain: { price: 3000, on: true },
        advancedSeo: { price: 9000, on: true }, // monthly
        analytics: { price: 5000, on: true },
        socials: { price: 10000, on: true },
      },
      communityDiscount: 30, // % off the build for churches, schools, clubs and students
      communityDiscountOngoing: 40, // % off if they also take an ongoing plan
      planDiscounts: { "3months": 2000, "6months": 4000 },
      yearlyCap: 100000,
      schedule: [15, 35, 50], // project payments, must add up to 100
      // Extra services you can add to invoices (examples - edit or remove)
      services: [
        { name: "Extra revision", price: 5000, billing: "once", on: true },
        { name: "Extra page", price: 10000, billing: "once", on: true },
        { name: "Content updates (per hour)", price: 3000, billing: "once", on: true },
        { name: "Hosting and maintenance", price: 4000, billing: "monthly", on: true },
      ],
    },
  };

  // Steps shown in the payment progress view
  const PROGRESS = [
    { key: "created", label: "Created" },
    { key: "sent", label: "Sent" },
    { key: "viewed", label: "Viewed" },
    { key: "submitted", label: "Payment submitted" },
    { key: "paid", label: "Paid" },
  ];

  // Project payments: three invoices that always add up to 100% of the project
  const SCHEDULE = [
    { key: "commitment", label: "Commitment fee", pct: 15, when: "Due before work starts" },
    { key: "halfway", label: "Half-completion payment", pct: 35, when: "Due when the site is halfway done" },
    { key: "final", label: "Final payment", pct: 50, when: "Due on completion, before ownership is transferred" },
  ];

  // Billing cycles for recurring services (keep in step with PLAN_* in js/quiz.js)
  const CYCLES = {
    biweekly: { label: "Bi-weekly", days: 14, months: 0.5 },
    monthly: { label: "Monthly", monthsStep: 1, months: 1 },
    "3months": { label: "Every 3 months", monthsStep: 3, months: 3, discount: 2000 },
    "6months": { label: "Every 6 months", monthsStep: 6, months: 6, discount: 4000 },
    yearly: { label: "Yearly", monthsStep: 12, months: 12, cap: 100000 },
  };

  const METHODS = {
    bank: "Bank transfer",
    card: "Credit / debit card (Visa, Mastercard)",
    paypal: "PayPal",
    lynk: "Lynk",
  };

  function blank() {
    const data = { settings: structuredClone(DEFAULT_SETTINGS), clients: [], invoices: [], subscriptions: [] };
    applyCatalog(data.settings.catalog);
    return data;
  }

  // Saved values over the defaults, keeping new default keys (objects only; arrays are replaced)
  function merge(base, saved) {
    if (!saved || typeof saved !== "object" || Array.isArray(base)) return saved ?? base;
    const out = { ...base };
    Object.keys(saved).forEach((k) => {
      out[k] = base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) ? merge(base[k], saved[k]) : saved[k];
    });
    return out;
  }

  // Push catalog numbers into the payment schedule and billing cycles
  function applyCatalog(cat) {
    SCHEDULE.forEach((s, i) => (s.pct = cat.schedule[i]));
    CYCLES["3months"].discount = cat.planDiscounts["3months"];
    CYCLES["6months"].discount = cat.planDiscounts["6months"];
    CYCLES.yearly.cap = cat.yearlyCap;
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (!data) return blank();
      data.settings = { ...structuredClone(DEFAULT_SETTINGS), ...data.settings };
      data.settings.bank = { ...DEFAULT_SETTINGS.bank, ...data.settings.bank };
      data.settings.methods = { ...DEFAULT_SETTINGS.methods, ...data.settings.methods };
      data.settings.catalog = merge(structuredClone(DEFAULT_SETTINGS.catalog), data.settings.catalog);
      applyCatalog(data.settings.catalog);
      data.clients = data.clients || [];
      data.invoices = data.invoices || [];
      data.subscriptions = data.subscriptions || [];
      return data;
    } catch (e) {
      return blank();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* storage blocked: the demo still works until the page closes */
    }
  }

  // Run a change against fresh data and save it (keeps other tabs' changes)
  function update(fn) {
    const data = load();
    const result = fn(data);
    save(data);
    return result;
  }

  // ===== IDs =====
  // Client ID: JD- plus 6 characters, no look-alike letters (0/O, 1/I/L)
  const ID_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  function newClientId(data) {
    let id;
    do {
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      id = "JD-" + [...bytes].map((b) => ID_CHARS[b % ID_CHARS.length]).join("");
    } while (data.clients.some((c) => c.id === id));
    return id;
  }

  function newInvoiceNumber(data) {
    const n = data.settings.nextNumber++;
    return data.settings.invoicePrefix + "-" + n;
  }

  // ===== CLIENTS =====
  function addClient(details) {
    return update((data) => {
      const client = {
        id: newClientId(data),
        name: details.name || "",
        business: details.business || "",
        phone: details.phone || "",
        email: details.email || "",
        source: details.source || "manual",
        siteType: details.siteType || "",
        plan: details.plan || "",
        planKey: details.planKey || "", // billing cycle chosen in the quiz (see CYCLES)
        estimate: details.estimate || [],
        agreedToTerms: details.agreedToTerms || "", // when they ticked the terms box
        createdAt: new Date().toISOString(),
      };
      data.clients.unshift(client);
      return client;
    });
  }

  function clientLabel(c) {
    if (!c) return "Unknown client";
    if (c.business && c.name) return c.business + " (" + c.name + ")";
    return c.business || c.name || c.id;
  }

  // ===== INVOICES =====
  function event(inv, type, text) {
    inv.events.push({ at: new Date().toISOString(), type, text });
  }

  // Make one invoice inside an update. extra adds fields such as stage or period.
  function makeInvoice(data, clientId, lines, extra) {
    const today = new Date();
    const due = new Date(today.getTime() + data.settings.dueDays * 864e5);
    const inv = {
      id: newInvoiceNumber(data),
      clientId,
      kind: "standard", // "standard", "project" (one of 3 payments) or "recurring"
      status: "draft",
      issueDate: isoDay(today),
      dueDate: isoDay(due),
      lines: lines && lines.length ? lines : [{ desc: "Website build", qty: 1, price: 0 }],
      discount: 0,
      taxRate: 0,
      notes: "",
      payment: null,
      events: [],
      ...extra,
    };
    event(inv, "created", extra && extra.createdText ? extra.createdText : "Invoice created");
    delete inv.createdText;
    data.invoices.unshift(inv);
    return inv;
  }

  function createInvoice(clientId, lines, extra) {
    return update((data) => makeInvoice(data, clientId, lines, extra));
  }

  // A project: three linked invoices (15% / 35% / 50%) sharing the same lines.
  // Returns the commitment fee invoice (the one to send first).
  function createProject(clientId, lines, discount) {
    return update((data) => {
      const projectId = "PRJ-" + data.settings.nextNumber;
      const made = SCHEDULE.map((s, stage) =>
        makeInvoice(data, clientId, structuredClone(lines), {
          kind: "project",
          projectId,
          stage,
          pcts: SCHEDULE.map((x) => x.pct), // fixed at creation, so later price changes don't alter it
          discount: discount || 0,
          createdText: s.label + " invoice created (" + s.pct + "%)",
        }),
      );
      return made[0];
    });
  }

  function findInvoice(data, id) {
    return data.invoices.find((i) => i.id === id);
  }

  // The three invoices of a project, in payment order
  function projectInvoices(data, projectId) {
    return data.invoices.filter((i) => i.projectId === projectId).sort((a, b) => a.stage - b.stage);
  }

  // Totals. For a project payment, "total" is this payment's share and
  // "projectTotal" is the whole project. The final payment takes any rounding,
  // so the three always add up to exactly 100%.
  function totals(inv) {
    const subtotal = inv.lines.reduce((s, l) => s + (+l.qty || 0) * (+l.price || 0), 0);
    const discount = Math.min(+inv.discount || 0, subtotal);
    const tax = Math.round((subtotal - discount) * ((+inv.taxRate || 0) / 100));
    const full = subtotal - discount + tax;
    if (inv.kind !== "project") return { subtotal, discount, tax, total: full, projectTotal: full };
    const pcts = inv.pcts || SCHEDULE.map((s) => s.pct);
    const shares = pcts.map((p) => Math.round((full * p) / 100));
    shares[2] = full - shares[0] - shares[1];
    return { subtotal, discount, tax, total: shares[inv.stage], projectTotal: full, shares, pcts };
  }

  // ===== RECURRING SERVICES (subscriptions) =====
  function isoDay(d) {
    return d.toISOString().slice(0, 10);
  }
  function parseDay(s) {
    return new Date(s + "T12:00:00");
  }
  // The date one cycle after `day`
  function nextCycleDate(day, cycle) {
    const c = CYCLES[cycle];
    const d = parseDay(day);
    if (c.days) d.setDate(d.getDate() + c.days);
    else d.setMonth(d.getMonth() + c.monthsStep);
    return isoDay(d);
  }

  // Lines and discount for one billing cycle: monthly price x months,
  // minus the plan discount, capped, rounded to the nearest hundred (same as the quiz)
  function cycleBill(items, cycle) {
    const c = CYCLES[cycle];
    const monthly = items.reduce((s, it) => s + it.monthly, 0);
    const lines = items.map((it) =>
      c.days
        ? { desc: it.name + " (2 weeks)", qty: 1, price: Math.round(it.monthly / 2) }
        : { desc: it.name + " (" + c.months + (c.months === 1 ? " month)" : " months)"), qty: c.months, price: it.monthly },
    );
    const gross = lines.reduce((s, l) => s + l.qty * l.price, 0);
    let amount = monthly * c.months - (c.discount || 0);
    if (c.cap) amount = Math.min(amount, c.cap);
    amount = Math.round(amount / 100) * 100;
    return { lines, discount: Math.max(0, gross - amount), amount };
  }

  function createSubscription(clientId, items, cycle, startDate) {
    return update((data) => {
      const sub = {
        id: "SUB-" + (data.subscriptions.length + 101),
        clientId,
        items, // [{ name, monthly }]
        cycle,
        startDate,
        nextDate: startDate, // date the next invoice is issued
        active: true,
        autoSend: true,
        createdAt: new Date().toISOString(),
      };
      data.subscriptions.unshift(sub);
      return sub;
    });
  }

  // Make the invoice for a subscription's next cycle, then move on a cycle
  function billCycle(data, sub) {
    const c = CYCLES[sub.cycle];
    const bill = cycleBill(sub.items, sub.cycle);
    const end = parseDay(nextCycleDate(sub.nextDate, sub.cycle));
    end.setDate(end.getDate() - 1);
    const inv = makeInvoice(data, sub.clientId, bill.lines, {
      kind: "recurring",
      subscriptionId: sub.id,
      cycle: sub.cycle,
      period: { from: sub.nextDate, to: isoDay(end) },
      discount: bill.discount,
      issueDate: sub.nextDate,
      dueDate: isoDay(new Date(parseDay(sub.nextDate).getTime() + data.settings.dueDays * 864e5)),
      notes: c.label + " billing for your recurring services." + (bill.discount ? " Plan discount applied." : ""),
      createdText: c.label + " invoice created (" + sub.id + ")",
    });
    if (sub.autoSend) {
      inv.status = "sent";
      event(inv, "sent", "Sent automatically on the " + c.label.toLowerCase() + " cycle");
    }
    sub.nextDate = nextCycleDate(sub.nextDate, sub.cycle);
    return inv;
  }

  // Create every invoice that has come due (call when the dashboard opens)
  function runSubscriptions() {
    const today = isoDay(new Date());
    return update((data) => {
      const made = [];
      data.subscriptions.forEach((sub) => {
        let guard = 0;
        while (sub.active && sub.nextDate <= today && guard++ < 60) made.push(billCycle(data, sub));
      });
      return made;
    });
  }

  // Bill the next cycle straight away (handy for the demo)
  function billNow(subId) {
    return update((data) => {
      const sub = data.subscriptions.find((s) => s.id === subId);
      return sub ? billCycle(data, sub) : null;
    });
  }

  // Index of the furthest progress step reached
  function progressIndex(inv) {
    const order = { draft: 0, sent: 1, viewed: 2, processing: 3, paid: 4 };
    return order[inv.status] ?? 0;
  }

  // ===== HELPERS =====
  function money(n) {
    const text = "J$" + Math.abs(Math.round(n)).toLocaleString();
    return n < 0 ? "−" + text : text;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
    );
  }

  function niceDate(iso) {
    if (!iso) return "";
    const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function niceTime(iso) {
    const d = new Date(iso);
    return niceDate(iso) + ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  // Which payment methods the client can use (enabled and set up)
  function availableMethods(settings) {
    const m = settings.methods;
    const sandbox = settings.processor === "paypal-sandbox" && settings.paypalClientId;
    const list = [];
    if (m.bank && settings.bank.accountNumber) list.push("bank");
    if (m.card) list.push("card");
    if (m.paypal && (settings.paypal || sandbox)) list.push("paypal");
    if (m.lynk && settings.lynk) list.push("lynk");
    return list;
  }

  // ===== INVOICE / RECEIPT DOCUMENT (same template on the dashboard and client page) =====
  // schedule: the project's three invoices (for project payments), so the
  // document can show which payments are done
  function documentHTML(inv, client, settings, asReceipt, schedule) {
    const t = totals(inv);
    const c = client || {};
    const paid = inv.status === "paid";
    const receipt = asReceipt && paid;
    const title = receipt ? "Receipt" : "Invoice";
    const isProject = inv.kind === "project";
    const stage = isProject ? SCHEDULE[inv.stage] : null;
    const stageText = stage ? stage.label + " (" + t.pcts[inv.stage] + "%)" : "";

    // What this invoice is for, under the number
    let subtitle = "";
    if (stage) subtitle = "<p class='doc-kind'>" + esc(stageText) + "</p>";
    if (inv.kind === "recurring" && inv.period) {
      subtitle =
        "<p class='doc-kind'>" + esc(CYCLES[inv.cycle].label) + " · " + esc(niceDate(inv.period.from)) +
        " – " + esc(niceDate(inv.period.to)) + "</p>";
    }

    // Payment schedule table (project payments only)
    let scheduleBlock = "";
    if (isProject) {
      const list = schedule && schedule.length === 3 ? schedule : null;
      scheduleBlock =
        "<div class='doc-schedule'><h4>Payment schedule · project total " + money(t.projectTotal) + "</h4><table>" +
        SCHEDULE.map((s, i) => {
          const sib = list ? list[i] : null;
          const state = sib ? (sib.status === "paid" ? "Paid" : sib.status === "void" ? "Void" : i === inv.stage ? "This invoice" : "Upcoming") : i === inv.stage ? "This invoice" : "";
          return (
            "<tr class='" + (i === inv.stage ? "this" : "") + (sib && sib.status === "paid" ? " done" : "") + "'><td>" +
            (i + 1) + ". " + esc(s.label) + "<small>" + esc(s.when) + "</small></td><td class='num'>" + t.pcts[i] +
            "%</td><td class='num'>" + money(t.shares[i]) + "</td><td class='num'>" + esc(state) + "</td></tr>"
          );
        }).join("") +
        "<tr class='sum'><td>Total</td><td class='num'>100%</td><td class='num'>" + money(t.projectTotal) +
        "</td><td></td></tr></table></div>";
    }
    const rows = inv.lines
      .map(
        (l) =>
          "<tr><td>" + esc(l.desc) + "</td><td class='num'>" + esc(l.qty) +
          "</td><td class='num'>" + money(+l.price || 0) + "</td><td class='num'>" +
          money((+l.qty || 0) * (+l.price || 0)) + "</td></tr>",
      )
      .join("");

    const bank = settings.bank;
    const bankBlock =
      !receipt && settings.methods.bank && bank.accountNumber
        ? "<div class='doc-pay'><h4>Bank deposit details</h4><p>" +
          esc(bank.bankName) + (bank.branch ? ", " + esc(bank.branch) : "") + "<br>" +
          esc(bank.accountName) + "<br>" + esc(bank.accountType) + " account: " +
          esc(bank.accountNumber) + "<br><small>Use <b>" + esc(inv.id) +
          "</b> as the payment reference.</small></p></div>"
        : "";

    const paidBlock = receipt
      ? "<div class='doc-paid'><span class='stamp'>PAID</span><p>Paid " +
        esc(niceDate(inv.payment.paidAt)) + " by " + esc(METHODS[inv.payment.method] || inv.payment.method) +
        (inv.payment.usd ? " (charged US$" + esc(inv.payment.usd) + ")" : "") +
        (inv.payment.sandbox ? "<br><small>PayPal sandbox test payment</small>" : "") +
        (inv.payment.reference ? "<br>Reference: " + esc(inv.payment.reference) : "") + "</p></div>"
      : "";

    const r = refundInfo(inv, settings);
    const refundBlock = r.refunded
      ? "<div class='doc-refund'><h4>Refunds</h4>" +
        inv.refunds.map((x) => "<p>" + money(x.amount) + " refunded " + esc(niceDate(x.at)) + (x.reason ? " · " + esc(x.reason) : "") + "</p>").join("") +
        "<p><b>Net paid " + money(r.net) + "</b></p></div>"
      : "";
    const policy =
      "Refunds can be requested within " + settings.refundDays + " days of payment" +
      (settings.commitmentNonRefundable ? "; the commitment fee is non-refundable once work has started" : "") + ". " +
      (receipt ? "" : "By paying this invoice you agree to our ") + "Terms and Conditions: " + termsUrl() + ".";

    return (
      "<article class='doc doc-" + esc(settings.template) + (receipt ? " is-receipt" : "") +
      "' style='--accent:" + esc(settings.accent) + "'>" +
      "<header class='doc-head'><div class='doc-brand'><span class='doc-logo'>" + esc(settings.logoText) +
      "</span><div><strong>" + esc(settings.businessName) + "</strong><small>" + esc(settings.tagline) +
      "</small></div></div><div class='doc-title'><h2>" + title + "</h2><p>" +
      (receipt ? "Receipt for " : "") + esc(inv.id) + "</p>" + subtitle + "</div></header>" +
      "<section class='doc-meta'><div><h4>Billed to</h4><p>" + esc(c.business || "") +
      (c.business && c.name ? "<br>" : "") + esc(c.name || "") + "<br>" + esc(c.phone || "") +
      (c.email ? "<br>" + esc(c.email) : "") + "</p></div><div class='doc-dates'><p><span>Issued</span>" +
      esc(niceDate(inv.issueDate)) + "</p><p><span>" + (receipt ? "Paid" : "Due") + "</span>" +
      esc(niceDate(receipt ? inv.payment.paidAt : inv.dueDate)) + "</p><p><span>Amount</span><b>" +
      money(t.total) + "</b></p></div></section>" +
      "<table class='doc-lines'><thead><tr><th>Description</th><th class='num'>Qty</th><th class='num'>Price</th><th class='num'>Amount</th></tr></thead><tbody>" +
      rows + "</tbody></table>" +
      "<div class='doc-totals'><p><span>Subtotal</span>" + money(t.subtotal) + "</p>" +
      (t.discount ? "<p><span>Discount</span>−" + money(t.discount) + "</p>" : "") +
      (t.tax ? "<p><span>GCT (" + esc(inv.taxRate) + "%)</span>" + money(t.tax) + "</p>" : "") +
      (isProject ? "<p class='project'><span>Project total</span>" + money(t.projectTotal) + "</p>" : "") +
      "<p class='grand'><span>" + (isProject ? esc(stageText) + (receipt ? " paid" : " due") : receipt ? "Total paid" : "Total due") +
      "</span>" + money(t.total) + "</p></div>" +
      scheduleBlock + paidBlock + refundBlock + bankBlock +
      (inv.notes ? "<div class='doc-notes'><h4>Notes</h4><p>" + esc(inv.notes) + "</p></div>" : "") +
      "<footer class='doc-foot'><p>" + esc(receipt ? settings.thanks : settings.terms) + "</p><p>" +
      esc(settings.phone) + " · " + esc(settings.email) + "</p>" +
      "<p class='fine'>" + esc(policy) + "</p>" +
      "<p class='fine'>Client ID: " + esc(inv.clientId) + " · " + title + " " + esc(inv.id) + "</p></footer></article>"
    );
  }

  // ===== REFUNDS =====
  // Rules: a refund can be asked for within settings.refundDays of payment.
  // With commitmentNonRefundable on, the project's commitment fee can't be refunded.
  function refundInfo(inv, settings) {
    const out = { paid: inv.status === "paid", refunded: 0, net: 0, windowOpen: false, deadline: null, eligible: false, why: "" };
    if (!out.paid || !inv.payment) return out;
    const total = totals(inv).total;
    out.refunded = (inv.refunds || []).reduce((s, x) => s + x.amount, 0);
    out.net = total - out.refunded;
    const deadline = new Date(new Date(inv.payment.paidAt).getTime() + settings.refundDays * 864e5);
    out.deadline = deadline.toISOString();
    out.windowOpen = Date.now() <= deadline.getTime();
    const commitment = inv.kind === "project" && inv.stage === 0 && settings.commitmentNonRefundable;
    if (out.net <= 0) out.why = "Fully refunded";
    else if (commitment) out.why = "The commitment fee is non-refundable";
    else if (!out.windowOpen) out.why = "The " + settings.refundDays + "-day refund window closed " + niceDate(out.deadline);
    out.eligible = !out.why;
    return out;
  }

  // Status for lists: refunds show on top of "paid"
  function displayStatus(inv) {
    if (inv.status !== "paid" || !(inv.refunds || []).length) {
      if (inv.status === "paid" && inv.refundRequest && !inv.refundRequest.closed) return "refundRequested";
      return inv.status;
    }
    const net = totals(inv).total - inv.refunds.reduce((s, x) => s + x.amount, 0);
    return net <= 0 ? "refunded" : "partRefunded";
  }

  function termsUrl() {
    try {
      return new URL("terms.html", location.href).href;
    } catch (e) {
      return "terms.html";
    }
  }

  // Short label for lists: "Commitment fee · 15%" or "Monthly · Dec 1 – Dec 31"
  function kindLabel(inv) {
    if (inv.kind === "project")
      return SCHEDULE[inv.stage].label + " · " + (inv.pcts || SCHEDULE.map((s) => s.pct))[inv.stage] + "%";
    if (inv.kind === "recurring" && inv.period)
      return CYCLES[inv.cycle].label + " · " + niceDate(inv.period.from) + " – " + niceDate(inv.period.to);
    return "";
  }

  return {
    load, save, update, addClient, clientLabel, createInvoice, createProject, projectInvoices,
    findInvoice, event, totals, progressIndex, money, esc, niceDate, niceTime, availableMethods,
    documentHTML, kindLabel, createSubscription, runSubscriptions, billNow, cycleBill, nextCycleDate,
    isoDay, refundInfo, displayStatus, termsUrl, PROGRESS, METHODS, SCHEDULE, CYCLES, KEY, blank,
  };
})();
