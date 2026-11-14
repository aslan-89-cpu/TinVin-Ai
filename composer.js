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

/* AI Chat: "+" menu (Camera / Gallery / File) on the left */
(() => {
  function setupChatPlus() {
    const composer = document.querySelector("#chatPage .chat-compose");
    if (!composer) return false;
    if (composer.dataset.plusReady === "true") return true;

    const controls = composer.querySelector(".chat-attachment-controls");
    const fileInput = composer.querySelector('input[type="file"]:not([capture])');
    const cameraInput = composer.querySelector('input[type="file"][capture]');
    if (!controls || !fileInput || !cameraInput) return false;

    composer.dataset.plusReady = "true";

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

    const galleryInput = document.createElement("input");
    galleryInput.type = "file";
    galleryInput.accept = "image/*";
    galleryInput.multiple = true;
    galleryInput.hidden = true;
    composer.appendChild(galleryInput);

    galleryInput.addEventListener("change", () => {
      const dt = new DataTransfer();
      Array.from(galleryInput.files || []).forEach(f => dt.items.add(f));
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change"));
      galleryInput.value = "";
    });

    const items = [
      { label: "📷  Camera", action: () => cameraInput.click() },
      { label: "🖼  Gallery", action: () => galleryInput.click() },
      { label: "📎  File", action: () => fileInput.click() }
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

    plusBtn.addEventListener("click", e => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });

    document.addEventListener("click", e => {
      if (!wrap.contains(e.target)) menu.hidden = true;
    });

    wrap.append(plusBtn, menu);
    composer.insertBefore(wrap, composer.firstChild);
    composer.insertBefore(controls, document.getElementById("sendBtn"));
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (setupChatPlus() || tries > 60) clearInterval(timer);
  }, 250);
})();
