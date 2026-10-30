
(() => {
  "use strict";

  const API_BASE = "https://tinvin-ai-server.aslan89aslan1.workers.dev";

  const $ = id => document.getElementById(id);

  const definitions = {
    writer: {
      title: "AI Writer",
      icon: "✍️",
      description: "Create clear, polished and engaging content.",
      label: "What would you like me to write?",
      placeholder: "Write a professional email, social post, story..."
    },
    chat: {
      title: "AI Chat",
      icon: "💬",
      description: "Ask questions and explore ideas.",
      label: "Your message",
      placeholder: "Ask your question..."
    },
    translator: {
      title: "AI Translator",
      icon: "🌍",
      description: "Translate text into your chosen language.",
      label: "Text to translate",
      placeholder: "Paste the text you want translated..."
    },
    business: {
      title: "Business Studio",
      icon: "📈",
      description: "Build your next business idea.",
      label: "What business task can I help with?",
      placeholder: "Create a business plan, marketing strategy..."
    },
    study: {
      title: "Study Assistant",
      icon: "📚",
      description: "Learn complicated topics step by step.",
      label: "What would you like to learn?",
      placeholder: "Explain a topic or create a study plan..."
    },
    ideas: {
      title: "Idea Generator",
      icon: "💡",
      description: "Generate useful, original ideas.",
      label: "What do you need ideas for?",
      placeholder: "Give me ideas for an app, business, content..."
    },
    image: {
      title: "Image Generator",
      icon: "🎨",
      description: "Create an image from a text prompt.",
      label: "Describe the image you want",
      placeholder: "A beautiful futuristic city at sunset..."
    }
  };

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

  const pages = [
    "homePage",
    "toolPage",
    "chatPage",
    "settingsPage"
  ];

  let activeTool = "writer";
  let lastOutput = "";
  let busy = false;
  let translationRun = 0;
  let translatedNodes = [];

  const originalText = new WeakMap();
  const originalPlaceholders = new WeakMap();

  // Separate tool files register their functions here.
  window.TinVinTools = window.TinVinTools || {};

  function showPage(id) {
    pages.forEach(page => {
      const element = $(page);
      if (element) {
        element.classList.toggle("active", page === id);
      }
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function setStatus(id, text) {
    const element = $(id);
    if (element) element.textContent = text || "";
  }

  function applyTheme(theme) {
    const themes = [
      "purple", "blue", "green",
      "orange", "pink", "dark"
    ];

    if (!themes.includes(theme)) {
      theme = "purple";
    }

    if (theme === "purple") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = theme;
    }

    localStorage.setItem("tinvin_theme", theme);

    const selector = $("themeSelect");
    if (selector) selector.value = theme;
  }

  function fillLanguageMenus() {
    ["sourceLang", "targetLang"].forEach(id => {
      const select = $(id);
      if (!select) return;

      select.replaceChildren();

      languages.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
    });

    if ($("sourceLang")) $("sourceLang").value = "English";
    if ($("targetLang")) $("targetLang").value = "Sorani Kurdish";
  }

  async function postJSON(path, data) {
    const response = await fetch(API_BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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

  function makeImage(data, container) {
    const raw = data.image || data.base64 || data.data;

    if (!raw || !container) return false;

    const img = document.createElement("img");

    img.className = "image-result";
    img.alt = "AI-generated image";

    img.src = raw.startsWith("data:")
      ? raw
      : `data:${data.mimeType || "image/png"};base64,${raw}`;

    container.appendChild(img);

    return true;
  }

  function imageIntent(text) {
    return /\b(generate|create|draw|make|design|render)\b.{0,45}\b(image|picture|illustration|artwork|logo)\b|\b(image|picture|illustration|artwork|logo)\b.{0,35}\b(of|showing|with)\b/i.test(text);
  }

  function openTool(key) {
    if (!definitions[key]) return;

    activeTool = key;

    if (key === "chat") {
      showPage("chatPage");
      $("chatInput")?.focus();
      return;
    }

    const item = definitions[key];

    $("activeTitle").textContent = item.title;
    $("activeIcon").textContent = item.icon;
    $("activeDescription").textContent = item.description;
    $("inputLabel").textContent = item.label;
    $("toolInput").placeholder = item.placeholder;

    $("toolInput").value = "";
    $("toolOutput").textContent = "";
    $("toolImage").replaceChildren();

    $("translatorOptions").classList.toggle(
      "hidden",
      key !== "translator"
    );

    $("imageHint").classList.toggle(
      "hidden",
      key !== "image"
    );

    $("resultTitle").textContent =
      key === "image" ? "Generated image" : "Result";

    $("copyBtn").classList.toggle(
      "hidden",
      key === "image"
    );

    $("runBtn").textContent =
      key === "image"
        ? "Generate image"
        : key === "translator"
          ? "Translate"
          : "Generate";

    setStatus("toolStatus", "");
    lastOutput = "";

    showPage("toolPage");

    const language =
      localStorage.getItem("tinvin_language") || "English";

    if (language !== "English") {
      translateInterface(language);
    }

    $("toolInput").focus();
  }

  // Shared interface translation.
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
      ) continue;

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
          const raw = extractText(result);
          const clean = raw
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "");

          translated = JSON.parse(clean);
        } catch {
          throw new Error(
            "The translation service returned invalid JSON."
          );
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
        original:
          originalPlaceholders.get(element) ??
          element.getAttribute("placeholder")
      })).filter(item => item.original);

      for (let start = 0; start < fieldData.length; start += 20) {
        if (runId !== translationRun) return;

        const batch = fieldData.slice(start, start + 20);
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
          const raw = extractText(result);
          translated = JSON.parse(
            raw.replace(/^```(?:json)?\s*/i, "")
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

  // Tool modules handle their own requests.
  async function runActiveTool() {
    if (busy) return;

    const module = window.TinVinTools[activeTool];

    if (!module || typeof module.run !== "function") {
      setStatus(
        "toolStatus",
        "This tool is not loaded yet. Please try again."
      );
      return;
    }

    busy = true;
    $("runBtn").disabled = true;

    try {
      await module.run();
    } catch (error) {
      setStatus(
        "toolStatus",
        "Error: " + (error.message || "Request failed")
      );
    } finally {
      busy = false;
      $("runBtn").disabled = false;
    }
  }

  // Shared functions for the separate tool files.
  window.TinVinCore = {
    $,
    API_BASE,
    definitions,
    languages,
    postJSON,
    extractText,
    makeImage,
    imageIntent,
    setStatus,
    showPage,
    openTool,
    getActiveTool: () => activeTool,
    getLastOutput: () => lastOutput,
    setLastOutput: value => {
      lastOutput = value || "";
    },
    getBusy: () => busy,
    setBusy: value => {
      busy = Boolean(value);
    }
  };

  // Home and navigation.
  $("toolsGrid").addEventListener("click", event => {
    const card = event.target.closest("[data-tool]");

    if (card) {
      openTool(card.dataset.tool);
    }
  });

  $("backBtn").addEventListener("click", () => {
    showPage("homePage");
  });

  $("chatBackBtn").addEventListener("click", () => {
    showPage("homePage");
  });

  $("settingsBackBtn").addEventListener("click", () => {
    showPage("homePage");
  });

  $("settingsBtn").addEventListener("click", () => {
    showPage("settingsPage");
  });

  $("runBtn").addEventListener("click", runActiveTool);

  // Tool input shortcuts.
  $("toolInput").addEventListener("keydown", event => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      runActiveTool();
    }
  });

  $("clearBtn").addEventListener("click", () => {
    $("toolInput").value = "";
    $("toolOutput").textContent = "";
    $("toolImage").replaceChildren();

    lastOutput = "";

    setStatus("toolStatus", "");
  });

  $("copyBtn").addEventListener("click", async () => {
    if (!lastOutput) return;

    try {
      await navigator.clipboard.writeText(lastOutput);
      setStatus("toolStatus", "Copied to clipboard.");
    } catch {
      setStatus(
        "toolStatus",
        "Copy is unavailable in this browser."
      );
    }
  });

  // Chat is handled by chat.js.
  $("sendBtn").addEventListener("click", () => {
    window.TinVinTools.chat?.send?.();
  });

  $("chatInput").addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      window.TinVinTools.chat?.send?.();
    }
  });

  $("newChatBtn").addEventListener("click", () => {
    window.TinVinTools.chat?.newChat?.();
  });

  // Settings.
  $("themeSelect").addEventListener("change", event => {
    applyTheme(event.target.value);
  });

  $("interfaceLang").addEventListener("change", async event => {
    const language = event.target.value;

    localStorage.setItem("tinvin_language", language);

    await translateInterface(language);
  });

  // Start application.
  fillLanguageMenus();

  applyTheme(
    localStorage.getItem("tinvin_theme") || "purple"
  );

  $("interfaceLang").value =
    localStorage.getItem("tinvin_language") || "English";

  rememberOriginalTextNodes();

  const savedLanguage =
    localStorage.getItem("tinvin_language") || "English";

  if (savedLanguage !== "English") {
    translateInterface(savedLanguage);
  }

})();
