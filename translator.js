/* TinVin AI - Chat Style Translator */
(() => {
  "use strict";
  const core = window.TinVinCore;
  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }
  const {
    $,
    postJSON,
    setStatus,
    setLastOutput,
    languages
  } = core;
  let busy = false;
  let lastTranslation = "";
  const API_PATH = "/api/ai";
  function getElement(id) {
    return typeof $ === "function"
      ? $(id)
      : document.getElementById(id);
  }
  function extractTranslation(result) {
    if (!result) return "";
    if (typeof result === "string") {
      return result.trim();
    }
    if (Array.isArray(result)) {
      return result
        .map(extractTranslation)
        .filter(Boolean)
        .join("\n");
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
      if (typeof choice === "string" && choice.trim()) {
        return choice.trim();
      }
      if (Array.isArray(choice)) {
        return choice
          .map(part => part?.text || "")
          .join("\n")
          .trim();
      }
      const parts = result.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        return parts
          .map(part => part?.text || "")
          .join("\n")
          .trim();
      }
      if (result.data) {
        return extractTranslation(result.data);
      }
    }
    return "";
  }
  function showStatus(message) {
    const status = getElement("translatorStatus");
    if (status) {
      status.textContent = message || "";
    }
  }
  function fillLanguages(select, selected) {
    if (!select) return;
    const available = Array.isArray(languages)
      ? languages
      : [];
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
  function setBusy(value) {
    busy = value;
    const button = getElement("translatorRunBtn");
    if (button) {
      button.disabled = value;
      button.textContent = value ? "Translating..." : "Send ↑";
    }
  }
  function createMessage(text, className, labelText) {
    const message = document.createElement("div");
    message.className =
      "translator-message " + className;
    const label = document.createElement("div");
    label.className = "translator-message-label";
    label.textContent = labelText;
    const content = document.createElement("div");
    content.className = "translator-message-content";
    content.textContent = text;
    content.dir = "auto";
    message.append(label, content);
    return { message, content };
  }
  async function copyText(text, statusElement) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        if (statusElement) {
          statusElement.textContent = "Copied to clipboard.";
        }
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
        statusElement.textContent = copied
          ? "Copied to clipboard."
          : "Copy failed.";
      }
    }
  }
  function addTranslation(message, translated, source, target) {
    const history = getElement("translatorHistory");
    if (!history) {
      throw new Error(
        "Translator history container is missing from index.html."
      );
    }
    const conversation = document.createElement("div");
    conversation.className = "translator-conversation";
    const user = createMessage(
      message,
      "translator-user-message",
      "You · " + source
    );
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
    copyButton.addEventListener("click", () => {
      copyText(translated, copyStatus);
    });
    actions.append(copyButton, copyStatus);
    ai.message.appendChild(actions);
    conversation.append(
      user.message,
      ai.message
    );
    history.appendChild(conversation);
    requestAnimationFrame(() => {
      conversation.scrollIntoView({
        behavior: "smooth",
        block: "end"
      });
    });
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
    if (!message) {
      showStatus("Please enter text to translate.");
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
    setBusy(true);
    showStatus("Translating...");
    try {
      if (typeof postJSON !== "function") {
        throw new Error("TinVin AI connection function is not available.");
      }
      const result = await postJSON(API_PATH, {
        tool: "translator",
        message,
        sourceLanguage,
        targetLanguage
      });
      const translated = extractTranslation(result);
      if (!translated) {
        throw new Error(
          "The AI server returned an empty translation."
        );
      }
      addTranslation(
        message,
        translated,
        sourceLanguage,
        targetLanguage
      );
      lastTranslation = translated;
      if (typeof setLastOutput === "function") {
        setLastOutput(translated);
      }
      input.value = "";
      showStatus("");
      input.focus();
    } catch (error) {
      console.error("TinVin Translator error:", error);
      showStatus(
        "Translation failed: " +
        (error?.message || "Please try again.")
      );
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
    lastTranslation = "";
    if (typeof setLastOutput === "function") {
      setLastOutput("");
    }
    showStatus("");
    const oldStatus = getElement("translatorResultStatus");
    if (oldStatus) {
      oldStatus.textContent = "";
    }
    input?.focus();
  }
  function initialize() {
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
    fillLanguages(
      getElement("translatorSourceLang"),
      "English"
    );
    fillLanguages(
      getElement("translatorTargetLang"),
      "Sorani Kurdish"
    );
    sendButton.addEventListener("click", run);
    clearButton.addEventListener("click", clearTranslator);
    input.addEventListener("keydown", event => {
      if (
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        run();
      }
    });
    window.TinVinTools = window.TinVinTools || {};
    window.TinVinTools.translator = {
      run,
      clear: clearTranslator
    };
    console.log("TinVin AI Translator initialized.");
  }
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();