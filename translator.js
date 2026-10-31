
(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVin Core is not loaded.");
    return;
  }

  const {
    $,
    postJSON,
    extractText,
    setStatus,
    setLastOutput
  } = core;

  const languages = core.languages || [];

  // ==========================================
  // AI TRANSLATOR
  // ==========================================

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
      setStatus("toolStatus", "Please choose two different languages.");
      return;
    }

    setStatus("toolStatus", "Translating...");

    if (output) output.textContent = "";
    if (resultBox) resultBox.dir = "auto";

    try {
      const result = await postJSON("/api/ai", {
        tool: "translator",
        message,
        sourceLanguage,
        targetLanguage
      });

      const translated = extractText(result).trim();

      if (!translated) {
        throw new Error("The translation service returned an empty result.");
      }

      if (output) {
        output.textContent = translated;
        output.dir = "auto";
      }

      setLastOutput(translated);

      setStatus(
        "toolStatus",
        "Translation completed successfully."
      );

    } catch (error) {
      console.error("TinVin Translator:", error);

      setStatus(
        "toolStatus",
        "Translation failed: " + (error.message || "Please try again.")
      );
    }
  }

  // ==========================================
  // INTERFACE TRANSLATION
  // ==========================================

  let translationRun = 0;
  let translatedNodes = [];

  const originalText = new WeakMap();
  const originalPlaceholders = new WeakMap();

  function rememberOriginalTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node;

    while ((node = walker.nextNode())) {
      const parent = node.parentElement;

      if (!parent || parent.closest("script,style,.brand")) continue;
      if (!node.nodeValue.trim()) continue;

      if (!originalText.has(node)) {
        originalText.set(node, node.nodeValue);
      }
    }

    document.querySelectorAll("[placeholder]").forEach(element => {
      if (!originalPlaceholders.has(element)) {
        originalPlaceholders.set(
          element,
          element.getAttribute("placeholder")
        );
      }
    });
  }

  function restoreEnglishText() {
    translatedNodes.forEach(([node, original]) => {
      if (node.isConnected) {
        node.nodeValue = original;
      }
    });

    translatedNodes = [];

    document.querySelectorAll("[placeholder]").forEach(element => {
      const original = originalPlaceholders.get(element);

      if (original !== undefined) {
        element.setAttribute("placeholder", original);
      }
    });
  }

  function getTranslatableNodes() {
    rememberOriginalTextNodes();

    const items = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node;

    while ((node = walker.nextNode())) {
      const parent = node.parentElement;

      if (!parent || !node.nodeValue.trim()) continue;
      if (parent.closest("script,style,.brand")) continue;

      if (
        parent.closest(
          "#sourceLang,#targetLang,#interfaceLang,#themeSelect"
        )
      ) {
        continue;
      }

      const original = originalText.get(node) ?? node.nodeValue;

      items.push({
        node,
        original
      });
    }

    return items;
  }

  function parseJSON(raw) {
    const clean = String(raw || "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const result = JSON.parse(clean);

    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("Invalid translation response.");
    }

    return result;
  }

  async function translateBatch(payload, language) {
    const result = await postJSON("/api/ai", {
      tool: "ui-translate",
      message: JSON.stringify(payload),
      targetLanguage: language
    });

    return parseJSON(extractText(result));
  }

  async function translateInterface(language) {
    const runId = ++translationRun;

    restoreEnglishText();

    if (!language || language === "English") {
      document.documentElement.lang = "en";

      setStatus(
        "languageStatus",
        "Interface language: English"
      );

      return;
    }

    setStatus("languageStatus", "Translating interface...");

    const items = getTranslatableNodes();
    const batchSize = 20;

    try {
      // Translate normal interface text.
      for (let start = 0; start < items.length; start += batchSize) {
        if (runId !== translationRun) return;

        const batch = items.slice(start, start + batchSize);
        const payload = {};

        batch.forEach((item, index) => {
          payload["s" + index] = item.original.trim();
        });

        const translated = await translateBatch(payload, language);

        if (runId !== translationRun) return;

        batch.forEach((item, index) => {
          const value = translated["s" + index];

          if (typeof value === "string" && value.trim()) {
            translatedNodes.push([
              item.node,
              item.original
            ]);

            item.node.nodeValue = item.original.replace(
              item.original.trim(),
              value.trim()
            );
          }
        });
      }

      // Translate placeholders.
      const fields = [
        ...document.querySelectorAll(
          "input[placeholder], textarea[placeholder]"
        )
      ];

      const fieldData = fields.map(element => ({
        element,
        original:
          originalPlaceholders.get(element) ??
          element.getAttribute("placeholder")
      })).filter(item => item.original);

      for (let start = 0; start < fieldData.length; start += batchSize) {
        if (runId !== translationRun) return;

        const batch = fieldData.slice(start, start + batchSize);
        const payload = {};

        batch.forEach((item, index) => {
          payload["p" + index] = item.original;
        });

        const translated = await translateBatch(payload, language);

        if (runId !== translationRun) return;

        batch.forEach((item, index) => {
          const value = translated["p" + index];

          if (typeof value === "string" && value.trim()) {
            item.element.setAttribute(
              "placeholder",
              value.trim()
            );
          }
        });
      }

      document.documentElement.lang =
        language === "Sorani Kurdish" ? "ckb" :
        language === "Arabic" ? "ar" :
        language === "Kurmanji Kurdish" ? "ku-Latn" :
        "en";

      setStatus(
        "languageStatus",
        "Interface translated to " + language + "."
      );

    } catch (error) {
      if (runId === translationRun) {
        console.error("TinVin Interface Translation:", error);

        setStatus(
          "languageStatus",
          "Could not translate the full interface: " +
          (error.message || "Please try again.")
        );
      }
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  function initialize() {
    // Fill translator language menus if needed.
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

    if (source && !source.value) {
      source.value = "English";
    }

    if (target && !target.value) {
      target.value = "Sorani Kurdish";
    }

    // Register AI Translator.
    window.TinVinTools = window.TinVinTools || {};

    window.TinVinTools.translator = {
      run
    };

    // Register interface translation.
    window.TinVinTranslate = {
      translateInterface,
      rememberOriginalTextNodes
    };

    // Settings language selector.
    const selector = $("interfaceLang");

    if (selector) {
      const savedLanguage =
        localStorage.getItem("tinvin_language") || "English";

      selector.value = savedLanguage;

      selector.addEventListener("change", async event => {
        const language = event.target.value;

        try {
          localStorage.setItem("tinvin_language", language);
        } catch (error) {
          console.warn("Language preference could not be saved:", error);
        }

        await translateInterface(language);
      });
    }

    // Save original English text.
    rememberOriginalTextNodes();

    // Restore saved language after refresh.
    const savedLanguage =
      localStorage.getItem("tinvin_language") || "English";

    if (savedLanguage !== "English") {
      translateInterface(savedLanguage);
    } else {
      document.documentElement.lang = "en";
    }

    console.log("TinVin Translator loaded successfully.");
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
