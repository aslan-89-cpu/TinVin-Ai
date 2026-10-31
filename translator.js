
(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVin Core is not loaded.");
    return;
  }

  const { $, postJSON, extractText, setStatus, setLastOutput } = core;

  const languages = core.languages || [];

  async function run() {
    const input = $("toolInput");
    const output = $("toolOutput");
    const resultBox = $("outputBox");
    const sourceSelect = $("sourceLang");
    const targetSelect = $("targetLang");

    const message = input?.value.trim();
    const sourceLanguage = sourceSelect?.value || "English";
    const targetLanguage = targetSelect?.value || "Sorani Kurdish";

    if (!message) {
      setStatus("toolStatus", "Please enter text to translate.");
      return;
    }

    if (!targetLanguage) {
      setStatus("toolStatus", "Please select a target language.");
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setStatus("toolStatus", "Please choose two different languages.");
      return;
    }

    setStatus("toolStatus", "Translating...");
    if (output) output.textContent = "";
    if (resultBox) resultBox.dir = "auto";

    try {
      const result = await postJSON("/api/ai", {
        tool: "translate",
        message,
        sourceLanguage,
        targetLanguage
      });

      const translated = extractText(result);

      if (!translated.trim()) {
        throw new Error("The translation service returned an empty result.");
      }

      if (output) {
        output.textContent = translated.trim();
        output.dir = "auto";
      }

      setLastOutput(translated.trim());
      setStatus("toolStatus", "Translation completed successfully.");

    } catch (error) {
      console.error("TinVin AI Translator:", error);
      setStatus(
        "toolStatus",
        "Translation failed: " + (error.message || "Please try again.")
      );
    }
  }

  function initialize() {
    const source = $("sourceLang");
    const target = $("targetLang");

    if (source && !source.options.length) {
      languages.forEach(language => {
        source.add(new Option(language, language));
      });
    }

    if (target && !target.options.length) {
      languages.forEach(language => {
        target.add(new Option(language, language));
      });
    }

    if (source && !source.value) source.value = "English";
    if (target && !target.value) target.value = "Sorani Kurdish";

    window.TinVinTools = window.TinVinTools || {};

    window.TinVinTools.translator = {
      run
    };

    console.log("TinVin AI Translator loaded successfully.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
