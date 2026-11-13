/* TinVin AI - Chat composer: "+" on the left, mic and send on the right */
(() => {
  "use strict";

  let tries = 0;

  const timer = setInterval(() => {
    tries++;
    if (setupComposer() || tries > 60) clearInterval(timer);
  }, 250);

  function setupComposer() {
    const composer = document.querySelector("#chatPage .chat-compose");
    if (!composer) return false;

    if (composer.dataset.plusReady === "true") return true;

    const controls = composer.querySelector(".chat-attachment-controls");
    const send = document.getElementById("sendBtn");
    const input = document.getElementById("chatInput");
    const fileInput = composer.querySelector('input[type="file"]:not([capture])');
    const cameraInput = composer.querySelector('input[type="file"][capture]');

    if (!controls || !send || !input || !fileInput || !cameraInput) return false;

    composer.dataset.plusReady = "true";

    /* Gallery picker: images only, no camera.
       Its files are passed to the existing file input, so chat.js handles them. */
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

    /* "+" button and its menu */
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
      { label: "📷  کامێرا", action: () => cameraInput.click() },
      { label: "🖼  گالێری", action: () => galleryInput.click() },
      { label: "📎  فایل", action: () => fileInput.click() }
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

    /* Layout: [+] [text box] [mic] [send] */
    composer.insertBefore(wrap, composer.firstChild);
    composer.insertBefore(controls, send);

    return true;
  }
})();
