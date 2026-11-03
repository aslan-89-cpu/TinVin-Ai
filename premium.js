
(() => {
  "use strict";

  if (window.TinVinPremium) return;

  const plans = [
    {
      id: "monthly",
      name: "Monthly",
      duration: "1 Month",
      price: 13
    },
    {
      id: "six-months",
      name: "6 Months",
      duration: "6 Months",
      price: 60,
      popular: true
    },
    {
      id: "yearly",
      name: "Yearly",
      duration: "1 Year",
      price: 100
    }
  ];

  let selectedPlan = "six-months";
  let selectedPayment = "ton";

  const style = document.createElement("style");
  style.textContent = `
    #tv-premium {
      position:fixed; inset:0; z-index:1000000;
      display:none; overflow-y:auto;
      background:var(--bg,#f7f2ff);
      color:var(--text,#20182e);
      padding:20px 15px 35px;
      font-family:inherit;
    }
    #tv-premium.open {display:block}
    #tv-premium * {box-sizing:border-box}
    #tv-premium .wrap {max-width:540px;margin:auto}
    #tv-premium .back {
      border:1px solid var(--border);
      background:var(--card);color:var(--text);
      border-radius:12px;padding:10px 15px;
      font-weight:700;cursor:pointer;
    }
    #tv-premium .hero {text-align:center;padding:25px 8px}
    #tv-premium .crown {
      width:78px;height:78px;margin:auto auto 15px;
      display:grid;place-items:center;border-radius:25px;
      background:linear-gradient(135deg,#ffe39a,#d99b27);
      font-size:40px;box-shadow:0 8px 25px #d99b2733;
    }
    #tv-premium h1 {font-size:29px;margin:0 0 9px}
    #tv-premium .muted {color:var(--muted,#7d748b);line-height:1.6}
    #tv-premium .benefits {
      display:grid;grid-template-columns:1fr 1fr;gap:10px;
      margin:12px 0 25px;
    }
    #tv-premium .benefit {
      padding:14px;border-radius:15px;
      background:var(--card);border:1px solid var(--border);
      font-size:13px;font-weight:700;
    }
    #tv-premium .benefit span {display:block;font-size:21px;margin-bottom:7px}
    #tv-premium .section-title {font-weight:850;font-size:17px;margin:22px 0 13px}
    #tv-premium .plan {
      position:relative;padding:17px;margin-bottom:12px;
      border:1.5px solid var(--border);border-radius:17px;
      background:var(--card);cursor:pointer;
    }
    #tv-premium .plan.selected {
      border:2px solid var(--primary,#8954d8);
      box-shadow:0 0 0 3px #8954d81a;
    }
    #tv-premium .plan-row {
      display:flex;justify-content:space-between;align-items:center;gap:10px;
    }
    #tv-premium .plan-name {font-weight:850;font-size:16px}
    #tv-premium .duration {font-size:12px;color:var(--muted);margin-top:5px}
    #tv-premium .price {
      color:var(--primary);font-size:24px;font-weight:900;
    }
    #tv-premium .popular {
      position:absolute;right:14px;top:-10px;
      background:#e9bd63;color:#38250a;
      border-radius:20px;padding:4px 10px;
      font-size:10px;font-weight:900;
    }
    #tv-premium .methods {
      display:grid;grid-template-columns:1fr 1fr;gap:10px;
    }
    #tv-premium .method {
      background:var(--card);color:var(--text);
      border:1.5px solid var(--border);border-radius:15px;
      padding:15px 8px;font-weight:800;cursor:pointer;
    }
    #tv-premium .method.selected {
      border:2px solid var(--primary);
    }
    #tv-premium .method span {display:block;font-size:24px;margin-bottom:7px}
    #tv-premium .pay {
      width:100%;border:0;border-radius:15px;
      padding:16px;margin-top:18px;
      background:linear-gradient(135deg,#f5d37b,#d99b27);
      color:#30200a;font-size:15px;font-weight:900;cursor:pointer;
    }
    #tv-premium .notice {
      display:none;margin-top:13px;padding:14px;
      border-radius:13px;background:var(--soft);
      color:var(--text);font-size:13px;line-height:1.7;
    }
    #tv-premium .notice.show {display:block}
    #tv-premium .footer {
      text-align:center;font-size:11px;
      color:var(--muted);margin-top:18px;line-height:1.7;
    }
  `;

  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "tv-premium";

  overlay.innerHTML = `
    <div class="wrap">
      <button class="back" id="tv-premium-back">← Back</button>

      <div class="hero">
        <div class="crown">👑</div>
        <h1>TinVin Premium</h1>
        <p class="muted">
          Unlock more possibilities with Premium access.
        </p>
      </div>

      <div class="benefits">
        <div class="benefit"><span>⚡</span>Priority AI access</div>
        <div class="benefit"><span>✨</span>Premium experience</div>
        <div class="benefit"><span>🎨</span>Creative tools</div>
        <div class="benefit"><span>🚀</span>More productivity</div>
      </div>

      <div class="section-title">Choose your plan</div>
      <div id="tv-premium-plans"></div>

      <div class="section-title">Payment method</div>
      <div class="methods">
        <button class="method selected" data-payment="ton">
          <span>💎</span>TON Wallet
        </button>
        <button class="method" data-payment="card">
          <span>💳</span>Visa / Mastercard
        </button>
      </div>

      <button class="pay" id="tv-premium-pay">
        Continue to payment
      </button>

      <div class="notice" id="tv-premium-notice"></div>

      <div class="footer">
        Secure payment integration will be enabled after payment provider setup.
        Premium status activates only after verified payment.
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const plansBox = overlay.querySelector("#tv-premium-plans");
  const notice = overlay.querySelector("#tv-premium-notice");

  function renderPlans() {
    plansBox.innerHTML = plans.map(plan => `
      <div class="plan ${selectedPlan === plan.id ? "selected" : ""}"
           data-plan="${plan.id}">
        ${plan.popular ? '<div class="popular">POPULAR</div>' : ""}
        <div class="plan-row">
          <div>
            <div class="plan-name">${plan.name}</div>
            <div class="duration">${plan.duration}</div>
          </div>
          <div class="price">$${plan.price}</div>
        </div>
      </div>
    `).join("");
  }

  plansBox.addEventListener("click", event => {
    const item = event.target.closest("[data-plan]");
    if (!item) return;

    selectedPlan = item.dataset.plan;
    renderPlans();
    notice.classList.remove("show");
  });

  overlay.querySelectorAll("[data-payment]").forEach(button => {
    button.addEventListener("click", () => {
      selectedPayment = button.dataset.payment;

      overlay.querySelectorAll("[data-payment]").forEach(item => {
        item.classList.toggle(
          "selected",
          item.dataset.payment === selectedPayment
        );
      });

      notice.classList.remove("show");
    });
  });

  function showNotice(message) {
    notice.textContent = message;
    notice.classList.add("show");
  }

  overlay.querySelector("#tv-premium-pay").addEventListener("click", () => {
    const plan = plans.find(item => item.id === selectedPlan);

    if (selectedPayment === "ton") {
      showNotice(
        `Selected plan: ${plan.name} — $${plan.price}. ` +
        "TON payment is not connected yet. A verified receiving wallet " +
        "and payment confirmation system must be configured before payment."
      );
    } else {
      showNotice(
        `Selected plan: ${plan.name} — $${plan.price}. ` +
        "Visa and Mastercard payments are not connected yet. " +
        "A supported payment gateway and merchant credentials are required."
      );
    }
  });

  function close() {
    overlay.classList.remove("open");
    notice.classList.remove("show");
  }

  overlay.querySelector("#tv-premium-back").addEventListener("click", close);

  function open() {
    renderPlans();
    overlay.classList.add("open");
    notice.classList.remove("show");
    window.scrollTo(0, 0);
  }

  window.TinVinPremium = { open, close };

  function addPremiumCard() {
    const grid = document.getElementById("toolsGrid");
    if (!grid || grid.querySelector("[data-premium-card]")) return;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "tool-card";
    card.dataset.premiumCard = "true";

    card.innerHTML = `
      <div class="tool-icon">👑</div>
      <h3>Premium</h3>
      <p>Unlock the Premium experience and plans.</p>
    `;

    card.addEventListener("click", open);
    grid.appendChild(card);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addPremiumCard);
  } else {
    addPremiumCard();
  }
})();
