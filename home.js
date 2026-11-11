/* TinVin AI - Home navigation + microphones (loads after app.js and chat.js) */
(() => {
  "use strict";

  const core = window.TinVinCore;
  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }

  const $ = id => document.getElementById(id);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const panels = ["homePanel", "chatPage", "translatorPage", "scannerPanel"];

  /* ---------- Navigation ---------- */

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

  /* ---------- Home prompt bar ---------- */

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

  /* ---------- Microphone helper ---------- */

  let activeRecognition = null;

  function startListening(options) {
    const { button, lang, say, onText } = options;

    if (activeRecognition) {
      activeRecognition.stop();
      return;
    }

    if (!Recognition) {
      say("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    activeRecognition = recognition;

    recognition.onstart = () => {
      button.classList.add("listening");
      say("Listening... speak now.");
    };

    recognition.onresult = event => {
      const text = event.results[0]?.[0]?.transcript || "";
      if (text) onText(text);
      say("");
    };

    recognition.onerror = event => {
      if (event.error === "no-speech") {
        say("Nothing heard. Tap the microphone and speak right away.");
      } else {
        say("Mic error: " + (event.error || "unknown"));
      }
    };

    recognition.onend = () => {
      button.classList.remove("listening");
      activeRecognition = null;
    };

    try {
      recognition.start();
    } catch (error) {
      button.classList.remove("listening");
      activeRecognition = null;
      say("Mic error: " + error.message);
    }
  }

  function appendTo(inputId) {
    return text => {
      const input = $(inputId);
      if (!input) return;
      input.value = (input.value + " " + text).trim();
      input.focus();
    };
  }

  /* Languages the browser can recognise. Kurdish is not supported, so
     the interface language falls back to English. */
  const chatLangs = {
    en: "en-US", ar: "ar-SA", fa: "fa-IR", tr: "tr-TR",
    fr: "fr-FR", de: "de-DE", es: "es-ES", ru: "ru-RU"
  };

  const translateLangs = {
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

  /* Home mic */
  $("homeMicBtn")?.addEventListener("click", () => {
    const base = (document.documentElement.lang || "en").split("-")[0];

    startListening({
      button: $("homeMicBtn"),
      lang: chatLangs[base] || "en-US",
      say: text => core.setStatus("homeStatus", text),
      onText: appendTo("homeInput")
    });
  });

  /* AI Chat mic */
  function addChatMic() {
    const controls = document.querySelector("#chatPage .chat-attachment-controls");
    if (!controls) return false;
    if (controls.querySelector(".chat-mic-btn")) return true;

    const mic = document.createElement("button");
    mic.type = "button";
    mic.className = "chat-attach-btn chat-mic-btn";
    mic.textContent = "🎤";
    mic.setAttribute("aria-label", "Voice input");
    controls.appendChild(mic);

    mic.addEventListener("click", () => {
      const base = (document.documentElement.lang || "en").split("-")[0];

      startListening({
        button: mic,
        lang: chatLangs[base] || "en-US",
        say: text => core.setStatus("chatStatus", text),
        onText: appendTo("chatInput")
      });
    });

    return true;
  }

  /* Translate mic (uses the source language) */
  function addTranslatorMic() {
    const runBtn = $("translatorRunBtn");
    if (!runBtn) return false;
    if (document.querySelector(".translator-mic-btn")) return true;

    const mic = document.createElement("button");
    mic.type = "button";
    mic.className = "translator-mic-btn";
    mic.textContent = "🎤";
    mic.setAttribute("aria-label", "Voice input");
    runBtn.parentNode.insertBefore(mic, runBtn);

    mic.addEventListener("click", () => {
      const say = text => core.setStatus("translatorStatus", text);
      const source = $("translatorSourceLang")?.value || "English";
      const lang = translateLangs[source];

      if (!lang) {
        say("Voice input does not support " + source +
          " yet. Choose another source language, or type.");
        return;
      }

      startListening({
        button: mic,
        lang,
        say,
        onText: appendTo("translatorInput")
      });
    });

    return true;
  }

  function addMicsWhenReady() {
    let tries = 0;

    const timer = setInterval(() => {
      const chatDone = addChatMic();
      const translatorDone = addTranslatorMic();

      if ((chatDone && translatorDone) || ++tries > 20) {
        clearInterval(timer);
      }
    }, 250);
  }

  addMicsWhenReady();

  /* Start on Home */
  showHome();
})();
