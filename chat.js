
/* TinVin AI - ChatGPT Style Chat */

(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }

  const { $, postJSON, extractText } = core;

  const history = [];
  let sending = false;

  function setChatStatus(message) {
    const status = $("chatStatus");
    if (status) status.textContent = message || "";
  }

  function scrollChatToBottom() {
    const container = $("chatHistory");
    if (!container) return;

    container.scrollTop = container.scrollHeight;
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

    scrollChatToBottom();

    return bubble;
  }

  function getImageSource(result) {
    const raw =
      result.image ||
      result.imageUrl ||
      result.image_url ||
      result.url ||
      result.base64 ||
      result.data;

    if (!raw || typeof raw !== "string") return "";

    if (
      raw.startsWith("data:") ||
      raw.startsWith("https://") ||
      raw.startsWith("http://")
    ) {
      return raw;
    }

    return `data:${result.mimeType || result.mime_type || "image/png"};base64,${raw}`;
  }

  async function send() {
    if (sending) return;

    const input = $("chatInput");
    const sendButton = $("sendBtn");

    if (!input) return;

    const message = input.value.trim();

    if (!message) return;

    sending = true;

    if (sendButton) {
      sendButton.disabled = true;
      sendButton.textContent = "Sending...";
    }

    // Preserve previous conversation for the AI.
    const previousHistory = history.map(item => ({
      role: item.role,
      content: item.content
    }));

    // Add the new user message.
    history.push({
      role: "user",
      content: message
    });

    input.value = "";

    addBubble("user", message);
    setChatStatus("TinVin AI is thinking...");

    try {
      let answer = "";
      let imageUrl = "";

      const wantsImage =
        typeof core.imageIntent === "function" &&
        core.imageIntent(message);

      if (wantsImage) {
        const result = await postJSON("/api/image", {
          prompt: message
        });

        imageUrl = getImageSource(result);

        if (!imageUrl) {
          answer = extractText(result);

          if (!answer) {
            throw new Error("The image could not be generated.");
          }
        }
      } else {
        const result = await postJSON("/api/ai", {
          tool: "chat",
          message,
          previousHistory
        });

        answer = extractText(result);

        if (!answer || !answer.trim()) {
          throw new Error("The AI returned an empty response.");
        }

        answer = answer.trim();
      }

      if (imageUrl) {
        addBubble("assistant", "Your image is ready.", imageUrl);

        history.push({
          role: "assistant",
          content: "Image generated successfully."
        });
      } else {
        addBubble("assistant", answer);

        history.push({
          role: "assistant",
          content: answer
        });
      }

      setChatStatus("");

    } catch (error) {
      const errorMessage =
        "Sorry, something went wrong: " +
        (error.message || "Please try again.");

      addBubble("assistant", errorMessage);

      history.push({
        role: "assistant",
        content: errorMessage
      });

      setChatStatus("Message could not be completed.");

    } finally {
      sending = false;

      if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = "Send ↑";
      }

      // Do not focus the input here.
      // This prevents unwanted mobile screen jumping.
    }
  }

  function newChat() {
    if (sending) return;

    history.length = 0;

    const container = $("chatHistory");

    if (container) {
      container.replaceChildren();
      container.scrollTop = 0;
    }

    const input = $("chatInput");

    if (input) {
      input.value = "";
    }

    setChatStatus("");
  }

  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.chat = {
    send,
    newChat,
    addBubble,
    getHistory: () => history.map(item => ({ ...item }))
  };

})();
