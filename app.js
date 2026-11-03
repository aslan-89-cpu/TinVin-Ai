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
      if (node.isConnected) node.nodeValue = original;
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

  async function translateInterface(language) {
    const runId = ++translationRun;

    restoreEnglishText();

    if (!language || language === "English") {
      document.documentElement.lang = "en";
      setStatus("languageStatus", "Interface language: English");
      return;
    }

    setStatus("languageStatus", "Translating interface...");

    const items = getTranslatableNodes();
    const batchSize = 20;

    try {
      for (let start = 0; start < items.length; start += batchSize) {
        if (runId !== translationRun) return;

        const batch = items.slice(start, start + batchSize);
        const payload = {};

        batch.forEach((item, index) => {
          payload["s" + index] = item.original.trim();
        });

        const result = await postJSON("/api/ai", {
          tool: "ui-translate",
          message: JSON.stringify(payload),
          targetLanguage: language
        });

        let translated;

        try {
          translated = JSON.parse(
            extractText(result)
              .replace(/^```(?:json)?\s*/i, "")
              .replace(/\s*```$/, "")
          );
        } catch {
          throw new Error("The translation service returned invalid JSON.");
        }

        if (!translated || typeof translated !== "object") {
          throw new Error("The translation service returned an invalid result.");
        }

        if (runId !== translationRun) return;

        batch.forEach((item, index) => {
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
        const payload = {};

        batch.forEach((item, index) => {
          payload["p" + index] = item.original;
        });

        const result = await postJSON("/api/ai", {
          tool: "ui-translate",
          message: JSON.stringify(payload),
          targetLanguage: language
        });

        let translated = {};

        try {
          translated = JSON.parse(
            extractText(result)
              .replace(/^```(?:json)?\s*/i, "")
              .replace(/\s*```$/, "")
          );
        } catch {}

        if (runId === translationRun) {
          batch.forEach((item, index) => {
            if (typeof translated["p" + index] === "string") {
              item.element.setAttribute(
                "placeholder",
                translated["p" + index]
              );
            }
          });
        }
      }

      document.documentElement.lang =
        language === "Sorani Kurdish" ? "ckb" :
        language === "Arabic" ? "ar" :
        language === "Kurmanji Kurdish" ? "ku-Latn" : "en";

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
  applyTheme(localStorage.getItem("tinvin_theme") || "purple");

  if ($("interfaceLang")) {
    $("interfaceLang").value =
      localStorage.getItem("tinvin_language") || "English";
  }

  rememberOriginalTextNodes();

  const savedLanguage =
    localStorage.getItem("tinvin_language") || "English";

  if (savedLanguage !== "English") {
    translateInterface(savedLanguage);
  }

  showWorkspaceTab("chatPage");
})();