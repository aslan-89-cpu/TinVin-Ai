
/* TinVin AI - Dedicated Translator Page */

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
        .filter(Boolean)
        .join("\n");
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
          .join("\n")
          .trim();
      }

      const parts = result.candidates?.[0]?.content?.parts;

      if (Array.isArray(parts)) {
        return parts.map(item => item.text || "")
          .join("")
          .trim();
      }

      if (result.data) return extractTranslation(result.data);
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
    const resultBox = $("translatorResultBox");
    const resultText = $("translatorResultText");

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
      setStatus(
        "translatorStatus",
        "Please choose two different languages."
      );
      return;
    }

    setBusy(true);
    setStatus("translatorStatus", "Translating...");
    setStatus("translatorResultStatus", "");

    resultBox?.classList.add("hidden");

    if (resultText) resultText.textContent = "";

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

      if (resultText) {
        resultText.textContent = translated;
        resultText.dir = "auto";
      }

      resultBox?.classList.remove("hidden");

      setStatus("translatorStatus", "");
      setStatus(
        "translatorResultStatus",
        "Translation completed."
      );

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

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lastTranslation);
      } else {
        throw new Error("Clipboard unavailable");
      }

      setStatus("translatorResultStatus", "Copied to clipboard.");

    } catch {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    const text = $("translatorResultText")?.textContent || "";

    if (!text) {
      setStatus("translatorResultStatus", "There is no text to copy.");
      return;
    }

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

    setStatus(
      "translatorResultStatus",
      copied ? "Copied to clipboard." : "Copy failed."
    );
  }

  function clearTranslator() {
    const input = $("translatorInput");
    const resultText = $("translatorResultText");

    if (input) input.value = "";
    if (resultText) resultText.textContent = "";

    $("translatorResultBox")?.classList.add("hidden");

    lastTranslation = "";
    setLastOutput("");

    setStatus("translatorStatus", "");
    setStatus("translatorResultStatus", "");

    input?.focus();
  }

  function initialize() {
    window.TinVinTools = window.TinVinTools || {};

    fillLanguages($("translatorSourceLang"), "English");
    fillLanguages($("translatorTargetLang"), "Sorani Kurdish");

    $("translatorRunBtn")?.addEventListener("click", run);

    $("translatorCopyBtn")?.addEventListener(
      "click",
      copyTranslation
    );

    $("translatorClearBtn")?.addEventListener(
      "click",
      clearTranslator
    );

    $("translatorBackBtn")?.addEventListener("click", () => {
      core.showPage("homePage");
    });

    $("translatorInput")?.addEventListener("keydown", event => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        run();
      }
    });

    window.TinVinTools.translator = { run, clear: clearTranslator };

    console.log("TinVin AI Translator loaded successfully.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, {
      once: true
    });
  } else {
    initialize();
  }

})();
