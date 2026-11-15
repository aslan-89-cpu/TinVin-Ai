/* TinVin AI - Premium / Pro page (English) */
(() => {
  "use strict";

  /* ------------------------------------------------------------
     EDIT PRICES AND FEATURES HERE.
     The Pro prices below are only placeholders: set your own.
     ------------------------------------------------------------ */
  const TIERS = [
    {
      id: "premium",
      tab: "♛ Premium",
      title: "♛ Premium",
      subtitle: "More access and a better experience in TinVin AI",
      features: [
        "More chat messages per day",
        "More translations",
        "Your chats on all your devices"
      ],
      plans: [
        { months: 1,  title: "1 Month",   price: "$14.99",  note: "" },
        { months: 6,  title: "6 Months",  price: "$74.99",  note: "Lower price per month" },
        { months: 12, title: "12 Months", price: "$134.99", note: "Best value" }
      ]
    },
    {
      id: "pro",
      tab: "⚡ Pro",
      title: "⚡ Pro",
      subtitle: "The most powerful AI and the highest limits",
      features: [
        "Everything in Premium",
        "Our most powerful AI model",
        "Much higher daily limits",
        "Priority speed"
      ],
      plans: [
        { months: 1,  title: "1 Month",   price: "$25",  note: "" },
        { months: 6,  title: "6 Months",  price: "$120", note: "Lower price per month" },
        { months: 12, title: "12 Months", price: "$200", note: "Best value" }
      ]
    }
  ];

  const TEXT = {
    pay: "Payment coming soon",
    status: "Payment is not connected yet.",
    back: "← Back",
    emptyPrice: "—"
  };

  let overlay = null;
  let selectedTier = "premium";
  let selectedMonths = 6;

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function addStyle() {
    if (document.getElementById("tvTierStyle")) return;

    const style = document.createElement("style");
    style.id = "tvTierStyle";
    style.textContent = `
      .tier-tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 0 0 14px;
        padding: 4px;
        border-radius: 16px;
        background: rgba(255, 255, 255, .06);
        border: 1px solid rgba(255, 255, 255, .12);
      }
      .tier-tab {
        min-height: 42px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: #aebbd5;
        font: inherit;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
      }
      .tier-tab.selected {
        color: #1b1607;
        background: linear-gradient(135deg, #f6d77a, #d9a441);
      }
    `;
    document.head.appendChild(style);
  }

  function getTier() {
    return TIERS.find(tier => tier.id === selectedTier) || TIERS[0];
  }

  function build() {
    addStyle();

    overlay = make("div", "upgrade-overlay");
    overlay.hidden = true;

    const card = make("div", "upgrade-card");

    const backBtn = make("button", "upgrade-close", TEXT.back);
    backBtn.type = "button";
    backBtn.addEventListener("click", close);

    const top = make("div", "upgrade-top");
    const title = make("h2", "upgrade-title");
    title.id = "upgradeTitle";
    top.append(title, backBtn);

    const tabs = make("div", "tier-tabs");
    tabs.id = "upgradeTabs";

    const sub = make("p", "upgrade-sub");
    sub.id = "upgradeSub";

    const features = make("ul", "upgrade-features");
    features.id = "upgradeFeatures";

    const plans = make("div", "upgrade-plans");
    plans.id = "upgradePlans";

    const pay = make("button", "upgrade-pay", TEXT.pay);
    pay.type = "button";
    pay.disabled = true;

    const status = make("div", "upgrade-status", TEXT.status);

    card.append(top, tabs, sub, features, plans, pay, status);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });
  }

  function render() {
    const tier = getTier();

    const title = document.getElementById("upgradeTitle");
    if (title) title.textContent = tier.title;

    const sub = document.getElementById("upgradeSub");
    if (sub) sub.textContent = tier.subtitle;

    // Tabs
    const tabs = document.getElementById("upgradeTabs");
    if (tabs) {
      tabs.replaceChildren();

      TIERS.forEach(item => {
        const tab = make("button", "tier-tab", item.tab);
        tab.type = "button";
        tab.setAttribute("aria-pressed", String(item.id === selectedTier));
        if (item.id === selectedTier) tab.classList.add("selected");

        tab.addEventListener("click", () => {
          selectedTier = item.id;
          render();
        });

        tabs.appendChild(tab);
      });
    }

    // Features
    const features = document.getElementById("upgradeFeatures");
    if (features) {
      features.replaceChildren();
      tier.features.forEach(text => {
        features.appendChild(make("li", "", "✓ " + text));
      });
    }

    // Plans
    const plans = document.getElementById("upgradePlans");
    if (!plans) return;
    plans.replaceChildren();

    tier.plans.forEach(plan => {
      const button = make("button", "plan-card");
      button.type = "button";
      button.setAttribute("aria-pressed", String(plan.months === selectedMonths));
      if (plan.months === selectedMonths) button.classList.add("selected");

      button.append(
        make("strong", "", plan.title),
        make("span", "plan-price", plan.price || TEXT.emptyPrice),
        make("small", "", plan.note)
      );

      button.addEventListener("click", () => {
        selectedMonths = plan.months;
        render();
      });

      plans.appendChild(button);
    });
  }

  // Optional: open directly on a tier, e.g. TinVinPremium.open("pro")
  function open(tierId) {
    if (tierId && TIERS.some(tier => tier.id === tierId)) {
      selectedTier = tierId;
    }

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
