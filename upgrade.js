/* TinVin AI - Premium page (English) */
(() => {
  "use strict";

  // Prices set by the owner
  const PLANS = [
    { months: 1,  title: "1 Month",   price: "$13",  note: "" },
    { months: 6,  title: "6 Months",  price: "$60",  note: "Lower price per month" },
    { months: 12, title: "12 Months", price: "$100", note: "Best value" }
  ];

  const FEATURES = [
    "More chat messages per day",
    "More translations",
    "Your chats on all your devices"
  ];

  const TEXT = {
    title: "♛ Premium",
    subtitle: "More access and a better experience in TinVin AI",
    pay: "Payment coming soon",
    status: "Payment is not connected yet.",
    back: "← Back",
    emptyPrice: "—"
  };

  let overlay = null;
  let selected = 6;

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function build() {
    overlay = make("div", "upgrade-overlay");
    overlay.hidden = true;

    const card = make("div", "upgrade-card");

    const backBtn = make("button", "upgrade-close", TEXT.back);
    backBtn.type = "button";
    backBtn.addEventListener("click", close);

    const top = make("div", "upgrade-top");
    top.append(make("h2", "upgrade-title", TEXT.title), backBtn);

    const sub = make("p", "upgrade-sub", TEXT.subtitle);

    const features = make("ul", "upgrade-features");
    FEATURES.forEach(text => features.appendChild(make("li", "", "✓ " + text)));

    const plans = make("div", "upgrade-plans");
    plans.id = "upgradePlans";

    const pay = make("button", "upgrade-pay", TEXT.pay);
    pay.type = "button";
    pay.disabled = true;

    const status = make("div", "upgrade-status", TEXT.status);

    card.append(top, sub, features, plans, pay, status);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });
  }

  function render() {
    const plans = document.getElementById("upgradePlans");
    if (!plans) return;
    plans.replaceChildren();

    PLANS.forEach(plan => {
      const button = make("button", "plan-card");
      button.type = "button";
      button.setAttribute("aria-pressed", String(plan.months === selected));
      if (plan.months === selected) button.classList.add("selected");

      button.append(
        make("strong", "", plan.title),
        make("span", "plan-price", plan.price || TEXT.emptyPrice),
        make("small", "", plan.note)
      );

      button.addEventListener("click", () => {
        selected = plan.months;
        render();
      });

      plans.appendChild(button);
    });
  }

  function open() {
    if (!overlay) build();
    render();
    overlay.hidden = false;
    document.body.classList.add("upgrade-open");
  }

  function close() {
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("upgrade-open");
  }

  window.TinVinPremium = Object.assign({}, window.TinVinPremium || {}, { open, close });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") close();
  });
})();
