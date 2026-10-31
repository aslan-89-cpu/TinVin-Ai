
(() => {
  "use strict";

  const API_BASE = "https://tinvin-ai-server.aslan89aslan1.workers.dev";
  const STORAGE_KEY = "tinvin_language";

  const languages = [
    "English", "Sorani Kurdish", "Kurmanji Kurdish", "Arabic",
    "Persian", "Turkish", "Spanish", "French", "German",
    "Italian", "Portuguese", "Brazilian Portuguese", "Russian",
    "Ukrainian", "Polish", "Dutch", "Swedish", "Norwegian",
    "Danish", "Finnish", "Greek", "Romanian", "Hungarian",
    "Czech", "Slovak", "Bulgarian", "Serbian", "Croatian",
    "Bosnian", "Albanian", "Macedonian", "Armenian", "Georgian",
    "Azerbaijani", "Kazakh", "Uzbek", "Turkmen", "Pashto",
    "Urdu", "Hindi", "Bengali", "Punjabi", "Gujarati", "Marathi",
    "Tamil", "Telugu", "Malayalam", "Kannada", "Thai",
    "Vietnamese", "Indonesian", "Malay", "Filipino",
    "Chinese Simplified", "Chinese Traditional", "Japanese",
    "Korean", "Swahili", "Amharic", "Somali", "Hausa",
    "Yoruba", "Zulu", "Afrikaans", "Nepali", "Sinhala",
    "Khmer", "Lao", "Mongolian", "Burmese"
  ];

  const originalTexts = new WeakMap();
  const originalPlaceholders = new WeakMap();

  let translatedNodes = [];
  let runId = 0;

  const $ = id => document.getElementById(id);

  function rememberOriginals() {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node;

    while ((node = walker.nextNode())) {
      const parent = node.parentElement;

      if (
        !parent ||
        !node.nodeValue.trim() ||
        parent.closest("script,style")
      ) continue;

      if (!originalTexts.has(node)) {
        originalTexts.set(node, node.nodeValue);
      }
    }

    document.querySelectorAll("[placeholder]").forEach(el => {
      if (!originalPlaceholders.has(el)) {
        originalPlaceholders.set(
          el,
          el.getAttribute("placeholder")
        );
      }
    });
  }

  function restoreOriginals() {
    translatedNodes.forEach(([node, original]) => {
      if (node.isConnected) {
        node.nodeValue = original;
      }
    });

    translatedNodes = [];

    document.querySelectorAll("[placeholder]").forEach(el => {
      const original = originalPlaceholders.get(el);

      if (original !== undefined) {
        el.setAttribute("placeholder", original);
      }
    });
  }

  async function postJSON(data) {
    const response = await fetch(API_BASE + "/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok || result.ok === false) {
      throw new Error(
        result.error || result.message || "Translation failed"
      );
    }

    return result;
  }

  function extractText(data) {
    if (typeof data.text === "string") return data.text;
    if (typeof data.output === "string") return data.output;
    if (typeof data.response === "string") return data.response;
    if (typeof data.result === "string") return data.result;

    const content = data.choices?.[0]?.message?.content;

    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      return content.map(item => item.text || "").join("\n");
    }

    return "";
  }

  function parseJSON(raw) {
    const clean = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(clean);
  }

  function getNodes() {
    rememberOriginals();

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const items = [];
    let node;

    while ((node = walker.nextNode())) {
      const parent = node.parentElement;

      if (
        !parent ||
        !node.nodeValue.trim() ||
        parent.closest("script,style") ||
        parent.closest("select,option")
      ) continue;

      const original = originalTexts.get(node);

      if (original) {
        items.push({ node, original });
      }
    }

    return items;
  }

  async function translateBatch(items, language, currentRun) {
    const payload = {};

    items.forEach((item, index) => {
      payload["s" + index] = item.original.trim();
    });

    const result = await postJSON({
      tool: "ui-translate",
      message: JSON.stringify(payload),
      targetLanguage: language
    });

    if (currentRun !== runId) return;

    const translated = parseJSON(extractText(result));

    items.forEach((item, index) => {
      const value = translated["s" + index];

      if (typeof value === "string" && value.trim()) {
        translatedNodes.push([item.node, item.original]);

        item.node.nodeValue = item.original.replace(
          item.original.trim(),
          value.trim()
        );
      }
    });
  }

  async function translatePlaceholders(language, currentRun) {
    const fields = [
      ...document.querySelectorAll(
        "input[placeholder],textarea[placeholder]"
      )
    ];

    const items = fields.map(el => ({
      el,
      original:
        originalPlaceholders.get(el) ??
        el.getAttribute("placeholder")
    })).filter(item => item.original);

    for (let start = 0; start < items.length; start += 20) {
      if (currentRun !== runId) return;

      const batch = items.slice(start, start + 20);
      const payload = {};

      batch.forEach((item, index) => {
        payload["p" + index] = item.original;
      });

      const result = await postJSON({
        tool: "ui-translate",
        message: JSON.stringify(payload),
        targetLanguage: language
      });

      if (currentRun !== runId) return;

      const translated = parseJSON(extractText(result));

      batch.forEach((item, index) => {
        const value = translated["p" + index];

        if (typeof value === "string" && value.trim()) {
          item.el.setAttribute("placeholder", value.trim());
        }
      });
    }
  }

  async function setLanguage(language) {
    const currentRun = ++runId;

    localStorage.setItem(STORAGE_KEY, language);

    restoreOriginals();

    if (!language || language === "English") {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
      updateStatus("English");
      return;
    }

    updateStatus("Translating...");

    try {
      const items = getNodes();

      for (let start = 0; start < items.length; start += 20) {
        if (currentRun !== runId) return;

        await translateBatch(
          items.slice(start, start + 20),
          language,
          currentRun
        );
      }

      await translatePlaceholders(language, currentRun);

      if (currentRun !== runId) return;

      const isRTL = [
        "Sorani Kurdish",
        "Arabic",
        "Persian",
        "Urdu"
      ].includes(language);

      document.documentElement.dir = isRTL ? "rtl" : "ltr";

      document.documentElement.lang =
        language === "Sorani Kurdish" ? "ckb" :
        language === "Kurmanji Kurdish" ? "kmr" :
        language === "Arabic" ? "ar" :
        language === "Persian" ? "fa" :
        "en";

      updateStatus(language);

    } catch (error) {
      if (currentRun === runId) {
        updateStatus("Translation failed: " + error.message);
        console.error("TinVin translation:", error);
      }
    }
  }

  function updateStatus(message) {
    const status = $("languageStatus");

    if (status) {
      status.textContent = message === "Translating..."
        ? message
        : "Interface language: " + message;
    }
  }

  function initialize() {
    rememberOriginals();

    const selector = $("interfaceLang");

    if (selector) {
      selector.replaceChildren();

      languages.forEach(language => {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        selector.appendChild(option);
      });

      selector.value =
        localStorage.getItem(STORAGE_KEY) || "English";

      selector.addEventListener("change", event => {
        setLanguage(event.target.value);
      });
    }

    const saved = localStorage.getItem(STORAGE_KEY) || "English";

    if (selector) selector.value = saved;

    if (saved !== "English") {
      setLanguage(saved);
    }
  }

  window.TinVinTranslate = {
    languages,
    setLanguage,
    restoreEnglish: () => setLanguage("English")
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

})();
