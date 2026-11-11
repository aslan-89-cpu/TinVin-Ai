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

/* Microphone inside AI Chat */
(() => {
  "use strict";

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function speechLang() {
    const lang = document.documentElement.lang || "en";
    if (lang === "ckb") return "ckb-IQ";
    return lang;
  }

  function addChatMic() {
    const controls = document.querySelector("#chatPage .chat-attachment-controls");
    if (!controls || controls.querySelector(".chat-mic-btn")) return !!controls;

    const mic = document.createElement("button");
    mic.type = "button";
    mic.className = "chat-attach-btn chat-mic-btn";
    mic.textContent = "🎤";
    mic.title = "Voice input";
    mic.setAttribute("aria-label", "Voice input");
    controls.appendChild(mic);

    mic.addEventListener("click", () => {
      const status = document.getElementById("chatStatus");

      if (!Recognition) {
        if (status) status.textContent = "Voice input is not supported in this browser.";
        return;
      }

      const recognition = new Recognition();
      recognition.lang = speechLang();
      recognition.interimResults = false;

      mic.classList.add("listening");
      if (status) status.textContent = "Listening...";

      recognition.onresult = event => {
        const text = event.results[0]?.[0]?.transcript || "";
        const input = document.getElementById("chatInput");
        if (input) {
          input.value = (input.value + " " + text).trim();
          input.focus();
        }
      };

      recognition.onerror = () => {
        if (status) status.textContent = "Could not hear you. Try again.";
      };

      recognition.onend = () => {
        mic.classList.remove("listening");
        if (status && status.textContent === "Listening...") status.textContent = "";
      };

      try {
        recognition.start();
      } catch {
        mic.classList.remove("listening");
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
