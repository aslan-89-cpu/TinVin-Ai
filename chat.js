
(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }

  const { $, postJSON, extractText, setStatus } = core;

  // Keep conversation in chronological order for the API.
  const history = [];
  let sending = false;

  function setChatStatus(message) {
    const status = $("chatStatus");
    if (status) status.textContent = message || "";
  }

  function isImageRequest(text) {
    const message = String(text || "").toLowerCase();

    const english =
      /\b(generate|create|draw|make|design|render|produce)\b.{0,100}\b(image|picture|photo|illustration|artwork|logo|wallpaper)\b|\b(image|picture|photo|illustration|artwork|logo|wallpaper)\b.{0,60}\b(of|showing|with)\b/i;

    const sorani =
      /(وێنە|وێنەی|وێنەیەک|وێنەیەکی|وێنەکان).{0,100}(دروست|بکە|کێشە|نیشان|ڕەسم|بۆم)|(?:دروست|بکە|کێشە|ڕەسم).{0,80}(وێنە|وێنەی)/;

    const kurmanji =
      /(wêne|wêneyek|resim).{0,100}(çêke|biafirîne|nîşan|xêz)|(?:çêke|biafirîne|xêz).{0,80}(wêne|resim)/i;

    const arabic =
      /(صورة|صور|ارسم|أنشئ|انشئ|اصنع|أنشئ لي|صمم).{0,100}(صورة|رسم|شعار)|(?:أنشئ|انشئ|ارسم|اصنع|صمم).{0,80}(صورة|شعار)/;

    return english.test(message) ||
      sorani.test(message) ||
      kurmanji.test(message) ||
      arabic.test(message);
  }

  function getImageSource(result) {
    if (!result) return "";

    const raw =
      result.image ||
      result.imageUrl ||
      result.image_url ||
      result.url ||
      result.base64 ||
      result.data;

    if (typeof raw !== "string" || !raw.trim()) return "";

    const value = raw.trim();

    if (
      value.startsWith("data:image/") ||
      value.startsWith("https://") ||
      value.startsWith("http://")
    ) {
      return value;
    }

    return `data:${result.mimeType || "image/png"};base64,${value}`;
  }

  function addBubble(role, content, imageUrl = "") {
    const container = $("chatHistory");
    if (!container) return null;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble " + role;

    if (content) {
      const message = document.createElement("div");
      message.className = "chat-message";
      message.textContent = content;
      bubble.appendChild(message);
    }

    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "AI-generated image";
      image.className = "chat-image";
      image.loading = "lazy";
      bubble.appendChild(image);
    }

    container.appendChild(bubble);

    // Newest messages stay visible at the bottom.
    container.scrollTop = container.scrollHeight;

    return bubble;
  }

  function renderHistory() {
    const container = $("chatHistory");
    if (!container) return;

    container.replaceChildren();

    history.forEach(turn => {
      addBubble("user", turn.user);

      if (turn.assistantImage) {
        addBubble(
          "assistant",
          turn.assistant || "Your image is ready.",
          turn.assistantImage
        );
      } else if (turn.assistant) {
        addBubble("assistant", turn.assistant);
      }
    });

    container.scrollTop = container.scrollHeight;
  }

  function getApiHistory() {
    const messages = [];

    history.forEach(turn => {
      messages.push({
        role: "user",
        content: turn.user
      });

      if (turn.assistant) {
        messages.push({
          role: "assistant",
          content: turn.assistant
        });
      }
    });

    return messages;
  }

  async function send() {
    if (sending) return;

    const input = $("chatInput");
    const sendButton = $("sendBtn");

    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    sending = true;

    if (sendButton) sendButton.disabled = true;

    // Clear only the input; do not focus it again on mobile.
    input.value = "";

    const turn = {
      user: message,
      assistant: "",
      assistantImage: ""
    };

    history.push(turn);
    renderHistory();

    setChatStatus("TinVin AI is thinking...");

    try {
      if (isImageRequest(message)) {
        setChatStatus("TinVin AI is creating your image...");

        const result = await postJSON("/api/image", {
          prompt: message
        });

        const imageUrl = getImageSource(result);

        if (!imageUrl) {
          throw new Error(
            extractText(result) ||
            "The image service did not return an image."
          );
        }

        turn.assistant = "Your image is ready.";
        turn.assistantImage = imageUrl;

        renderHistory();
      } else {
        const result = await postJSON("/api/ai", {
          tool: "chat",
          message,
          history: getApiHistory().slice(0, -1)
        });

        const answer = extractText(result);

        if (!answer) {
          throw new Error("The AI returned an empty response.");
        }

        turn.assistant = answer;
        renderHistory();
      }

      setChatStatus("");

    } catch (error) {
      turn.assistant =
        "Sorry, something went wrong: " +
        (error.message || "Please try again.");

      renderHistory();
      setChatStatus("Message could not be completed.");

    } finally {
      sending = false;

      if (sendButton) sendButton.disabled = false;
    }
  }

  function newChat() {
    if (sending) return;

    history.length = 0;

    const container = $("chatHistory");
    if (container) container.replaceChildren();

    const input = $("chatInput");
    if (input) input.value = "";

    setChatStatus("");
  }

  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.chat = {
    send,
    newChat,
    addBubble,
    renderHistory,
    getHistory: () => history.map(turn => ({ ...turn }))
  };

})();
