/* TinVin AI - Business Studio */

(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVin Core is not loaded.");
    return;
  }

  const {
    $,
    postJSON,
    extractText,
    setStatus,
    setLastOutput
  } = core;

  let busy = false;

  function getElements() {
    return {
      input: $("toolInput"),
      output: $("toolOutput"),
      resultBox: $("outputBox")
    };
  }

  function createButton(label, id, callback) {
    const button = document.createElement("button");

    button.type = "button";
    button.id = id;
    button.className = "business-action-btn";
    button.textContent = label;
    button.addEventListener("click", callback);

    return button;
  }

  function clearMessage() {
    const { output, resultBox } = getElements();

    if (output) output.textContent = "";

    resultBox?.classList.remove("show");

    setLastOutput("");
  }

  async function copyMessage() {
    const { output } = getElements();
    const text = output?.textContent?.trim();

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setStatus("toolStatus", "Copied successfully!");
    } catch (error) {
      console.error("Copy error:", error);
      setStatus("toolStatus", "Unable to copy this message.");
    }
  }

  function deleteMessage() {
    clearMessage();
    setStatus("toolStatus", "Message deleted.");
  }

  function newChat() {
    const { input } = getElements();

    clearMessage();

    if (input) {
      input.value = "";
      input.focus();
    }

    setStatus("toolStatus", "New chat started.");
  }

  function createActions() {
    const { resultBox } = getElements();

    if (!resultBox || $("businessActions")) return;

    const actions = document.createElement("div");

    actions.id = "businessActions";
    actions.className = "business-actions";

    const deleteButton = createButton(
      "Delete",
      "businessDeleteBtn",
      deleteMessage
    );

    const newChatButton = createButton(
      "New Chat",
      "businessNewChatBtn",
      newChat
    );

    actions.append(deleteButton, newChatButton);

    resultBox.appendChild(actions);
  }

  async function run() {
    const { input, output, resultBox } = getElements();

    const message = input?.value.trim();

    if (!message) {
      setStatus(
        "toolStatus",
        "Please describe your business request."
      );
      return;
    }

    if (busy) return;

    busy = true;

    setStatus("toolStatus", "Creating your business content...");

    if (output) output.textContent = "";

    resultBox?.classList.remove("show");

    try {
      const language =
        localStorage.getItem("tinvin_language") || "English";

      const result = await postJSON("/api/ai", {
        tool: "business",
        message,
        language
      });

      // Remove the unwanted standalone image label.
      const text = extractText(result)
        .replace(/^\s*AI-generated image\s*$/gim, "")
        .trim();

      if (!text) {
        throw new Error("No business content was returned.");
      }

      if (output) {
        output.textContent = text;
      }

      setLastOutput(text);

      createActions();

      resultBox?.classList.add("show");

      if (input) input.value = "";

      setStatus(
        "toolStatus",
        "Business content created successfully."
      );

    } catch (error) {
      console.error("Business Studio error:", error);

      setStatus(
        "toolStatus",
        error.message || "Something went wrong. Please try again."
      );

    } finally {
      busy = false;
    }
  }

  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.business = {
    run,
    copyMessage,
    deleteMessage,
    newChat
  };

})();