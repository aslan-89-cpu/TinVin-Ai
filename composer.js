/* TinVin AI - Chat "+" menu, translator layout and top Sign in button */
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  /* Chat: [+] [text] [mic] [send]  with gallery, camera and file in the "+" menu */
  function setupChatComposer() {
    const composer = document.querySelector("#chatPage .chat-compose");
    if (!composer) return false;
    if (composer.dataset.plusReady === "true") return true;

    const controls = composer.querySelector(".chat-attachment-controls");
    const send = $("sendBtn");
    const input = $("chatInput");
    const fileInput = composer.querySelector('input[type="file"]:not([capture])');
    const cameraInput = composer.querySelector('input[type="file"][capture]');

    if (!controls || !send || !input || !fileInput || !cameraInput) return false;

    composer.dataset.plusReady = "true";

    /* Gallery: images only. Its files are handed to chat.js through the file input. */
    const galleryInput = make("input");
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

    /* "+" button and its menu */
    const wrap = make("div", "plus-wrap");

    const plusBtn = make("button", "plus-btn", "+");
    plusBtn.type = "button";
    plusBtn.setAttribute("aria-label", "Add");

    const menu = make("div", "plus-menu");
    menu.hidden = true;

    const items = [
      { label: "📷  Camera", action: () => cameraInput.click() },
      { label: "🖼  Gallery", action: () => galleryInput.click() },
      { label: "📎  File", action: () => fileInput.click() }
    ];

    items.forEach(item => {
      const b = make("button", "plus-item", item.label);
      b.type = "button";
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
    composer.insertBefore(controls, send);

    return true;
  }

  /* Translator: keep the mic and translate button on the right */
  function setupTranslatorComposer() {
    const composer = document.querySelector("#translatorPage .translator-compose");
    if (!composer) return false;
    composer.dataset.layoutReady = "true";
    return true;
  }

  /* Top bar "Sign in" button: it presses the sign-in button in the sidebar */
  function setupSignInButton() {
    const topbar = document.querySelector(".topbar");
    const premium = $("premiumTopBtn");
    if (!topbar || !premium) return false;
    if ($("topSignInBtn")) return true;

    const btn = make("button", "top-signin-btn", "Sign in");
    btn.id = "topSignInBtn";
    btn.type = "button";

    btn.addEventListener("click", () => {
      document.querySelector("#authBox .auth-btn")?.click();
    });

    topbar.insertBefore(btn, premium);

    const sync = () => {
      const signedIn = !!document.querySelector("#authBox .auth-name");
      btn.textContent = signedIn ? "Sign out" : "Sign in";
    };

    const box = $("authBox");
    if (box) new MutationObserver(sync).observe(box, { childList: true, subtree: true });

    sync();
    return true;
  }

  let tries = 0;

  const timer = setInterval(() => {
    tries++;

    const chatDone = setupChatComposer();
    const translatorDone = setupTranslatorComposer();
    const signInDone = setupSignInButton();

    if ((chatDone && translatorDone && signInDone) || tries > 80) {
      clearInterval(timer);
    }
  }, 250);
})();

/* Translator: icon-only attach/camera, send-style Translate button */
(() => {
  const tidy = () => {
    const page = document.getElementById("translatorPage");
    if (!page) return;

    page.querySelectorAll("button").forEach(b => {
      const t = b.textContent.trim();

      if (t === "Attach image") {
        b.textContent = "📎";
        b.title = "Attach image";
        b.setAttribute("aria-label", "Attach image");
        b.classList.add("tr-icon-btn");
      }

      if (t === "Camera") {
        b.textContent = "📷";
        b.title = "Camera";
        b.setAttribute("aria-label", "Camera");
        b.classList.add("tr-icon-btn");
      }

      if (b.id === "translatorRunBtn" && t !== "↑") {
        b.textContent = "↑";
        b.setAttribute("aria-label", "Translate");
      }
    });
  };

  tidy();
  let n = 0;
  const timer = setInterval(() => {
    tidy();
    if (++n > 20) clearInterval(timer);
  }, 300);
})();
