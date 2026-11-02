
/* TinVin AI - Dedicated Translator Page */

(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }

  const { $, postJSON, setStatus, setLastOutput, showPage } = core;

  let busy = false;
  let lastTranslation = "";

  const languages = [
    "English",
    "Sorani Kurdish",
    "Kurmanji Kurdish",
    "Arabic",
    "Spanish",
    "French",
    "Portuguese",
    "German",
    "Turkish",
    "Persian",
    "Russian",
    "Chinese Simplified",
    "Japanese",
    "Korean",
    "Hindi",
    "Urdu",
    "Italian",
    "Dutch",
    "Ukrainian",
    "Polish"
  ];

  function extractTranslation(result) {
    if (!result) return "";

    if (typeof result === "string") return result.trim();

    if (Array.isArray(result)) {
      return result.map(extractTranslation)
        .filter(Boolean).join("\n");
    }

    if (typeof result === "object") {
      const fields = [
        "translation", "translatedText", "text",
        "output", "response", "answer", "content", "result"
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

      if (result.data) return extractTranslation(result.data);
    }

    return "";
  }

  function fillLanguages(select, selected) {
    if (!select) return;

    select.innerHTML = "";

    languages.forEach(language => {
      const option = document.createElement("option");
      option.value = language;
      option.textContent = language;
      select.appendChild(option);
    });

    select.value = selected;
  }

  function setBusy(value) {
    busy = value;

    const button = $("translatorRunBtn");

    if (button) {
      button.disabled = value;
      button.textContent = value ? "Translating..." : "Translate";
    }
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
      setStatus("translatorStatus", "Please enter text to translate.");
      input?.focus();
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setStatus("translatorStatus", "Please choose two different languages.");
      return;
    }

    setBusy(true);
    setStatus("translatorStatus", "Translating...");

    $("translatorResultBox")?.classList.add("hidden");
    $("translatorResultText").textContent = "";

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

      $("translatorResultText").textContent = translated;
      $("translatorResultText").dir = "auto";

      $("translatorResultBox")?.classList.remove("hidden");

      setStatus("translatorStatus", "");
      setStatus("translatorResultStatus", "Translation completed.");

    } catch (error) {
      console.error("Translator error:", error);

      setStatus(
        "translatorStatus",
        "Translation failed: " + (error.message || "Please try again.")
      );

    } finally {
      setBusy(false);
    }
  }

  function copyTranslation() {
    if (!lastTranslation) return;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(lastTranslation)
        .then(() => setStatus("translatorResultStatus", "Copied!"))
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    const text = $("translatorResultText")?.textContent || "";
    const area = document.createElement("textarea");

    area.value = text;
    document.body.appendChild(area);
    area.select();

    try {
      document.execCommand("copy");
      setStatus("translatorResultStatus", "Copied!");
    } catch (error) {
      setStatus("translatorResultStatus", "Copy failed.");
    }

    area.remove();
  }

  function clearTranslator() {
    $("translatorInput").value = "";
    $("translatorResultText").textContent = "";

    $("translatorResultBox")?.classList.add("hidden");

    lastTranslation = "";
    setStatus("translatorStatus", "");
    setStatus("translatorResultStatus", "");
  }

  function initialize() {
    window.TinVinTools = window.TinVinTools || {};

    fillLanguages($("translatorSourceLang"), "English");
    fillLanguages($("translatorTargetLang"), "Sorani Kurdish");

    $("translatorRunBtn")?.addEventListener("click", run);
    $("translatorCopyBtn")?.addEventListener("click", copyTranslation);
    $("translatorClearBtn")?.addEventListener("click", clearTranslator);

    $("translatorBackBtn")?.addEventListener("click", () => {
      showPage("homePage");
    });

    window.TinVinTools.translator = { run };

    console.log("TinVin AI Translator loaded successfully.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

})();
