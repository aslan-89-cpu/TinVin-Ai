
/* TinVin AI - Translator with Dedicated Result Page */

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
    showPage
  } = core;

  let busy = false;

  function extractTranslation(result) {
    if (!result) return "";

    if (typeof result === "string") {
      return result.trim();
    }

    if (Array.isArray(result)) {
      return result.map(extractTranslation).filter(Boolean).join("\n");
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
        if (typeof result[field] === "string" && result[field].trim()) {
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
        return content.map(item => item.text || "").join("\n").trim();
      }

      const parts = result.candidates?.[0]?.content?.parts;

      if (Array.isArray(parts)) {
        return parts.map(item => item.text || "").join("").trim();
      }

      if (result.data) return extractTranslation(result.data);
    }

    return "";
  }

  function setBusy(value) {
    busy = value;

    const button = $("runBtn");

    if (button) {
      button.disabled = value;
      button.textContent = value ? "Translating..." : "Translate";
    }
  }

  async function run() {
    if (busy) return;

    const input = $("toolInput");
    const message = input?.value?.trim();

    const sourceLanguage = $("sourceLang")?.value || "English";
    const targetLanguage = $("targetLang")?.value || "Sorani Kurdish";

    if (!message) {
      setStatus("toolStatus", "Please enter text to translate.");
      input?.focus();
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setStatus("toolStatus", "Please choose two different languages.");
      return;
    }

    setBusy(true);

    setStatus("toolStatus", "Translating...");

    try {
      const result = await postJSON("/api/ai", {
        tool: "translator",
        message,
        sourceLanguage,
        targetLanguage
      });

      const translated = extractTranslation(result);

      if (!translated) {
        console.error("Empty translation:", result);
        throw new Error("AI returned an empty translation.");
      }

      // Save translation for the copy button.
      setLastOutput(translated);

      // Make sure the result page exists.
      let resultText = $("translatorResultText");

      if (!resultText) {
        throw new Error("Translation result page was not created. Please refresh the app.");
      }

      resultText.textContent = translated;
      resultText.dir = "auto";

      // Keep compatibility with the old output area.
      const oldOutput = $("toolOutput");

      if (oldOutput) {
        oldOutput.textContent = translated;
        oldOutput.dir = "auto";
      }

      $("outputBox")?.classList.remove("show");

      setStatus("translatorResultStatus", "");

      // Only navigate after a valid translation is received.
      showPage("translatorResultPage");

    } catch (error) {
      console.error("Translator error:", error);

      setStatus(
        "toolStatus",
        "Translation failed: " + (error.message || "Please try again.")
      );

    } finally {
      setBusy(false);
    }
  }

  function initialize() {
    window.TinVinTools = window.TinVinTools || {};

    window.TinVinTools.translator = { run };

    const source = $("sourceLang");
    const target = $("targetLang");

    if (source && !source.value) source.value = "English";
    if (target && !target.value) target.value = "Sorani Kurdish";

    console.log("TinVin AI Translator loaded successfully.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

})();
