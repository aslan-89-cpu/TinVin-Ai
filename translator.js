
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
    extractText,
    setStatus,
    setLastOutput
  } = core;

  async function run() {
    const input = $("toolInput");
    const output = $("toolOutput");
    const resultBox = $("outputBox");

    const message = input?.value.trim();

    const sourceLanguage = $("sourceLang")?.value || "English";
    const targetLanguage = $("targetLang")?.value || "Sorani Kurdish";

    if (!message) {
      setStatus("toolStatus", "Please enter text to translate.");
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setStatus(
        "toolStatus",
        "Please choose two different languages."
      );
      return;
    }

    setStatus("toolStatus", "Translating your text...");
    output.textContent = "";
    resultBox?.classList.remove("show");

    try {
      const result = await postJSON("/api/ai", {
        tool: "translate",
        message,
        sourceLanguage,
        targetLanguage
      });

      const translated = extractText(result);

      if (!translated.trim()) {
        throw new Error("The translator returned an empty response.");
      }

      output.textContent = translated;
      setLastOutput(translated);
      resultBox?.classList.add("show");

      setStatus(
        "toolStatus",
        "Translation completed: " + targetLanguage
      );

    } catch (error) {
      setStatus(
        "toolStatus",
        error.message || "Translation failed. Please try again."
      );
    }
  }

  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.translator = {
    run
  };

})();
