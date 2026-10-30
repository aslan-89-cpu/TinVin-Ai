
(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }

  const { $, postJSON, extractText, makeImage, setStatus } = core;

  const history = [];
  let sending = false;

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
      bubble.appendChild(image);
    }

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;

    return bubble;
  }

  function setChatStatus(message) {
    const status = $("chatStatus");

    if (status) {
      status.textContent = message || "";
    }
  }

  async function send() {
    if (sending) return;

    const input = $("chatInput");
    if (!input) return;

    const message = input.value.trim();

    if (!message) return;

    sending = true;

    const sendButton = $("sendBtn");
    if (sendButton) sendButton.disabled = true;

    // Keep the visible conversation and clear only the input.
    input.value = "";

    addBubble("user", message);
    setChatStatus("TinVin AI is thinking...");

    const previousHistory = history.map(item => ({
      role: item.role,
      content: item.content
    }));

    try {
      let answer = "";
      let imageUrl = "";

      if (core.imageIntent(message)) {
        const result = await postJSON("/api/image", {
          prompt: message
        });

        const rawImage =
          result.image ||
          result.base64 ||
          result.data;

        if (rawImage) {
          imageUrl = rawImage.startsWith("data:")
            ? rawImage
            : `data:${result.mimeType || "image/png"};base64,${rawImage}`;
        } else {
          answer = extractText(result);
        }
      } else {
        const result = await postJSON("/api/ai", {
          tool: "chat",
          message,
          previousHistory
        });

        answer = extractText(result);

        if (!answer) {
          throw new Error("The AI returned an empty response.");
        }
      }

      if (imageUrl) {
        addBubble("assistant", "Your image is ready.", imageUrl);
      } else {
        addBubble("assistant", answer);
      }

      // Save each turn once for the next conversation request.
      history.push(
        { role: "user", content: message },
        {
          role: "assistant",
          content: imageUrl ? "Image generated successfully." : answer
        }
      );

      setChatStatus("");

    } catch (error) {
      addBubble(
        "assistant",
        "Sorry, something went wrong: " +
        (error.message || "Please try again.")
      );

      setChatStatus("Message could not be completed.");
    } finally {
      sending = false;

      if (sendButton) sendButton.disabled = false;

      input.focus();
    }
  }

  function newChat() {
    if (sending) return;

    history.length = 0;

    const container = $("chatHistory");

    if (container) {
      container.replaceChildren();
    }

    const input = $("chatInput");

    if (input) {
      input.value = "";
      input.focus();
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
