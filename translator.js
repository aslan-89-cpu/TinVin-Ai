
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
  // 1. AI TRANSLATOR TOOL
  // ==========================================

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

      setStatus(
        "toolStatus",
        "Translation completed successfully."
      );

    } catch (error) {
      console.error("TinVin AI Translator:", error);

      setStatus(
        "toolStatus",
        "Translation failed: " + (error.message || "Please try again.")
      );
    }
  }

  // ==========================================
  // 2. INTERFACE TRANSLATION
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

  function parseTranslationJSON(raw) {
    const clean = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const parsed = JSON.parse(clean);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("The translation service returned invalid JSON.");
    }

    return parsed;
  }

  async function translateBatch(payload, language) {
    const result = await postJSON("/api/ai", {
      tool: "ui-translate",
      message: JSON.stringify(payload),
      targetLanguage: language
    });

    return parseTranslationJSON(extractText(result));
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

    setStatus(
      "languageStatus",
      "Translating interface..."
    );

    const items = getTranslatableNodes();
    const batchSize = 20;

    try {
      // Translate visible text.
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
          "input[placeholder],textarea[placeholder]"
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
        console.error("TinVin interface translation:", error);

        setStatus(
          "languageStatus",
          "Could not translate the full interface: " +
          (error.message || "Please try again.")
        );
      }
    }
  }

  // ==========================================
  // 3. INITIALIZATION
  // ==========================================

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
          console.warn("Could not save interface language:", error);
        }

        await translateInterface(language);
      });
    }

    // Remember original English text.
    rememberOriginalTextNodes();

    // Restore saved language after refresh.
    const savedLanguage =
      localStorage.getItem("tinvin_language") || "English";

    if (savedLanguage !== "English") {
      translateInterface(savedLanguage);
    } else {
      document.documentElement.lang = "en";
    }

    console.log(
      "TinVin Translator and Interface Translation loaded successfully."
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
