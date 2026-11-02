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
    setStatus,
    setLastOutput
  } = core;
  // ==========================================
  // LANGUAGE LIST
  // ==========================================
  const languages = core.languages?.length
    ? core.languages
    : [
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
  // ==========================================
  // RESPONSE TEXT EXTRACTION
  // ==========================================
  function extractTranslation(result) {
    if (result == null) {
      return "";
    }
    if (typeof result === "string") {
      return result.trim();
    }
    if (typeof result === "number") {
      return String(result);
    }
    if (Array.isArray(result)) {
      for (const item of result) {
        const text = extractTranslation(item);
        if (text) {
          return text;
        }
      }
      return "";
    }
    if (typeof result === "object") {
      // Common API response fields.
      const possibleFields = [
        "translation",
        "translatedText",
        "text",
        "output",
        "response",
        "answer",
        "message",
        "content",
        "result"
      ];
      for (const field of possibleFields) {
        if (result[field] !== undefined) {
          const value = result[field];
          if (typeof value === "string" && value.trim()) {
            return value.trim();
          }
          if (
            typeof value === "object" &&
            value !== null
          ) {
            const extracted = extractTranslation(value);
            if (extracted) {
              return extracted;
            }
          }
        }
      }
      // OpenAI-compatible response.
      if (result.choices?.length) {
        const choice = result.choices[0];
        const text =
          choice?.message?.content ??
          choice?.text ??
          choice?.delta?.content;
        if (typeof text === "string" && text.trim()) {
          return text.trim();
        }
      }
      // Gemini-compatible response.
      if (result.candidates?.length) {
        const candidate = result.candidates[0];
        const parts = candidate?.content?.parts;
        if (Array.isArray(parts)) {
          const text = parts
            .map(part => part?.text || "")
            .join("");
          if (text.trim()) {
            return text.trim();
          }
        }
      }
      // Nested data response.
      if (result.data !== undefined) {
        const extracted = extractTranslation(result.data);
        if (extracted) {
          return extracted;
        }
      }
    }
    // Use the existing TinVin Core extractor as fallback.
    if (typeof core.extractText === "function") {
      try {
        const fallback = core.extractText(result);
        if (
          typeof fallback === "string" &&
          fallback.trim()
        ) {
          return fallback.trim();
        }
      } catch (error) {
        console.warn("Core extraction failed:", error);
      }
    }
    return "";
  }
  // ==========================================
  // AI TRANSLATOR
  // ==========================================
  async function run() {
    const input = $("toolInput");
    const output = $("toolOutput");
    const resultBox = $("outputBox");
    const image = $("toolImage");
    const message = input?.value.trim();
    const sourceLanguage =
      $("sourceLang")?.value || "English";
    const targetLanguage =
      $("targetLang")?.value || "Sorani Kurdish";
    if (!message) {
      setStatus(
        "toolStatus",
        "Please enter text to translate."
      );
      return;
    }
    if (sourceLanguage === targetLanguage) {
      setStatus(
        "toolStatus",
        "Please choose two different languages."
      );
      return;
    }
    setStatus("toolStatus", "Translating...");
    if (output) {
      output.textContent = "";
      output.dir = "auto";
    }
    if (resultBox) {
      resultBox.dir = "auto";
    }
    if (image) {
      image.hidden = true;
    }
    const runBtn = $("runBtn");
    if (runBtn) {
      runBtn.disabled = true;
    }
    try {
      const result = await postJSON("/api/ai", {
        tool: "translator",
        message: message,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage
      });
      const translated = extractTranslation(result);
      if (!translated) {
        console.error(
          "Empty translation response:",
          result
        );
        throw new Error(
          "The AI returned an empty translation. Please try again."
        );
      }
      // Show translated text.
      if (output) {
        output.textContent = translated;
        output.dir = "auto";
      }
      if (resultBox) {
        resultBox.dir = "auto";
      }
      // Save output for Copy button.
      if (typeof setLastOutput === "function") {
        setLastOutput(translated);
      }
      setStatus(
        "toolStatus",
        "Translation completed successfully."
      );
    } catch (error) {
      console.error(
        "TinVin Translator Error:",
        error
      );
      if (output) {
        output.textContent = "";
      }
      setStatus(
        "toolStatus",
        "Translation failed: " +
        (error.message || "Please try again.")
      );
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
      }
    }
  }
  // ==========================================
  // INTERFACE TRANSLATION
  // ==========================================
  let translationRun = 0;
  let translatedNodes = [];
  const originalText = new WeakMap();
  const originalPlaceholders = new WeakMap();
  // ==========================================
  // SAVE ORIGINAL TEXT
  // ==========================================
  function rememberOriginalTextNodes() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;
      if (
        parent.closest(
          "script,style,.brand"
        )
      ) {
        continue;
      }
      if (!node.nodeValue.trim()) {
        continue;
      }
      if (!originalText.has(node)) {
        originalText.set(
          node,
          node.nodeValue
        );
      }
    }
    document
      .querySelectorAll("[placeholder]")
      .forEach(element => {
        if (!originalPlaceholders.has(element)) {
          originalPlaceholders.set(
            element,
            element.getAttribute("placeholder")
          );
        }
      });
  }
  // ==========================================
  // RESTORE ORIGINAL ENGLISH
  // ==========================================
  function restoreEnglishText() {
    translatedNodes.forEach(([node, original]) => {
      if (node.isConnected) {
        node.nodeValue = original;
      }
    });
    translatedNodes = [];
    document
      .querySelectorAll("[placeholder]")
      .forEach(element => {
        const original =
          originalPlaceholders.get(element);
        if (original !== undefined) {
          element.setAttribute(
            "placeholder",
            original
          );
        }
      });
  }
  // ==========================================
  // GET TRANSLATABLE TEXT
  // ==========================================
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
      if (!parent) continue;
      if (!node.nodeValue.trim()) {
        continue;
      }
      if (
        parent.closest(
          "script,style,.brand"
        )
      ) {
        continue;
      }
      if (
        parent.closest(
          "#sourceLang," +
          "#targetLang," +
          "#interfaceLang," +
          "#themeSelect"
        )
      ) {
        continue;
      }
      const original =
        originalText.get(node) ??
        node.nodeValue;
      items.push({
        node,
        original
      });
    }
    return items;
  }
  // ==========================================
  // JSON PARSER
  // ==========================================
  function parseJSON(raw) {
    const clean = String(raw || "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const result = JSON.parse(clean);
    if (
      !result ||
      typeof result !== "object" ||
      Array.isArray(result)
    ) {
      throw new Error(
        "Invalid translation response."
      );
    }
    return result;
  }
  // ==========================================
  // TRANSLATE BATCH
  // ==========================================
  async function translateBatch(
    payload,
    language
  ) {
    const result = await postJSON("/api/ai", {
      tool: "ui-translate",
      message: JSON.stringify(payload),
      targetLanguage: language
    });
    const text = extractTranslation(result);
    if (!text) {
      throw new Error(
        "The interface translation response is empty."
      );
    }
    return parseJSON(text);
  }
  // ==========================================
  // TRANSLATE INTERFACE
  // ==========================================
  async function translateInterface(language) {
    const runId = ++translationRun;
    restoreEnglishText();
    if (
      !language ||
      language === "English"
    ) {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
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
      // --------------------------------------
      // Translate normal interface text.
      // --------------------------------------
      for (
        let start = 0;
        start < items.length;
        start += batchSize
      ) {
        if (runId !== translationRun) {
          return;
        }
        const batch = items.slice(
          start,
          start + batchSize
        );
        const payload = {};
        batch.forEach((item, index) => {
          payload["s" + index] =
            item.original.trim();
        });
        const translated = await translateBatch(
          payload,
          language
        );
        if (runId !== translationRun) {
          return;
        }
        batch.forEach((item, index) => {
          const value =
            translated["s" + index];
          if (
            typeof value === "string" &&
            value.trim()
          ) {
            translatedNodes.push([
              item.node,
              item.original
            ]);
            const originalValue =
              item.original;
            const trimmedOriginal =
              originalValue.trim();
            const leadingWhitespace =
              originalValue.match(/^\s*/)?.[0] || "";
            const trailingWhitespace =
              originalValue.match(/\s*$/)?.[0] || "";
            item.node.nodeValue =
              leadingWhitespace +
              value.trim() +
              trailingWhitespace;
          }
        });
      }
      // --------------------------------------
      // Translate placeholders.
      // --------------------------------------
      const fields = [
        ...document.querySelectorAll(
          "input[placeholder]," +
          "textarea[placeholder]"
        )
      ];
      const fieldData = fields
        .map(element => ({
          element,
          original:
            originalPlaceholders.get(element) ??
            element.getAttribute("placeholder")
        }))
        .filter(item => item.original);
      for (
        let start = 0;
        start < fieldData.length;
        start += batchSize
      ) {
        if (runId !== translationRun) {
          return;
        }
        const batch = fieldData.slice(
          start,
          start + batchSize
        );
        const payload = {};
        batch.forEach((item, index) => {
          payload["p" + index] =
            item.original;
        });
        const translated = await translateBatch(
          payload,
          language
        );
        if (runId !== translationRun) {
          return;
        }
        batch.forEach((item, index) => {
          const value =
            translated["p" + index];
          if (
            typeof value === "string" &&
            value.trim()
          ) {
            item.element.setAttribute(
              "placeholder",
              value.trim()
            );
          }
        });
      }
      // --------------------------------------
      // Set document language and direction.
      // --------------------------------------
      if (language === "Sorani Kurdish") {
        document.documentElement.lang = "ckb";
        document.documentElement.dir = "rtl";
      } else if (language === "Arabic") {
        document.documentElement.lang = "ar";
        document.documentElement.dir = "rtl";
      } else if (language === "Persian") {
        document.documentElement.lang = "fa";
        document.documentElement.dir = "rtl";
      } else if (language === "Urdu") {
        document.documentElement.lang = "ur";
        document.documentElement.dir = "rtl";
      } else if (language === "Kurmanji Kurdish") {
        document.documentElement.lang = "ku-Latn";
        document.documentElement.dir = "ltr";
      } else {
        document.documentElement.lang = "en";
        document.documentElement.dir = "ltr";
      }
      setStatus(
        "languageStatus",
        "Interface translated to " +
        language +
        "."
      );
    } catch (error) {
      if (runId === translationRun) {
        console.error(
          "TinVin Interface Translation Error:",
          error
        );
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
    // --------------------------------------
    // Fill language dropdowns.
    // --------------------------------------
    const source = $("sourceLang");
    const target = $("targetLang");
    if (source && !source.options.length) {
      languages.forEach(language => {
        source.add(
          new Option(language, language)
        );
      });
    }
    if (target && !target.options.length) {
      languages.forEach(language => {
        target.add(
          new Option(language, language)
        );
      });
    }
    if (source && !source.value) {
      source.value = "English";
    }
    if (target && !target.value) {
      target.value = "Sorani Kurdish";
    }
    // --------------------------------------
    // Register Translator.
    // --------------------------------------
    window.TinVinTools =
      window.TinVinTools || {};
    window.TinVinTools.translator = {
      run
    };
    // --------------------------------------
    // Register Interface Translation.
    // --------------------------------------
    window.TinVinTranslate = {
      translateInterface,
      rememberOriginalTextNodes
    };
    // --------------------------------------
    // Settings Language Selector.
    // --------------------------------------
    const selector = $("interfaceLang");
    if (selector) {
      let savedLanguage = "English";
      try {
        savedLanguage =
          localStorage.getItem(
            "tinvin_language"
          ) || "English";
      } catch (error) {
        console.warn(
          "Language preference could not be loaded:",
          error
        );
      }
      selector.value = savedLanguage;
      selector.addEventListener(
        "change",
        async event => {
          const language =
            event.target.value;
          try {
            localStorage.setItem(
              "tinvin_language",
              language
            );
          } catch (error) {
            console.warn(
              "Language preference could not be saved:",
              error
            );
          }
          await translateInterface(language);
        }
      );
    }
    // --------------------------------------
    // Save Original Text.
    // --------------------------------------
    rememberOriginalTextNodes();
    // --------------------------------------
    // Restore Saved Language After Refresh.
    // --------------------------------------
    let savedLanguage = "English";
    try {
      savedLanguage =
        localStorage.getItem(
          "tinvin_language"
        ) || "English";
    } catch (error) {
      console.warn(
        "Saved language could not be read:",
        error
      );
    }
    if (savedLanguage !== "English") {
      translateInterface(savedLanguage);
    } else {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
    console.log(
      "TinVin Translator loaded successfully."
    );
  }
  // ==========================================
  // START APPLICATION
  // ==========================================
  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();