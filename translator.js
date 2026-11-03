
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

  function extractTranslation(result) {
    if (!result) return "";

    if (typeof result === "string") return result.trim();

    if (Array.isArray(result)) {
      return result.map(extractTranslation)
        .filter(Boolean).join("\n");
    }

    if (typeof result === "object") {
      const fields = [
        "translation",
        "translatedText",
        "text",
        "output",
        "response",
        "answer",
        "content",
        "result"
      ];

      for (const field of fields) {
        if (typeof result[field] === "string" &&
            result[field].trim()) {
          return result[field].trim();
        }

        if (result[field] && typeof result[field] === "object") {
          const value = extractTranslation(result[field]);
          if (value) return value;
        }
      }

      const content = result.choices?.[0]?.message?.content;

      if (typeof content === "string") return content.trim();

      if (Array.isArray(content)) {
        return content.map(item => item.text || "")
          .join("\n").trim();
      }

      const parts = result.candidates?.[0]?.content?.parts;

      if (Array.isArray(parts)) {
        return parts.map(item => item.text || "")
          .join("").trim();
      }

      if (result.data) {
        return extractTranslation(result.data);
      }
    }

    return "";
  }

  function fillLanguages(select, selected) {
    if (!select) return;

    select.replaceChildren();

    (languages || []).forEach(language => {
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

    const button = $("translatorRunBtn");

    if (button) {
      button.disabled = value;
      button.textContent = value ? "Translating..." : "Send ↑";
    }
  }

  function createMessage(text, className) {
    const message = document.createElement("div");

    message.className = "translator-message " + className;

    const content = document.createElement("div");
    content.className = "translator-message-content";
    content.textContent = text;
    content.dir = "auto";

    message.appendChild(content);

    return message;
  }

  async function copyText(text, statusElement) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("Clipboard unavailable");
      }

      if (statusElement) {
        statusElement.textContent = "Copied to clipboard.";
      }

    } catch {
      const area = document.createElement("textarea");

      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";

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
    const history = $("translatorHistory");

    if (!history) return;

    const conversation = document.createElement("div");
    conversation.className = "translator-conversation";

    // User message
    const userMessage = createMessage(
      message,
      "translator-user-message"
    );

    const userLabel = document.createElement("div");
    userLabel.className = "translator-message-label";
    userLabel.textContent = "You · " + source;

    userMessage.prepend(userLabel);

    // AI translation
    const aiMessage = createMessage(
      translated,
      "translator-ai-message"
    );

    const aiLabel = document.createElement("div");
    aiLabel.className = "translator-message-label";
    aiLabel.textContent = "🌍 Translation · " + target;

    aiMessage.prepend(aiLabel);

    // Copy button
    const actions = document.createElement("div");
    actions.className = "translator-result-actions";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "secondary-btn";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", () => {
      copyText(translated, copyStatus);
    });

    const copyStatus = document.createElement("span");
    copyStatus.className = "translator-copy-status";
    copyStatus.setAttribute("role", "status");

    actions.append(copyButton, copyStatus);

    aiMessage.appendChild(actions);

    conversation.append(userMessage, aiMessage);

    history.appendChild(conversation);

    conversation.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }

  async function run() {
    if (busy) return;

    const input = $("translatorInput");
    const message = input?.value?.trim();

    const sourceLanguage =
      $("translatorSourceLang")?.value || "English";

    const targetLanguage =
      $("translatorTargetLang")?.value || "Sorani Kurdish";

    if (!message) {
      setStatus(
        "translatorStatus",
        "Please enter text to translate."
      );

      input?.focus();
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setStatus(
        "translatorStatus",
        "Please choose two different languages."
      );
      return;
    }

    setBusy(true);
    setStatus("translatorStatus", "Translating...");

    try {
      const result = await postJSON("/api/ai", {
        tool: "translator",
        message,
        sourceLanguage,
        targetLanguage
      });

      const translated = extractTranslation(result);

      if (!translated) {
        throw new Error("AI returned an empty translation.");
      }

      lastTranslation = translated;

      setLastOutput(translated);

      addTranslation(
        message,
        translated,
        sourceLanguage,
        targetLanguage
      );

      // Clear input after successful translation
      input.value = "";

      setStatus("translatorStatus", "");

      input.focus();

    } catch (error) {
      console.error("Translator error:", error);

      setStatus(
        "translatorStatus",
        "Translation failed: " +
        (error.message || "Please try again.")
      );

    } finally {
      setBusy(false);
    }
  }

  async function copyTranslation() {
    if (!lastTranslation) {
      setStatus(
        "translatorResultStatus",
        "There is no translation to copy."
      );
      return;
    }

    await copyText(
      lastTranslation,
      $("translatorResultStatus")
    );
  }

  function clearTranslator() {
    if (busy) return;

    const input = $("translatorInput");
    const history = $("translatorHistory");

    if (input) input.value = "";

    if (history) history.replaceChildren();

    lastTranslation = "";

    setLastOutput("");

    setStatus("translatorStatus", "");
    setStatus("translatorResultStatus", "");

    input?.focus();
  }

  function initialize() {
    window.TinVinTools = window.TinVinTools || {};

    // Remove old single-result layout
    $("translatorResultBox")?.remove();

    fillLanguages(
      $("translatorSourceLang"),
      "English"
    );

    fillLanguages(
      $("translatorTargetLang"),
      "Sorani Kurdish"
    );

    $("translatorRunBtn")?.addEventListener(
      "click",
      run
    );

    $("translatorCopyBtn")?.addEventListener(
      "click",
      copyTranslation
    );

    $("translatorClearBtn")?.addEventListener(
      "click",
      clearTranslator
    );

    inputKeyboard();

    window.TinVinTools.translator = {
      run,
      clear: clearTranslator
    };

    console.log(
      "TinVin AI Chat Style Translator loaded successfully."
    );
  }

  function inputKeyboard() {
    $("translatorInput")?.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Enter" &&
          (event.ctrlKey || event.metaKey)
        ) {
          event.preventDefault();
          run();
        }
      }
    );
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
