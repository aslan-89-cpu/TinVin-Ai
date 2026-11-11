/* TinVin AI - Home navigation (loads after app.js and chat.js) */
(() => {
  "use strict";

  const core = window.TinVinCore;
  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }

  const $ = id => document.getElementById(id);
  const panels = ["homePanel", "chatPage", "translatorPage", "scannerPanel"];

  function showHome() {
    panels.forEach(id => {
      const panel = $(id);
      if (!panel) return;
      const selected = id === "homePanel";
      panel.hidden = !selected;
      panel.classList.toggle("active", selected);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  ["chatPage", "translatorPage", "scannerPanel"].forEach(id => {
    const panel = $(id);
    if (!panel || panel.querySelector(".back-home")) return;

    const back = document.createElement("button");
    back.type = "button";
    back.className = "back-home";
    back.textContent = "← Home";
    back.addEventListener("click", showHome);
    panel.insertBefore(back, panel.firstChild);
  });

  document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => core.openTool(button.dataset.open));
  });

  $("homePremiumBtn")?.addEventListener("click", () => {
    window.TinVinPremium?.open?.();
  });

  $("homeSettingsBtn")?.addEventListener("click", () => {
    core.showPage("settingsPage");
  });

  $("settingsBackBtn")?.addEventListener("click", showHome);

  function sendFromHome() {
    const input = $("homeInput");
    const text = input?.value.trim();
    if (!text) return;

    core.openTool("chat");

    const chatInput = $("chatInput");
    if (chatInput) chatInput.value = text;
    input.value = "";

    window.TinVinTools.chat?.send?.();
  }

  $("homeSendBtn")?.addEventListener("click", sendFromHome);

  $("homeInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      sendFromHome();
    }
  });

  $("homeImageBtn")?.addEventListener("click", () => {
    core.openTool("chat");
    document.querySelector("#chatPage .chat-attach-btn")?.click();
  });

  const micButton = $("homeMicBtn");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  micButton?.addEventListener("click", () => {
    if (!Recognition) {
      core.setStatus("homeStatus", "Voice input is not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || "en";
    recognition.interimResults = false;

    micButton.classList.add("listening");

    recognition.onresult = event => {
      const text = event.results[0]?.[0]?.transcript || "";
      const input = $("homeInput");
      if (input) input.value = (input.value + " " + text).trim();
    };

    recognition.onerror = () => {
      core.setStatus("homeStatus", "Could not hear you. Try again.");
    };

    recognition.onend = () => micButton.classList.remove("listening");

    try {
      recognition.start();
    } catch {
      micButton.classList.remove("listening");
    }
  });

  showHome();
})();

/* Microphone inside AI Chat (v2) */
(() => {
  "use strict";

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const supported = {
    en: "en-US", ar: "ar-SA", fa: "fa-IR", tr: "tr-TR",
    fr: "fr-FR", de: "de-DE", es: "es-ES", ru: "ru-RU"
  };

  // Unsupported languages (such as Kurdish) fall back to English
  function speechLang() {
    const base = (document.documentElement.lang || "en").split("-")[0];
    return supported[base] || "en-US";
  }

  let active = null;

  function addChatMic() {
    const controls = document.querySelector("#chatPage .chat-attachment-controls");
    if (!controls || controls.querySelector(".chat-mic-btn")) return !!controls;

    const mic = document.createElement("button");
    mic.type = "button";
    mic.className = "chat-attach-btn chat-mic-btn";
    mic.textContent = "🎤";
    mic.setAttribute("aria-label", "Voice input");
    controls.appendChild(mic);

    const status = document.getElementById("chatStatus");
    const say = text => { if (status) status.textContent = text; };

    mic.addEventListener("click", () => {
      // second tap stops listening
      if (active) {
        active.stop();
        return;
      }

      if (!Recognition) {
        say("Voice input is not supported in this browser.");
        return;
      }

      const recognition = new Recognition();
      recognition.lang = speechLang();
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      active = recognition;

      recognition.onstart = () => {
        mic.classList.add("listening");
        say("Listening... speak now.");
      };

      recognition.onresult = event => {
        const text = event.results[0]?.[0]?.transcript || "";
        const input = document.getElementById("chatInput");
        if (input && text) {
          input.value = (input.value + " " + text).trim();
          input.focus();
        }
        say("");
      };

      recognition.onerror = event => {
        if (event.error === "no-speech") {
          say("Nothing heard. Tap 🎤 and speak right away.");
        } else {
          say("Mic error: " + (event.error || "unknown"));
        }
      };

      recognition.onend = () => {
        mic.classList.remove("listening");
        active = null;
      };

      try {
        recognition.start();
      } catch (error) {
        mic.classList.remove("listening");
        active = null;
        say("Mic error: " + error.message);
      }
    });

    return true;
  }

  if (!addChatMic()) {
    let tries = 0;
    const timer = setInterval(() => {
      if (addChatMic() || ++tries > 20) clearInterval(timer);
    }, 250);
  }
})();

/* Microphone inside Translate */
(() => {
  "use strict";

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const codes = {
    "English": "en-US", "Arabic": "ar-SA", "Persian": "fa-IR",
    "Turkish": "tr-TR", "Spanish": "es-ES", "French": "fr-FR",
    "German": "de-DE", "Italian": "it-IT", "Portuguese": "pt-PT",
    "Brazilian Portuguese": "pt-BR", "Russian": "ru-RU",
    "Ukrainian": "uk-UA", "Polish": "pl-PL", "Dutch": "nl-NL",
    "Swedish": "sv-SE", "Norwegian": "nb-NO", "Danish": "da-DK",
    "Finnish": "fi-FI", "Greek": "el-GR", "Romanian": "ro-RO",
    "Hungarian": "hu-HU", "Czech": "cs-CZ", "Slovak": "sk-SK",
    "Bulgarian": "bg-BG", "Serbian": "sr-RS", "Croatian": "hr-HR",
    "Hindi": "hi-IN", "Urdu": "ur-PK", "Bengali": "bn-BD",
    "Thai": "th-TH", "Vietnamese": "vi-VN", "Indonesian": "id-ID",
    "Malay": "ms-MY", "Chinese Simplified": "zh-CN",
    "Chinese Traditional": "zh-TW", "Japanese": "ja-JP", "Korean": "ko-KR"
  };

  let active = null;

  function addTranslatorMic() {
    const runBtn = document.getElementById("translatorRunBtn");
    if (!runBtn) return false;
    if (document.querySelector(".translator-mic-btn")) return true;

    const mic = document.createElement("button");
    mic.type = "button";
    mic.className = "translator-mic-btn";
    mic.textContent = "🎤";
    mic.setAttribute("aria-label", "Voice input");
    runBtn.parentNode.insertBefore(mic, runBtn);

    const say = text => {
      const status = document.getElementById("translatorStatus");
      if (status) status.textContent = text;
    };

    mic.addEventListener("click", () => {
      if (active) {
        active.stop();
        return;
      }

      if (!Recognition) {
        say("Voice input is not supported in this browser.");
        return;
      }

      const source = document.getElementById("translatorSourceLang")?.value || "English";
      const lang = codes[source];

      if (!lang) {
        say("Voice input does not support " + source + " yet. Choose another source language, or type.");
        return;
      }

      const recognition = new Recognition();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.continuous = false;
      active = recognition;

      recognition.onstart = () => {
        mic.classList.add("listening");
        say("Listening in " + source + "... speak now.");
      };

      recognition.onresult = event => {
        const text = event.results[0]?.[0]?.transcript || "";
        const input = document.getElementById("translatorInput");
        if (input && text) {
          input.value = (input.value + " " + text).trim();
          input.focus();
        }
        say("");
      };

      recognition.onerror = event => {
        if (event.error === "no-speech") {
          say("Nothing heard. Tap 🎤 and speak right away.
