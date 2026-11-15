/* TinVin AI - Premium / Pro page
   The texts are written in English and translated into the user's
   interface language (see i18n.js). */
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

  // English text -> text in the user's language
  let dictionary = new Map();
  let dictionaryLanguage = "English";

  function tr(text) {
    return dictionary.get(text) || text;
  }

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

  // Every English text on this page that should be translated
  function allTexts() {
    const list = [TEXT.pay, TEXT.status, TEXT.back];

    TIERS.forEach(tier => {
      list.push(tier.subtitle);
      tier.features.forEach(text => list.push(text));

      tier.plans.forEach(plan => {
        list.push(plan.title);
        if (plan.note) list.push(plan.note);
      });
    });

    return [...new Set(list.filter(Boolean))];
  }

  async function translatePage() {
    const i18n = window.TinVinI18n;

    if (!i18n || typeof i18n.translateMany !== "function") return;

    const language = i18n.language();

    if (language === "English") {
      dictionary = new Map();
      dictionaryLanguage = "English";
      render();
      return;
    }

    // Already translated for this language
    if (dictionaryLanguage === language && dictionary.size) {
      render();
      return;
    }

    const texts = allTexts();
    const translated = await i18n.translateMany(texts);

    dictionary = new Map();

    texts.forEach((text, index) => {
      dictionary.set(text, translated[index]);
    });

    dictionaryLanguage = language;
    render();
  }

  function build() {
    addStyle();

    overlay = make("div", "upgrade-overlay");
    overlay.hidden = true;

    const card = make("div", "upgrade-card");

    const backBtn = make("button", "upgrade-close", TEXT.back);
    backBtn.type = "button";
    backBtn.id = "upgradeBack";
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
    pay.id = "upgradePay";
    pay.disabled = true;

    const status = make("div", "upgrade-status", TEXT.status);
    status.id = "upgradeStatus";

    card.append(top, tabs, sub, features, plans, pay, status);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });
  }

  function render() {
    const tier = getTier();

    // Right-to-left languages (Arabic, Persian, Sorani...) flip the page
    if (overlay) {
      overlay.dir = document.documentElement.dir || "ltr";
    }

    const title = document.getElementById("upgradeTitle");
    if (title) title.textContent = tier.title;

    const sub = document.getElementById("upgradeSub");
    if (sub) sub.textContent = tr(tier.subtitle);

    const back = document.getElementById("upgradeBack");
    if (back) back.textContent = tr(TEXT.back);

    const pay = document.getElementById("upgradePay");
    if (pay) pay.textContent = tr(TEXT.pay);

    const status = document.getElementById("upgradeStatus");
    if (status) status.textContent = tr(TEXT.status);

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
        features.appendChild(make("li", "", "✓ " + tr(text)));
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
        make("strong", "", tr(plan.title)),
        make("span", "plan-price", plan.price || TEXT.emptyPrice),
        make("small", "", tr(plan.note))
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

    // Show it at once (English or already translated), then translate
    render();
    overlay.hidden = false;
    document.body.classList.add("upgrade-open");

    translatePage().catch(error => {
      console.error("Premium page translation failed:", error);
    });
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
