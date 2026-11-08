/* TinVin AI - Chat Style Translator
   Text Translation, Image OCR and Translated Image Creation
   Improved Mobile Image Translate Viewer
*/

(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }

  const { $, postJSON, setLastOutput, languages } = core;

  let busy = false;
  let lastTranslation = "";
  let selectedImage = null;

  const API_PATH = "/api/ai";
  const IMAGE_PATH = "/api/image";
  const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

  function getElement(id) {
    return typeof $ === "function" ? $(id) : document.getElementById(id);
  }

  function injectImageStyles() {
    if (document.getElementById("tinvin-image-translate-css")) return;

    const style = document.createElement("style");
    style.id = "tinvin-image-translate-css";

    style.textContent = `
      .translator-image-tools {
        display:flex;
        align-items:center;
        flex-wrap:wrap;
        gap:7px;
        width:100%;
        box-sizing:border-box;
      }

      .translator-image-tools > button {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:36px;
        min-width:0;
        padding:7px 12px;
        border-radius:10px;
        font-size:13px;
        white-space:nowrap;
        flex:0 0 auto;
      }

      .translator-image-preview {
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:9px;
        width:100%;
        margin-top:9px;
        min-width:0;
      }

      .translator-uploaded-image {
        display:block;
        width:auto;
        max-width:100%;
        max-height:180px;
        object-fit:contain;
        border-radius:12px;
      }

      .translator-image-result {
        display:block;
        width:100%;
        max-width:100%;
        box-sizing:border-box;
        margin-top:12px;
        padding:9px;
        border:1px solid rgba(81,184,255,.25);
        border-radius:15px;
        background:rgba(8,15,30,.55);
        overflow:hidden;
      }

      .translator-image-toolbar {
        display:flex;
        align-items:center;
        justify-content:flex-start;
        flex-wrap:wrap;
        gap:7px;
        margin-bottom:10px;
      }

      .translator-image-toolbar button {
        min-width:38px;
        min-height:36px;
        padding:6px 11px;
        border-radius:9px;
        cursor:pointer;
      }

      .translator-image-viewport {
        width:100%;
        max-height:65vh;
        min-height:80px;
        overflow:auto;
        display:flex;
        justify-content:center;
        align-items:flex-start;
        border-radius:11px;
        background:rgba(0,0,0,.16);
      }

      .translator-image-viewport img {
        display:block;
        width:auto;
        height:auto;
        max-width:100%;
        max-height:60vh;
        object-fit:contain;
        transform-origin:top center;
        transition:transform .15s ease;
      }

      .translator-image-status {
        margin:8px 0;
        overflow-wrap:anywhere;
        font-size:13px;
      }

      .translator-conversation {
        width:100%;
        min-width:0;
        box-sizing:border-box;
      }

      .translator-conversation img {
        max-width:100%;
      }

      @media(max-width:600px) {
        .translator-image-tools {
          gap:6px;
        }

        .translator-image-tools > button {
          min-height:34px;
          padding:6px 9px;
          font-size:12px;
        }

        .translator-uploaded-image {
          max-height:145px;
        }

        .translator-image-result {
          padding:7px;
        }

        .translator-image-viewport {
          max-height:55vh;
        }

        .translator-image-viewport img {
          max-height:52vh;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function extractTranslation(result) {
    if (!result) return "";

    if (typeof result === "string") return result.trim();

    if (Array.isArray(result)) {
      return result.map(extractTranslation).filter(Boolean).join("\n");
    }

    if (typeof result === "object") {
      const fields = [
        "text",
        "output",
        "translation",
        "translatedText",
        "response",
        "answer",
        "content",
        "result"
      ];

      for (const field of fields) {
        const value = result[field];

        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }

        if (value && typeof value === "object") {
          const extracted = extractTranslation(value);
          if (extracted) return extracted;
        }
      }

      const choice = result.choices?.[0]?.message?.content;

      if (typeof choice === "string") return choice.trim();

      if (Array.isArray(choice)) {
        return choice.map(part => part?.text || "").join("\n").trim();
      }

      const parts = result.candidates?.[0]?.content?.parts;

      if (Array.isArray(parts)) {
        return parts.map(part => part?.text || "").join("\n").trim();
      }

      if (result.data) return extractTranslation(result.data);
    }

    return "";
  }

  function showStatus(message) {
    const status = getElement("translatorStatus");
    if (status) status.textContent = message || "";
  }

  function fillLanguages(select, selected) {
    if (!select) return;

    const available = Array.isArray(languages) ? languages : [];

    if (!available.length) {
      console.error("Translator language list is empty.");
      return;
    }

    select.replaceChildren();

    available.forEach(language => {
      const option = document.createElement("option");
      option.value = language;
      option.textContent = language;
      select.appendChild(option);
    });

    select.value = selected;

    if (!select.value && select.options.length) {
      select.selectedIndex = 0;
    }
  }

  function setBusy(value, buttonText) {
    busy = value;

    const button = getElement("translatorRunBtn");

    if (button) {
      button.disabled = value;
      button.textContent = value ? buttonText || "Processing..." : "Send ↑";
    }

    const imageButton = getElement("translatorImageButton");
    if (imageButton) imageButton.disabled = value;
  }

  function createMessage(text, className, labelText) {
    const message = document.createElement("div");
    message.className = "translator-message " + className;

    const label = document.createElement("div");
    label.className = "translator-message-label";
    label.textContent = labelText;

    const content = document.createElement("div");
    content.className = "translator-message-content";
    content.textContent = text || "";
    content.dir = "auto";

    message.append(label, content);

    return { message, content };
  }

  async function copyText(text, statusElement) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        if (statusElement) statusElement.textContent = "Copied to clipboard.";
        return;
      }

      throw new Error("Clipboard unavailable");

    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.left = "-9999px";

      document.body.appendChild(area);
      area.select();

      let copied = false;

      try {
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }

      area.remove();

      if (statusElement) {
        statusElement.textContent = copied ? "Copied to clipboard." : "Copy failed.";
      }
    }
  }

  function addImageElement(container, src, className) {
    if (!container || !src) return null;

    const image = document.createElement("img");
    image.src = src;
    image.alt = "TinVin AI image";
    image.className = className || "translator-result-image";
    image.loading = "lazy";

    container.appendChild(image);

    return image;
  }

  function getImageSource(result) {
    if (!result) return "";

    const raw =
      result.image ||
      result.imageUrl ||
      result.image_url ||
      result.url ||
      result.base64 ||
      "";

    if (typeof raw !== "string" || !raw.trim()) return "";

    const value = raw.trim();

    if (
      value.startsWith("data:image/") ||
      value.startsWith("https://") ||
      value.startsWith("http://")
    ) {
      return value;
    }

    return `data:${result.mimeType || "image/png"};base64,${value}`;
  }

  function createImageControls() {
    const input = getElement("translatorInput");

    if (!input || input.dataset.imageControlsReady === "true") return;

    input.dataset.imageControlsReady = "true";

    const wrapper = document.createElement("div");
    wrapper.className = "translator-image-tools";
    wrapper.id = "translatorImageTools";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/webp";
    fileInput.hidden = true;
    fileInput.id = "translatorImageInput";

    const cameraInput = document.createElement("input");
    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.setAttribute("capture", "environment");
    cameraInput.hidden = true;

    const attachButton = document.createElement("button");
    attachButton.type = "button";
    attachButton.className = "secondary-btn";
    attachButton.textContent = "📎 Attach image";

    const cameraButton = document.createElement("button");
    cameraButton.type = "button";
    cameraButton.className = "secondary-btn";
    cameraButton.textContent = "📷 Camera";

    const preview = document.createElement("div");
    preview.className = "translator-image-preview";
    preview.id = "translatorImagePreview";

    wrapper.append(
      attachButton,
      cameraButton,
      fileInput,
      cameraInput,
      preview
    );

    input.parentElement?.insertBefore(wrapper, input);

    attachButton.addEventListener("click", () => fileInput.click());
    cameraButton.addEventListener("click", () => cameraInput.click());

    fileInput.addEventListener("change", () => {
      selectImage(fileInput.files?.[0]);
      fileInput.value = "";
    });

    cameraInput.addEventListener("change", () => {
      selectImage(cameraInput.files?.[0]);
      cameraInput.value = "";
    });
  }

  function selectImage(file) {
    if (!file) return;

    const allowed = ["image/png", "image/jpeg", "image/webp"];

    if (!allowed.includes(file.type)) {
      showStatus("Please select a PNG, JPG or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showStatus("Image must be smaller than 8 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      selectedImage = {
        name: file.name,
        type: file.type,
        data: reader.result
      };

      renderImagePreview();
      showStatus("Image attached. Ready to translate.");
    };

    reader.onerror = () => showStatus("Could not read the selected image.");

    reader.readAsDataURL(file);
  }

  function renderImagePreview() {
    const preview = getElement("translatorImagePreview");
    if (!preview) return;

    preview.replaceChildren();
    if (!selectedImage) return;

    const image = document.createElement("img");
    image.src = selectedImage.data;
    image.alt = "Selected image";
    image.className = "translator-uploaded-image";

    const name = document.createElement("span");
    name.textContent = selectedImage.name;
    name.style.overflowWrap = "anywhere";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remove image";

    remove.addEventListener("click", () => {
      selectedImage = null;
      renderImagePreview();
      showStatus("");
    });

    preview.append(image, name, remove);
  }

  function renderTranslatedImage(container, src) {
    container.replaceChildren();
    container.classList.add("translator-image-result");

    const toolbar = document.createElement("div");
    toolbar.className = "translator-image-toolbar";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "secondary-btn";
    minus.textContent = "−";

    const zoomLabel = document.createElement("span");
    zoomLabel.textContent = "100%";
    zoomLabel.setAttribute("aria-live", "polite");

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "secondary-btn";
    plus.textContent = "+";

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "secondary-btn";
    reset.textContent = "Reset";

    const viewport = document.createElement("div");
    viewport.className = "translator-image-viewport";

    const image = document.createElement("img");
    image.src = src;
    image.alt = "Translated image";
    image.loading = "lazy";

    let zoom = 1;

    function updateZoom() {
      zoom = Math.max(0.5, Math.min(3, zoom));
      image.style.transform = `scale(${zoom})`;
      zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    }

    minus.addEventListener("click", () => {
      zoom -= 0.2;
      updateZoom();
    });

    plus.addEventListener("click", () => {
      zoom += 0.2;
      updateZoom();
    });

    reset.addEventListener("click", () => {
      zoom = 1;
      updateZoom();
      viewport.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });

    toolbar.append(minus, zoomLabel, plus, reset);
    viewport.appendChild(image);
    container.append(toolbar, viewport);
  }

  function addTranslation(message, translated, source, target, imageAttachment = null) {
    const history = getElement("translatorHistory");

    if (!history) {
      throw new Error("Translator history container is missing from index.html.");
    }

    const conversation = document.createElement("div");
    conversation.className = "translator-conversation";

    const user = createMessage(
      message || "Image text translation",
      "translator-user-message",
      "You · " + source
    );

    if (imageAttachment) {
      addImageElement(user.message, imageAttachment.data, "translator-uploaded-image");
    }

    const ai = createMessage(
      translated,
      "translator-ai-message",
      "🌍 Translation · " + target
    );

    const actions = document.createElement("div");
    actions.className = "translator-result-actions";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "secondary-btn";
    copyButton.textContent = "Copy";

    const copyStatus = document.createElement("span");
    copyStatus.className = "translator-copy-status";
    copyStatus.setAttribute("role", "status");

    copyButton.addEventListener("click", () => copyText(translated, copyStatus));

    actions.append(copyButton, copyStatus);
    ai.message.appendChild(actions);

    conversation.append(user.message, ai.message);

    if (imageAttachment) {
      const createImageButton = document.createElement("button");
      createImageButton.type = "button";
      createImageButton.className = "secondary-btn";
      createImageButton.textContent = "🖼️ Create translated image";

      const imageStatus = document.createElement("div");
      imageStatus.className = "translator-image-status";

      const imageResult = document.createElement("div");
      imageResult.className = "translator-image-result";

      createImageButton.addEventListener("click", () => {
        createTranslatedImage(
          imageAttachment,
          source,
          target,
          imageResult,
          imageStatus,
          createImageButton
        );
      });

      conversation.append(createImageButton, imageStatus, imageResult);
    }

    history.appendChild(conversation);

    requestAnimationFrame(() => {
      conversation.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }

  async function createTranslatedImage(
    attachment,
    sourceLanguage,
    targetLanguage,
    resultContainer,
    statusElement,
    button
  ) {
    if (busy) return;

    setBusy(true, "Creating image...");
    button.disabled = true;
    button.textContent = "Creating translated image...";

    if (statusElement) {
      statusElement.textContent = "Reading and translating the image...";
    }

    try {
      const result = await postJSON(IMAGE_PATH, {
        mode: "translate",
        sourceLanguage,
        targetLanguage,
        attachments: [attachment]
      });

      const image = getImageSource(result);

      if (!image) {
        throw new Error("The server did not return the translated image.");
      }

      renderTranslatedImage(resultContainer, image);

      if (statusElement) {
        statusElement.textContent = "Translated image created.";
      }

      button.textContent = "Create again";

    } catch (error) {
      console.error("Translated image creation failed:", error);

      if (statusElement) {
        statusElement.textContent =
          "Image creation failed: " + (error.message || "Please try again.");
      }

      button.textContent = "Try again";

    } finally {
      button.disabled = false;
      setBusy(false);
    }
  }

  async function run() {
    if (busy) return;

    const input = getElement("translatorInput");
    const runButton = getElement("translatorRunBtn");

    if (!input || !runButton) {
      console.error("Translator input or Send button is missing.");
      return;
    }

    const message = input.value.trim();

    const sourceLanguage =
      getElement("translatorSourceLang")?.value || "English";

    const targetLanguage =
      getElement("translatorTargetLang")?.value || "Sorani Kurdish";

    if (!message && !selectedImage) {
      showStatus("Enter text or attach an image to translate.");
      input.focus();
      return;
    }

    if (sourceLanguage === targetLanguage) {
      showStatus("Please choose two different languages.");
      return;
    }

    if (!getElement("translatorHistory")) {
      showStatus("Translation history is missing. Check index.html.");
      return;
    }

    const imageAttachment = selectedImage ? { ...selectedImage } : null;

    setBusy(true, "Translating...");
    showStatus(imageAttachment ? "Reading and translating image..." : "Translating...");

    try {
      if (typeof postJSON !== "function") {
        throw new Error("TinVin AI connection function is not available.");
      }

      const result = await postJSON(API_PATH, {
        tool: "translator",
        message,
        sourceLanguage,
        targetLanguage,
        attachments: imageAttachment ? [imageAttachment] : []
      });

      const translated = extractTranslation(result);

      if (!translated) {
        throw new Error("The AI server returned an empty translation.");
      }

      addTranslation(
        message || "Read and translate image text",
        translated,
        sourceLanguage,
        targetLanguage,
        imageAttachment
      );

      lastTranslation = translated;

      if (typeof setLastOutput === "function") {
        setLastOutput(translated);
      }

      input.value = "";
      selectedImage = null;

      renderImagePreview();
      showStatus("");
      input.focus();

    } catch (error) {
      console.error("TinVin Translator error:", error);

      showStatus("Translation failed: " + (error?.message || "Please try again."));

    } finally {
      setBusy(false);
    }
  }

  function clearTranslator() {
    if (busy) return;

    const input = getElement("translatorInput");
    const history = getElement("translatorHistory");

    if (input) input.value = "";
    if (history) history.replaceChildren();

    selectedImage = null;
    lastTranslation = "";

    renderImagePreview();

    if (typeof setLastOutput === "function") {
      setLastOutput("");
    }

    showStatus("");

    const oldStatus = getElement("translatorResultStatus");
    if (oldStatus) oldStatus.textContent = "";

    input?.focus();
  }

  function initialize() {
    injectImageStyles();

    const input = getElement("translatorInput");
    const sendButton = getElement("translatorRunBtn");
    const clearButton = getElement("translatorClearBtn");
    const history = getElement("translatorHistory");

    if (!input || !sendButton || !clearButton || !history) {
      console.error("Translator HTML elements are missing.", {
        input: !!input,
        sendButton: !!sendButton,
        clearButton: !!clearButton,
        history: !!history
      });
      return;
    }

    fillLanguages(getElement("translatorSourceLang"), "English");
    fillLanguages(getElement("translatorTargetLang"), "Sorani Kurdish");

    createImageControls();

    if (sendButton.dataset.translatorReady !== "true") {
      sendButton.dataset.translatorReady = "true";
      sendButton.addEventListener("click", run);
    }

    if (clearButton.dataset.translatorReady !== "true") {
      clearButton.dataset.translatorReady = "true";
      clearButton.addEventListener("click", clearTranslator);
    }

    if (input.dataset.translatorReady !== "true") {
      input.dataset.translatorReady = "true";

      input.addEventListener("keydown", event => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          run();
        }
      });
    }

    window.TinVinTools = window.TinVinTools || {};

    window.TinVinTools.translator = {
      run,
      clear: clearTranslator
    };

    console.log("TinVin AI Translator initialized.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

})();