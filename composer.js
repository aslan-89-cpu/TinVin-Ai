/* TinVin AI - Translator "+" menu (Camera / Gallery / File) */
(() => {
  function findByText(root, word) {
    return [...root.querySelectorAll("button")]
      .find(b => b.textContent.includes(word));
  }

  function setupTranslatorPlus() {
    const composer = document.querySelector("#translatorPage .translator-compose");
    if (!composer) return false;
    if (composer.dataset.plusReady === "true") return true;

    const attach = findByText(composer, "Attach image");
    const camera = findByText(composer, "Camera");
    if (!attach || !camera) return false;

    composer.dataset.plusReady = "true";
    attach.classList.add("tr-hidden");
    camera.classList.add("tr-hidden");

    const wrap = document.createElement("div");
    wrap.className = "plus-wrap";

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "plus-btn";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", "Add");

    const menu = document.createElement("div");
    menu.className = "plus-menu";
    menu.hidden = true;

    const items = [
      { label: "📷  Camera", action: () => camera.click() },
      { label: "🖼  Gallery", action: () => attach.click() },
      { label: "📎  File", action: () => attach.click() }
    ];

    items.forEach(item => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "plus-item";
      b.textContent = item.label;
      b.addEventListener("click", () => {
        menu.hidden = true;
        item.action();
      });
      menu.appendChild(b);
    });

    plusBtn.addEventListener("click", event => {
      event.stopPropagation();
      menu.hidden = !menu.hidden;
    });

    document.addEventListener("click", event => {
      if (!wrap.contains(event.target)) menu.hidden = true;
    });

    wrap.append(plusBtn, menu);
    composer.insertBefore(wrap, composer.firstChild);
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (setupTranslatorPlus() || tries > 60) clearInterval(timer);
  }, 250);
})();
