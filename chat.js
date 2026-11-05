/* TinVin AI - Chat, Vision, Image Generation and Editing */

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
  const MAX_FILES = 4;

  function setStatus(message) {
    const status = $("chatStatus");
    if (status) status.textContent = message || "";
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

    return `data:${result.mimeType || result.mime_type || "image/png"};base64,${value}`;
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
      image.alt = role === "assistant"
        ? "TinVin AI generated image"
        : "Attached image";
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
          image.loading = "lazy";
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
        addBubble("assistant", turn.assistant || "", turn.assistantImage);
      } else if (turn.assistant) {
        addBubble("assistant", turn.assistant);
      }
    });

    container.scrollTop = container.scrollHeight;
  }

  function getApiHistory() {
    const messages = [];

    history.slice(0, -1).forEach(turn => {
      messages.push({ role: "user", content: turn.user });

      if (turn.assistant) {
        messages.push({ role: "assistant", content: turn.assistant });
      }
    });

    return messages;
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        data: reader.result
      });

      reader.onerror = () => reject(
        new Error("Could not read " + file.name)
      );

      reader.readAsDataURL(file);
    });
  }

  function createAttachmentControls() {
    const composer = document.querySelector("#chatPage .chat-compose");

    if (!composer || composer.dataset.attachmentsReady === "true") return;
    composer.dataset.attachmentsReady = "true";

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/webp,image/gif,.pdf,.txt,.doc,.docx";
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
      if (selectedFiles.length >= MAX_FILES) {
        setStatus("You can attach up to 4 files.");
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        setStatus(file.name + " is larger than 8 MB.");
        continue;
      }

      const supportedImage = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
      ].includes(file.type);

      const supportedOther = [
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ].includes(file.type);

      if (!supportedImage && !supportedOther) {
        setStatus("This file type is not supported.");
        continue;
      }

      try {
        selectedFiles.push(await readFile(file));
      } catch (error) {
        setStatus(error.message);
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

  // FLUX.2 Klein reference images must be smaller than 512x512.
  // Convert images to PNG and resize the API copy only.
  async function resizeImageForFlux(file) {
    if (!file.type || !file.type.startsWith("image/")) return file;

    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(
        new Blob(
          [
            Uint8Array.from(
              atob(file.data.split(",")[1]),
              c => c.charCodeAt(0)
            )
          ],
          { type: file.type }
        )
      );

      image.onload = () => {
        try {
          const maxSide = 511;
          const scale = Math.min(
            1,
            maxSide / Math.max(image.width, image.height)
          );

          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Could not prepare the attached image.");
          }

          context.drawImage(image, 0, 0, width, height);

          resolve({
            name: file.name.replace(/\.[^.]+$/, "") + ".png",
            type: "image/png",
            data: canvas.toDataURL("image/png")
          });
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not process image: " + file.name));
      };

      image.src = objectUrl;
    });
  }

  async function prepareAttachmentsForAPI(attachments) {
    const prepared = [];

    for (const file of attachments) {
      if (file.type && file.type.startsWith("image/")) {
        prepared.push(await resizeImageForFlux(file));
      } else {
        prepared.push(file);
      }
    }

    return prepared;
  }

  async function askAI(message, attachments) {
    const apiAttachments = await prepareAttachmentsForAPI(attachments);

    const result = await postJSON("/api/ai", {
      tool: "chat",
      message,
      history: getApiHistory(),
      attachments: apiAttachments.map(file => ({
        name: file.name,
        type: file.type,
        data: file.data
      }))
    });

    if (!result || result.ok === false) {
      throw new Error(result?.error || "The AI service failed.");
    }

    if (
      result.type === "image" ||
      result.image ||
      result.imageUrl ||
      result.image_url
    ) {
      const image = getImageSource(result);
      if (!image) {
        throw new Error("The image service returned no image data.");
      }

      return { type: "image", image };
    }

    const answer =
      extractText(result) ||
      result.text ||
      result.output ||
      "";

    if (!answer) {
      throw new Error(result?.error || "The AI returned an empty response.");
    }

    return { type: "text", text: answer };
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

    const userMessage = message ||
      "Please describe and analyze the attached image.";

    const turn = {
      user: userMessage,
      userAttachments: attachments,
      assistant: "",
      assistantImage: ""
    };

    history.push(turn);
    renderHistory();

    try {
      const hasImage = attachments.some(file =>
        file.type && file.type.startsWith("image/")
      );

      setStatus(
        hasImage
          ? "TinVin AI is checking your image..."
          : "TinVin AI is thinking..."
      );

      const result = await askAI(userMessage, attachments);

      if (result.type === "image") {
        turn.assistantImage = result.image;
        turn.assistant = "";
      } else {
        turn.assistant = result.text;
        turn.assistantImage = "";
      }

      renderHistory();
      setStatus("");
    } catch (error) {
      console.error("TinVin Chat error:", error);

      turn.assistant =
        "Sorry, something went wrong: " +
        (error.message || "Please try again.");

      renderHistory();
      setStatus("Message could not be completed.");
    } finally {
      sending = false;

      if (sendButton) sendButton.disabled = false;
      if (input) input.focus();
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
    setStatus("");
  }

  function initialize() {
    createAttachmentControls();

    const sendButton = $("sendBtn");
    const input = $("chatInput");
    const newChatButton = $("newChatBtn");

    if (sendButton && sendButton.dataset.chatReady !== "true") {
      sendButton.dataset.chatReady = "true";
      sendButton.addEventListener("click", send);
    }

    if (input && input.dataset.chatReady !== "true") {
      input.dataset.chatReady = "true";

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

    if (newChatButton && newChatButton.dataset.chatReady !== "true") {
      newChatButton.dataset.chatReady = "true";
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