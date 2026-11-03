
/* TinVin AI - AI Chat with Camera and File Attachments */

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
  let selectedFiles = [];

  const MAX_FILE_SIZE = 8 * 1024 * 1024;

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
      /(صورة|صور|ارسم|أنشئ|انشئ|اصنع|صمم).{0,100}(صورة|رسم|شعار)|(?:أنشئ|انشئ|ارسم|اصنع|صمم).{0,80}(صورة|شعار)/;

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

  function addBubble(role, content, imageUrl = "", attachments = []) {
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

    if (attachments.length) {
      const attachmentList = document.createElement("div");
      attachmentList.className = "chat-message-attachments";

      attachments.forEach(file => {
        if (file.type && file.type.startsWith("image/") && file.data) {
          const image = document.createElement("img");
          image.src = file.data;
          image.alt = file.name || "Attached image";
          image.className = "chat-image chat-user-attachment";
          attachmentList.appendChild(image);
        } else {
          const item = document.createElement("div");
          item.className = "chat-file-item";
          item.textContent = "📎 " + file.name;
          attachmentList.appendChild(item);
        }
      });

      bubble.appendChild(attachmentList);
    }

    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;

    return bubble;
  }

  function renderHistory() {
    const container = $("chatHistory");
    if (!container) return;

    container.replaceChildren();

    history.forEach(turn => {
      addBubble("user", turn.user, "", turn.userAttachments || []);

      if (turn.assistantImage) {
        addBubble(
          "assistant",
          turn.assistant || "",
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

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type || "application/octet-stream",
          data: reader.result
        });
      };

      reader.onerror = () => {
        reject(new Error("Could not read " + file.name));
      };

      reader.readAsDataURL(file);
    });
  }

  function createAttachmentControls() {
    const composer = document.querySelector("#chatPage .chat-compose");

    if (!composer || composer.dataset.attachmentsReady === "true") {
      return;
    }

    composer.dataset.attachmentsReady = "true";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*,.pdf,.txt,.doc,.docx";
    fileInput.multiple = true;
    fileInput.hidden = true;

    const cameraInput = document.createElement("input");
    cameraInput.type = "file";
    cameraInput.accept = "image/*";
    cameraInput.setAttribute("capture", "environment");
    cameraInput.hidden = true;

    const controls = document.createElement("div");
    controls.className = "chat-attachment-controls";

    const attachButton = document.createElement("button");
    attachButton.type = "button";
    attachButton.className = "chat-attach-btn";
    attachButton.textContent = "📎";
    attachButton.title = "Attach photo or file";
    attachButton.setAttribute("aria-label", "Attach photo or file");

    const cameraButton = document.createElement("button");
    cameraButton.type = "button";
    cameraButton.className = "chat-attach-btn";
    cameraButton.textContent = "📷";
    cameraButton.title = "Take a photo";
    cameraButton.setAttribute("aria-label", "Take a photo");

    controls.append(attachButton, cameraButton);

    const preview = document.createElement("div");
    preview.className = "chat-attachment-preview";
    preview.id = "chatAttachmentPreview";

    composer.parentNode.insertBefore(preview, composer);
    composer.insertBefore(controls, composer.firstChild);
    composer.append(fileInput, cameraInput);

    attachButton.addEventListener("click", () => fileInput.click());
    cameraButton.addEventListener("click", () => cameraInput.click());

    fileInput.addEventListener("change", () => {
      addSelectedFiles(fileInput.files);
      fileInput.value = "";
    });

    cameraInput.addEventListener("change", () => {
      addSelectedFiles(cameraInput.files);
      cameraInput.value = "";
    });
  }

  async function addSelectedFiles(fileList) {
    const files = Array.from(fileList || []);

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setChatStatus(file.name + " is larger than 8 MB.");
        continue;
      }

      try {
        const attachment = await readFile(file);
        selectedFiles.push(attachment);
      } catch (error) {
        setChatStatus(error.message);
      }
    }

    renderAttachmentPreview();
  }

  function renderAttachmentPreview() {
    const preview = $("chatAttachmentPreview");
    if (!preview) return;

    preview.replaceChildren();

    selectedFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "chat-attachment-item";

      const name = document.createElement("span");
      name.textContent = file.name;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.title = "Remove attachment";

      remove.addEventListener("click", () => {
        selectedFiles.splice(index, 1);
        renderAttachmentPreview();
      });

      item.append(name, remove);
      preview.appendChild(item);
    });
  }

  async function send() {
    if (sending) return;

    const input = $("chatInput");
    const sendButton = $("sendBtn");

    if (!input) return;

    const message = input.value.trim();

    if (!message && selectedFiles.length === 0) return;

    sending = true;

    if (sendButton) sendButton.disabled = true;

    const attachments = selectedFiles.slice();
    selectedFiles = [];
    renderAttachmentPreview();

    input.value = "";

    const turn = {
      user: message || "Please check the attached file.",
      userAttachments: attachments,
      assistant: "",
      assistantImage: ""
    };

    history.push(turn);
    renderHistory();

    setChatStatus("TinVin AI is thinking...");

    try {
      if (isImageRequest(message) && attachments.length === 0) {
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

      } else {
        const result = await postJSON("/api/ai", {
          tool: "chat",
          message: turn.user,
          history: getApiHistory().slice(0, -1),
          attachments: attachments.map(file => ({
            name: file.name,
            type: file.type,
            data: file.data
          }))
        });

        const answer = extractText(result);

        if (!answer) {
          throw new Error("The AI returned an empty response.");
        }

        turn.assistant = answer;
      }

      renderHistory();
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
    selectedFiles = [];

    const container = $("chatHistory");
    if (container) container.replaceChildren();

    const input = $("chatInput");
    if (input) input.value = "";

    renderAttachmentPreview();
    setChatStatus("");
  }

  function initialize() {
    createAttachmentControls();

    const sendButton = $("sendBtn");
    const input = $("chatInput");
    const newChatButton = $("newChatBtn");

    if (sendButton) {
      sendButton.addEventListener("click", send);
    }

    if (input) {
      input.addEventListener("keydown", event => {
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.isComposing
        ) {
          event.preventDefault();
          send();
        }
      });
    }

    if (newChatButton) {
      newChatButton.addEventListener("click", newChat);
    }
  }

  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.chat = {
    send,
    newChat,
    addBubble,
    renderHistory,
    getHistory: () => history.map(turn => ({ ...turn }))
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

})();
