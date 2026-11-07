
(() => {
  "use strict";

  const API_BASE = "https://tinvin-ai-server.aslan89aslan1.workers.dev";
  const $ = id => document.getElementById(id);

  const languages = [
    "English", "Sorani Kurdish", "Kurmanji Kurdish",
    "Arabic", "Persian", "Turkish", "Spanish", "French",
    "German", "Italian", "Portuguese", "Brazilian Portuguese",
    "Russian", "Ukrainian", "Polish", "Dutch", "Swedish",
    "Norwegian", "Danish", "Finnish", "Greek", "Romanian",
    "Hungarian", "Czech", "Slovak", "Bulgarian", "Serbian",
    "Croatian", "Bosnian", "Albanian", "Macedonian",
    "Armenian", "Georgian", "Azerbaijani", "Kazakh",
    "Uzbek", "Turkmen", "Pashto", "Urdu", "Hindi",
    "Bengali", "Punjabi", "Gujarati", "Marathi", "Tamil",
    "Telugu", "Malayalam", "Kannada", "Thai", "Vietnamese",
    "Indonesian", "Malay", "Filipino", "Chinese Simplified",
    "Chinese Traditional", "Japanese", "Korean", "Swahili",
    "Amharic", "Somali", "Hausa", "Yoruba", "Zulu",
    "Afrikaans", "Nepali", "Sinhala", "Khmer", "Lao",
    "Mongolian", "Burmese"
  ];

  const languageCodes = {
    "English": "en",
    "Sorani Kurdish": "ckb",
    "Kurmanji Kurdish": "kmr",
    "Arabic": "ar",
    "Persian": "fa",
    "Turkish": "tr",
    "Spanish": "es",
    "French": "fr",
    "German": "de",
    "Italian": "it",
    "Portuguese": "pt",
    "Brazilian Portuguese": "pt-BR",
    "Russian": "ru",
    "Ukrainian": "uk",
    "Polish": "pl",
    "Dutch": "nl",
    "Swedish": "sv",
    "Norwegian": "no",
    "Danish": "da",
    "Finnish": "fi",
    "Greek": "el",
    "Romanian": "ro",
    "Hungarian": "hu",
    "Czech": "cs",
    "Slovak": "sk",
    "Bulgarian": "bg",
    "Serbian": "sr",
    "Croatian": "hr",
    "Bosnian": "bs",
    "Albanian": "sq",
    "Macedonian": "mk",
    "Armenian": "hy",
    "Georgian": "ka",
    "Azerbaijani": "az",
    "Kazakh": "kk",
    "Uzbek": "uz",
    "Turkmen": "tk",
    "Pashto": "ps",
    "Urdu": "ur",
    "Hindi": "hi",
    "Bengali": "bn",
    "Punjabi": "pa",
    "Gujarati": "gu",
    "Marathi": "mr",
    "Tamil": "ta",
    "Telugu": "te",
    "Malayalam": "ml",
    "Kannada": "kn",
    "Thai": "th",
    "Vietnamese": "vi",
    "Indonesian": "id",
    "Malay": "ms",
    "Filipino": "fil",
    "Chinese Simplified": "zh-CN",
    "Chinese Traditional": "zh-TW",
    "Japanese": "ja",
    "Korean": "ko",
    "Swahili": "sw",
    "Amharic": "am",
    "Somali": "so",
    "Hausa": "ha",
    "Yoruba": "yo",
    "Zulu": "zu",
    "Afrikaans": "af",
    "Nepali": "ne",
    "Sinhala": "si",
    "Khmer": "km",
    "Lao": "lo",
    "Mongolian": "mn",
    "Burmese": "my"
  };

  const rtlLanguages = [
    "Sorani Kurdish",
    "Arabic",
    "Persian",
    "Urdu",
    "Pashto"
  ];

  let activeTab = "chatPage";
  let lastOutput = "";
  let busy = false;
  let translationRun = 0;
  let translatedNodes = [];

  const originalText = new WeakMap();
  const originalPlaceholders = new WeakMap();

  window.TinVinTools = window.TinVinTools || {};

  function showPage(id) {
    const settings = id === "settingsPage";

    $("workspacePage")?.classList.toggle("active", !settings);
    $("settingsPage")?.classList.toggle("active", settings);

    if (!settings) {
      showWorkspaceTab(activeTab);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showWorkspaceTab(id) {
    if (!["chatPage", "translatorPage", "scannerPanel"].includes(id)) {
      id = "chatPage";
    }

    activeTab = id;

    document.querySelectorAll(".workspace-panel").forEach(panel => {
      const selected = panel.id === id;
      panel.hidden = !selected;
      panel.classList.toggle("active", selected);
    });

    document.querySelectorAll(".workspace-tab").forEach(tab => {
      const selected = tab.dataset.tab === id;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
    });

    if (id === "chatPage") {
      setTimeout(() => $("chatInput")?.focus(), 80);
    }

    if (id === "translatorPage") {
      setTimeout(() => $("translatorInput")?.focus(), 80);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setStatus(id, message) {
    const element = $(id);
    if (element) element.textContent = message || "";
  }

  function applyTheme(theme) {
    const allowed = [
      "purple", "navy", "blue", "green",
      "pink", "orange", "black"
    ];

    if (theme === "dark") theme = "black";
    if (!allowed.includes(theme)) theme = "purple";

    if (theme === "purple") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = theme;
    }

    try {
      localStorage.setItem("tinvin_theme", theme);
    } catch {}

    if ($("themeSelect")) $("themeSelect").value = theme;
  }

  function fillLanguages() {
    ["translatorSourceLang", "translatorTargetLang"].forEach(id => {
      const select = $(id);
      if (!select) return;

      select.replaceChildren();

      languages.forEach(language => {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        select.appendChild(option);
      });
    });

    if ($("translatorSourceLang")) {
      $("translatorSourceLang").value = "English";
    }

    if ($("translatorTargetLang")) {
      $("translatorTargetLang").value = "Sorani Kurdish";
    }
  }

  async function postJSON(path, data) {
    const response = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an unreadable response.");
    }

    if (!response.ok || result.ok === false) {
      throw new Error(
        result.error ||
        result.message ||
        ("Request failed (" + response.status + ")")
      );
    }

    return result;
  }

  function extractText(data) {
    if (typeof data === "string") return data;
    if (!data) return "";

    for (const key of [
      "text", "output", "response", "result",
      "translation", "translatedText", "answer"
    ]) {
      if (typeof data[key] === "string") return data[key];
    }

    const content = data.choices?.[0]?.message?.content;

    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      return content.map(item => item.text || "").join("\n");
    }

    const parts = data.candidates?.[0]?.content?.parts;

    if (Array.isArray(parts)) {
      return parts.map(item => item.text || "").join("");
    }

    if (data.data) return extractText(data.data);

    return "";
  }

  function parseTranslationJSON(raw) {
    if (typeof raw !== "string") return null;

    let cleaned = raw.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}

    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");

    if (first === -1 || last <= first) return null;

    try {
      const parsed = JSON.parse(cleaned.slice(first, last + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}

    return null;
  }

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

      if (original !== undefined && original !== null) {
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

      if (parent.closest(
        "#translatorSourceLang,#translatorTargetLang,#interfaceLang,#themeSelect"
      )) continue;

      const original = originalText.get(node) ?? node.nodeValue;

      items.push({ node, original });
    }

    return items;
  }

  async function requestTranslationBatch(entries, language, runId) {
    if (!entries.length) return;

    if (runId !== translationRun) return;

    const payload = {};

    entries.forEach((item, index) => {
      payload[item.key] = item.text;
    });

    const result = await postJSON("/api/ai", {
      tool: "ui-translate",
      message: JSON.stringify(payload),
      targetLanguage: language
    });

    if (runId !== translationRun) return;

    const translated = parseTranslationJSON(extractText(result));

    const missing = entries.filter(item =>
      !translated ||
      typeof translated[item.key] !== "string" ||
      !translated[item.key].trim()
    );

    if (missing.length) {
      if (entries.length > 1) {
        const middle = Math.ceil(entries.length / 2);

        await requestTranslationBatch(
          entries.slice(0, middle),
          language,
          runId
        );

        await requestTranslationBatch(
          entries.slice(middle),
          language,
          runId
        );

        return;
      }

      throw new Error(
        "The translation service did not return all required text."
      );
    }

    entries.forEach(item => {
      if (runId !== translationRun) return;

      const value = translated[item.key].trim();

      if (value) {
        item.apply(value);
      }
    });
  }

  function setLanguageDirection(language) {
    const html = document.documentElement;

    html.lang = languageCodes[language] || "en";

    if (rtlLanguages.includes(language)) {
      html.dir = "rtl";
    } else {
      html.dir = "ltr";
    }
  }

  async function translateInterface(language) {
    const runId = ++translationRun;

    restoreEnglishText();

    if (!language || language === "English") {
      setLanguageDirection("English");
      setStatus("languageStatus", "Interface language: English");
      return;
    }

    if (!languages.includes(language)) {
      setStatus("languageStatus", "Please select a supported language.");
      return;
    }

    setLanguageDirection(language);

    setStatus("languageStatus", "Translating interface...");

    const items = getTranslatableNodes();
    const batchSize = 10;

    try {
      for (let start = 0; start < items.length; start += batchSize) {
        if (runId !== translationRun) return;

        const batch = items.slice(start, start + batchSize);

        const entries = batch.map((item, index) => ({
          key: "s" + index,
          text: item.original.trim(),
          apply: value => {
            if (!item.node.isConnected) return;

            if (!translatedNodes.some(entry => entry[0] === item.node)) {
              translatedNodes.push([item.node, item.original]);
            }

            item.node.nodeValue = item.original.replace(
              item.original.trim(),
              value
            );
          }
        }));

        await requestTranslationBatch(entries, language, runId);
      }

      const fields = [
        ...document.querySelectorAll(
          "input[placeholder],textarea[placeholder]"
        )
      ];

      const fieldData = fields.map(element => ({
        element,
        original: originalPlaceholders.get(element) ??
          element.getAttribute("placeholder")
      })).filter(item => item.original);

      for (let start = 0; start < fieldData.length; start += batchSize) {
        if (runId !== translationRun) return;

        const batch = fieldData.slice(start, start + batchSize);

        const entries = batch.map((item, index) => ({
          key: "p" + index,
          text: item.original,
          apply: value => {
            item.element.setAttribute("placeholder", value);
          }
        }));

        await requestTranslationBatch(entries, language, runId);
      }

      if (runId !== translationRun) return;

      setLanguageDirection(language);

      setStatus(
        "languageStatus",
        "Interface translated to " + language + "."
      );

    } catch (error) {
      if (runId === translationRun) {
        setStatus(
          "languageStatus",
          "Could not translate the full interface: " +
          (error.message || "Please try again.")
        );
      }
    }
  }

  function openTool(key) {
    if (key === "chat") {
      showWorkspaceTab("chatPage");
    } else if (key === "translator") {
      showWorkspaceTab("translatorPage");
    } else if (key === "qr") {
      showWorkspaceTab("scannerPanel");
      window.TinVinQR?.open?.();
    }
  }

  function setLastOutput(value) {
    lastOutput = value || "";
  }

  window.TinVinCore = {
    $,
    API_BASE,
    languages,
    postJSON,
    extractText,
    setStatus,
    showPage,
    openTool,
    setLastOutput,
    getLastOutput: () => lastOutput,
    getActiveTool: () => activeTab,
    getBusy: () => busy,
    setBusy: value => { busy = Boolean(value); }
  };

  // Main tab navigation
  document.querySelectorAll(".workspace-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      showWorkspaceTab(tab.dataset.tab);
    });
  });

  // Scanner launcher
  $("openScannerBtn")?.addEventListener("click", () => {
    window.TinVinQR?.open?.();
  });

  // Settings
  $("settingsBtn")?.addEventListener("click", () => {
    showPage("settingsPage");
  });

  $("settingsBackBtn")?.addEventListener("click", () => {
    showPage("workspacePage");
  });

  $("themeSelect")?.addEventListener("change", event => {
    applyTheme(event.target.value);
  });

  // Interface language only
  $("interfaceLang")?.addEventListener("change", async event => {
    const language = event.target.value;

    try {
      localStorage.setItem("tinvin_language", language);
    } catch {}

    await translateInterface(language);
  });

  // Chat controls
  $("sendBtn")?.addEventListener("click", () => {
    window.TinVinTools.chat?.send?.();
  });

  $("chatInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      window.TinVinTools.chat?.send?.();
    }
  });

  $("newChatBtn")?.addEventListener("click", () => {
    window.TinVinTools.chat?.newChat?.();
  });

  // Initial setup
  fillLanguages();

  applyTheme(
    localStorage.getItem("tinvin_theme") || "purple"
  );

  rememberOriginalTextNodes();

  const savedLanguage =
    localStorage.getItem("tinvin_language") || "English";

  if ($("interfaceLang")) {
    $("interfaceLang").value = languages.includes(savedLanguage)
      ? savedLanguage
      : "English";
  }

  if (savedLanguage !== "English" && languages.includes(savedLanguage)) {
    translateInterface(savedLanguage);
  } else {
    setLanguageDirection("English");
  }

  showWorkspaceTab("chatPage");
})();
