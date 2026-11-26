// ===== CLIENT INVOICE PAGE (demo) =====
// invoice.html?id=INV-1001
// The client views the invoice and picks a payment method. Every step is saved
// to the shared demo store, so the owner's dashboard updates live.
// DEMO ONLY: no card numbers are asked for and no money moves. A real version
// would hand card and PayPal payments to the provider's own secure checkout.

const { esc, money, niceDate, niceTime } = Store;
const page = document.getElementById("page");
const invoiceId = new URLSearchParams(location.search).get("id");
let chosen = null; // payment method being shown
let busy = false; // a simulated payment is running
let agreed = false; // ticked "I agree to the Terms and Conditions"

function toast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
}

// Record something on the invoice (the dashboard sees it straight away)
function record(change) {
  return Store.update((data) => {
    const inv = Store.findInvoice(data, invoiceId);
    if (inv) change(inv);
    return inv;
  });
}

// ===== FIRST OPEN: mark the invoice as viewed =====
record((inv) => {
  if (inv.status === "sent") {
    inv.status = "viewed";
    Store.event(inv, "viewed", "Client opened the invoice");
  }
});

// ===== DRAW THE PAGE =====
function render() {
  const data = Store.load();
  const inv = Store.findInvoice(data, invoiceId);
  if (!inv || inv.status === "draft") {
    page.innerHTML =
      "<section class='section glass'><h1>Invoice not found</h1><p class='hint'>Check the link you were sent, " +
      "or contact us. (In this demo, invoice links only open in the browser where the dashboard is.)</p></section>";
    return;
  }
  const s = data.settings;
  const client = data.clients.find((c) => c.id === inv.clientId);
  const t = Store.totals(inv);
  const paid = inv.status === "paid";

  page.innerHTML =
    "<header class='pay-top'><a href='index.html'>" + esc(s.businessName) + "</a><span class='badge'>Demo</span></header>" +
    "<section class='section glass'>" +
    "<div class='view-head'><h1 style='font-size:1.3rem'>" + (paid ? "Receipt for " : "Invoice ") + esc(inv.id) + "</h1>" +
    "<button class='btn ghost small' id='printBtn'>" + (paid ? "Save receipt / print" : "Save / print") + "</button></div>" +
    progressHTML(inv) +
    "<p class='fine' style='margin-top:0.6rem'>Client ID: " + esc(inv.clientId) + "</p></section>" +
    "<div class='pay-layout'><div class='print-area'>" +
    Store.documentHTML(inv, client, s, paid, inv.kind === "project" ? Store.projectInvoices(data, inv.projectId) : null) +
    "</div><aside class='pay-box glass' id='payBox'>" + payBoxHTML(inv, s, t) + "</aside></div>";

  // Card or PayPal chosen with the sandbox on: draw PayPal's checkout button
  const payable = ["sent", "viewed"].includes(inv.status);
  if (payable && sandboxOn(s) && (chosen === "card" || chosen === "paypal")) mountPayPal(chosen);
}

function progressHTML(inv) {
  const at = Store.progressIndex(inv);
  return (
    "<ol class='progress" + (inv.status === "paid" ? " paid" : "") + "'>" +
    Store.PROGRESS.map(
      (p, i) => "<li class='" + (i <= at ? "done" : "") + (i === at ? " current" : "") + "'>" + p.label + "</li>",
    ).join("") +
    "</ol>"
  );
}

function payBoxHTML(inv, s, t) {
  if (inv.status === "paid") {
    return (
      "<h2>Paid, thank you!</h2><div class='state-box ok'><p>We received " + money(t.total) + " on " +
      esc(niceDate(inv.payment.paidAt)) + " by " + esc(Store.METHODS[inv.payment.method] || inv.payment.method) +
      ".</p></div><p class='hint'>Your receipt is on this page. Save or print it for your records.</p>" +
      refundBoxHTML(inv, s) +
      "<p class='fine'>Client ID: " + esc(inv.clientId) + " · Receipt " + esc(inv.id) + "</p>"
    );
  }
  if (inv.status === "void") {
    return "<h2>This invoice was cancelled</h2><p class='hint'>Please contact us if you have questions.</p>";
  }
  if (inv.status === "processing") {
    return (
      "<h2>Payment submitted</h2><div class='state-box'><p>You told us you paid by <b>" +
      esc(Store.METHODS[inv.payment.method]) + "</b>" +
      (inv.payment.reference ? " (reference " + esc(inv.payment.reference) + ")" : "") +
      ". We'll confirm once it arrives, and your receipt will appear here.</p></div>" +
      "<p class='hint'>Submitted " + esc(niceTime(inv.events[inv.events.length - 1].at)) + "</p>" +
      "<p class='fine'>Client ID: " + esc(inv.clientId) + " · Invoice " + esc(inv.id) + "</p>"
    );
  }

  const methods = Store.availableMethods(s);
  if (!methods.length) {
    return "<h2>Amount due</h2><p class='amount-due'>" + money(t.total) + "</p><p class='hint'>Please contact us to arrange payment.</p>";
  }
  return (
    "<div><h2>" + (Store.kindLabel(inv) ? esc(Store.kindLabel(inv)) : "Amount due") + "</h2><p class='amount-due'>" +
    money(t.total) + "</p><p class='hint'>Due " + esc(niceDate(inv.dueDate)) +
    (inv.kind === "project" ? " · project total " + money(t.projectTotal) : "") + "</p></div>" +
    "<label class='agree'><input type='checkbox' id='agree'" + (agreed ? " checked" : "") + "> I agree to the " +
    "<a href='terms.html' target='_blank' rel='noopener'>Terms and Conditions</a>, including the " + s.refundDays +
    "-day refund policy</label>" +
    "<div class='methods" + (agreed ? "" : " locked") + "'>" + methods.map((m) => methodButton(m)).join("") + "</div>" +
    (agreed && chosen && methods.includes(chosen)
      ? methodPanel(chosen, inv, s, t)
      : "<p class='hint'>" + (agreed ? "Choose how you'd like to pay." : "Tick the box above to choose how to pay.") + "</p>") +
    "<p class='fine'>Client ID: " + esc(inv.clientId) + " · Invoice " + esc(inv.id) + "</p>"
  );
}

// ===== REFUNDS (client side) =====
function refundBoxHTML(inv, s) {
  const r = Store.refundInfo(inv, s);
  const req = inv.refundRequest;
  let html = "";
  if (r.refunded) html += "<div class='state-box'><p>" + money(r.refunded) + " has been refunded. Net paid " + money(r.net) + ".</p></div>";
  if (req && !req.closed) {
    return html + "<div class='state-box'><p><b>Refund requested</b> " + esc(niceDate(req.at)) + ". We'll get back to you soon.</p></div>";
  }
  if (req && req.outcome === "declined") {
    html += "<p class='hint'>Your refund request was reviewed and declined. Please contact us if you have questions.</p>";
  }
  if (r.eligible && !(req && req.outcome === "declined")) {
    html +=
      "<details class='refund-ask'><summary>Request a refund</summary>" +
      "<p class='hint'>You can ask for a refund until " + esc(niceDate(r.deadline)) + " (" + s.refundDays +
      " days after payment). See our <a href='terms.html' target='_blank' rel='noopener'>refund terms</a>.</p>" +
      "<label class='field'>Reason<textarea id='refundReason' placeholder='Tell us what went wrong'></textarea></label>" +
      "<button class='btn ghost' data-refund-ask>Send refund request</button></details>";
  } else if (!r.refunded && r.why) {
    html += "<p class='hint'>Refunds: " + esc(r.why) + ".</p>";
  }
  return html;
}

const MARKS = {
  bank: "<span class='mark bank'>BANK</span>",
  card: "<span class='mark'>VISA</span><span class='mark mc'>MASTERCARD</span>",
  paypal: "<span class='mark pp'>PayPal</span>",
  lynk: "<span class='mark lynk'>lynk</span>",
};
const METHOD_SUB = {
  bank: "Transfer or deposit to our account",
  card: "Credit or debit card",
  paypal: "Pay with your PayPal account",
  lynk: "Send from your Lynk wallet",
};

function methodButton(m) {
  const label = m === "card" ? "Card" : Store.METHODS[m];
  return (
    "<button type='button' class='method' data-method='" + m + "' aria-pressed='" + (chosen === m) +
    "'><span><b>" + esc(label) + "</b><small>" + METHOD_SUB[m] + "</small></span><span class='marks'>" +
    MARKS[m] + "</span></button>"
  );
}

function methodPanel(m, inv, s, t) {
  if (m === "bank") {
    const b = s.bank;
    return (
      "<div class='method-panel'><dl>" +
      "<dt>Bank</dt><dd>" + esc(b.bankName) + (b.branch ? ", " + esc(b.branch) : "") + "</dd>" +
      "<dt>Name</dt><dd>" + esc(b.accountName) + "</dd>" +
      "<dt>Account</dt><dd>" + esc(b.accountType) + " · " + esc(b.accountNumber) + "</dd>" +
      "<dt>Amount</dt><dd>" + money(t.total) + "</dd>" +
      "<dt>Reference</dt><dd>" + esc(inv.id) + "</dd></dl>" +
      "<label class='field'>Your transfer reference (optional)<input id='payRef' placeholder='From your bank receipt'></label>" +
      "<button class='btn' data-submit='bank'>I've sent the transfer</button></div>"
    );
  }
  if (m === "lynk") {
    return (
      "<div class='method-panel'><dl>" +
      "<dt>Send to</dt><dd>" + esc(s.lynk) + "</dd><dt>Amount</dt><dd>" + money(t.total) + "</dd>" +
      "<dt>Note</dt><dd>" + esc(inv.id) + "</dd></dl>" +
      "<label class='field'>Lynk transaction ID (optional)<input id='payRef'></label>" +
      "<button class='btn' data-submit='lynk'>I've sent it on Lynk</button></div>"
    );
  }
  if (m === "paypal") {
    if (sandboxOn(s)) return sandboxPanel("paypal", t, s);
    return (
      "<div class='method-panel'><p>You'll pay " + money(t.total) + " to <b>" + esc(s.paypal) + "</b>.</p>" +
      "<p class='demo-note'>Demo: no PayPal window opens and no money moves.</p>" +
      "<button class='btn' data-submit='paypal'>Continue to PayPal</button></div>"
    );
  }
  if (sandboxOn(s)) return sandboxPanel("card", t, s);
  return (
    "<div class='method-panel'><p>Pay " + money(t.total) + " by Visa or Mastercard, credit or debit.</p>" +
    "<p class='demo-note'>Demo: no card details are collected. A real site sends you to the payment provider's secure checkout.</p>" +
    "<button class='btn' data-submit='card'>Pay " + money(t.total) + " by card</button></div>"
  );
}

// ===== PAYPAL SANDBOX (cards and PayPal) =====
// PayPal's own checkout collects the card details, so they never touch this site.
// Sandbox = test mode: use PayPal's test card numbers; no real money moves.
// Going live needs a PayPal Business account and a small server to create and
// capture orders, so the secret key is never in the website.
function sandboxOn(s) {
  return s.processor === "paypal-sandbox" && !!s.paypalClientId;
}

function usdFor(t, s) {
  return (t.total / (s.usdRate || 157)).toFixed(2);
}

function sandboxPanel(method, t, s) {
  return (
    "<div class='method-panel'>" +
    "<p>" + (method === "card" ? "Pay by Visa or Mastercard, credit or debit. No PayPal account needed." : "Log in to PayPal to pay.") + "</p>" +
    "<p>You'll be charged <b>US$" + usdFor(t, s) + "</b> (" + money(t.total) + " at J$" + esc(s.usdRate) + " per US$1).</p>" +
    "<div id='ppButtons' class='pp-buttons'><div class='processing'><span class='spinner'></span><span>Loading secure checkout…</span></div></div>" +
    "<p class='demo-note'>PayPal sandbox: test payments only, no real money moves.</p></div>"
  );
}

let paypalLoading = null;
function loadPayPal(clientId) {
  if (paypalLoading) return paypalLoading;
  paypalLoading = new Promise((resolve, reject) => {
    const sdk = document.createElement("script");
    sdk.src =
      "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(clientId) +
      "&currency=USD&intent=capture&components=buttons&enable-funding=card&disable-funding=paylater,venmo,credit";
    sdk.onload = () => resolve(window.paypal);
    sdk.onerror = () => {
      paypalLoading = null;
      reject(new Error("PayPal didn't load"));
    };
    document.head.appendChild(sdk);
  });
  return paypalLoading;
}

// Draw PayPal's button for the chosen method into #ppButtons
async function mountPayPal(method) {
  const box = document.getElementById("ppButtons");
  if (!box) return;
  const data = Store.load();
  const s = data.settings;
  const inv = Store.findInvoice(data, invoiceId);
  const t = Store.totals(inv);
  let paypal;
  try {
    paypal = await loadPayPal(s.paypalClientId);
  } catch (err) {
    box.innerHTML = "<p class='demo-note'>Couldn't reach PayPal. Check your connection, or pay by bank transfer.</p>";
    return;
  }
  if (!document.body.contains(box)) return; // page redrawn while loading
  const label = method === "card" ? "Card" : "PayPal";
  const buttons = paypal.Buttons({
    fundingSource: method === "card" ? paypal.FUNDING.CARD : paypal.FUNDING.PAYPAL,
    style: { layout: "vertical", shape: "pill", label: "pay", color: method === "card" ? "black" : "gold" },
    onClick: () => {
      busy = true; // keep the buttons on screen while the checkout is open
      record((i) => Store.event(i, "checkout", "Client opened " + label + " checkout (sandbox)"));
    },
    createOrder: (d, actions) =>
      actions.order.create({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: inv.id,
            custom_id: inv.clientId, // client ID travels with the payment
            description: (s.businessName + " · " + inv.id + (Store.kindLabel(inv) ? " · " + Store.kindLabel(inv) : "")).slice(0, 127),
            amount: { currency_code: "USD", value: usdFor(t, s) },
          },
        ],
        application_context: { shipping_preference: "NO_SHIPPING" },
      }),
    onApprove: (d, actions) =>
      actions.order.capture().then((order) => {
        const capture = order.purchase_units[0].payments.captures[0];
        record((i) => {
          i.status = "paid";
          i.payment = {
            method,
            reference: capture.id,
            paidAt: new Date().toISOString(),
            usd: capture.amount.value,
            sandbox: true,
          };
          Store.event(i, "paid", label + " payment captured (sandbox) · US$" + capture.amount.value + " · " + capture.id + " · receipt issued");
        });
        busy = false;
        toast("Payment approved");
        render();
      }),
    onCancel: () => {
      busy = false;
      record((i) => Store.event(i, "checkout", "Client closed the " + label + " checkout without paying"));
    },
    onError: (err) => {
      busy = false;
      console.error(err);
      record((i) => Store.event(i, "failed", label + " payment failed (sandbox)"));
      toast("The payment didn't go through. Please try again.");
    },
  });
  if (!buttons.isEligible()) {
    box.innerHTML = "<p class='demo-note'>" + label + " isn't available for this payment. Please choose another method.</p>";
    return;
  }
  box.innerHTML = "";
  buttons.render(box);
}

// ===== PAYING =====
page.addEventListener("click", (e) => {
  if (busy) return;
  if (e.target.closest("#printBtn")) return window.print();

  if (e.target.closest("[data-refund-ask]")) {
    const reason = document.getElementById("refundReason").value.trim();
    record((inv) => {
      const r = Store.refundInfo(inv, Store.load().settings);
      if (!r.eligible) return;
      inv.refundRequest = { at: new Date().toISOString(), reason, closed: false };
      Store.event(inv, "refundRequest", "Client requested a refund" + (reason ? " · " + reason : ""));
    });
    toast("Refund request sent");
    return render();
  }

  const pick = e.target.closest("[data-method]");
  if (pick && !agreed) {
    toast("Please agree to the Terms and Conditions first");
    document.querySelector(".agree").classList.add("nudge");
    setTimeout(() => document.querySelector(".agree") && document.querySelector(".agree").classList.remove("nudge"), 600);
    return;
  }
  if (pick) {
    chosen = pick.dataset.method;
    record((inv) => Store.event(inv, "method", "Client chose " + Store.METHODS[chosen]));
    return render();
  }

  const submit = e.target.closest("[data-submit]");
  if (!submit) return;
  const method = submit.dataset.submit;
  const refInput = document.getElementById("payRef");
  const reference = refInput ? refInput.value.trim() : "";

  // Bank and Lynk: the client says they've paid, you confirm on the dashboard
  if (method === "bank" || method === "lynk") {
    record((inv) => {
      inv.status = "processing";
      inv.payment = { method, reference };
      Store.event(
        inv,
        "submitted",
        "Client sent a " + (method === "bank" ? "bank transfer" : "Lynk payment") + (reference ? " · ref " + reference : ""),
      );
    });
    toast("Thanks! We'll confirm your payment soon.");
    return render();
  }

  // Card and PayPal: simulate the provider approving the payment
  busy = true;
  document.getElementById("payBox").innerHTML =
    "<h2>Processing payment…</h2><div class='processing'><span class='spinner'></span><span>Talking to " +
    (method === "card" ? "the card network" : "PayPal") + " (demo)</span></div>";
  record((inv) => {
    inv.status = "processing";
    inv.payment = { method, reference: "" };
    Store.event(inv, "submitted", (method === "card" ? "Card" : "PayPal") + " payment processing");
  });
  setTimeout(() => {
    const ref = "DEMO-" + Math.floor(1000 + Math.random() * 9000);
    record((inv) => {
      inv.status = "paid";
      inv.payment = { method, reference: ref, paidAt: new Date().toISOString() };
      Store.event(inv, "paid", (method === "card" ? "Card" : "PayPal") + " payment approved · receipt issued");
    });
    busy = false;
    toast("Payment approved");
    render();
  }, 2200);
});

// Ticking the terms box unlocks the payment methods
page.addEventListener("change", (e) => {
  if (e.target.id !== "agree") return;
  agreed = e.target.checked;
  if (agreed) record((inv) => Store.event(inv, "terms", "Client agreed to the Terms and Conditions"));
  else chosen = null;
  render();
});

// The owner confirmed a payment (or changed the invoice) in another tab
window.addEventListener("storage", (e) => {
  if (e.key === Store.KEY && !busy) render();
});

render();
