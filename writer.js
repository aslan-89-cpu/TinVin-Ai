
/* TinVin AI - ChatGPT Style Writer */

(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVinCore is not loaded.");
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
  let history = [];

  function activateWriterLayout() {
    const title = $("activeTitle");
    const page = $("toolPage");

    if (!title || !page) return;

    const isWriter = title.textContent.toLowerCase().includes("writer");

    page.classList.toggle("writer-active", isWriter);

    const runBtn = $("runBtn");
    const input = $("toolInput");

    if (isWriter) {
      if (runBtn && !busy) runBtn.textContent = "Send ↑";
      if (input) input.placeholder = "Message TinVin AI...";
    }
  }

  function renderHistory() {
    const output = $("toolOutput");
    const resultBox = $("outputBox");

    if (!output || !resultBox) return;

    output.replaceChildren();

    history.forEach(item => {
      const message = document.createElement("div");
      message.className = `writer-message writer-${item.role}`;

      const label = document.createElement("div");
      label.className = "writer-message-label";
      label.textContent =
        item.role === "user" ? "You" : "TinVin AI";

      const content = document.createElement("div");
      content.className = "writer-message-content";
      content.textContent = item.text;

      message.append(label, content);
      output.appendChild(message);
    });

    resultBox.classList.toggle("show", history.length > 0);

    const assistantMessages = history
      .filter(item => item.role === "assistant")
      .map(item => item.text);

    setLastOutput(assistantMessages.join("\n\n"));

    output.scrollTop = 0;
  }

  async function run() {
    if (busy) return;

    const input = $("toolInput");
    const runBtn = $("runBtn");

    const message = input?.value.trim();

    if (!message) {
      setStatus("toolStatus", "Please enter a message.");
      input?.focus();
      return;
    }

    busy = true;

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.textContent = "Sending...";
    }

    history.unshift({
      role: "user",
      text: message
    });

    renderHistory();

    input.value = "";

    setStatus("toolStatus", "TinVin AI is thinking...");

    try {
      const result = await postJSON("/api/ai", {
        tool: "writer",
        message
      });

      const responseText = extractText(result);

      if (!responseText || !responseText.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      history.splice(1, 0, {
        role: "assistant",
        text: responseText.trim()
      });

      renderHistory();

      setStatus("toolStatus", "");

    } catch (error) {
      history.splice(1, 0, {
        role: "assistant",
        text: "Sorry, something went wrong. Please try again."
      });

      renderHistory();

      setStatus(
        "toolStatus",
        error.message || "Writer request failed."
      );

    } finally {
      busy = false;

      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = "Send ↑";
      }

      input?.focus();
    }
  }

  function clear() {
    if (busy) return;

    history = [];

    const input = $("toolInput");

    if (input) input.value = "";

    renderHistory();

    setStatus("toolStatus", "");
    setLastOutput("");

  }

  async function copy() {
    const text = history
      .filter(item => item.role === "assistant")
      .map(item => item.text)
      .join("\n\n");

    if (!text) {
      setStatus("toolStatus", "There is no AI response to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("toolStatus", "Copied to clipboard.");
    } catch {
      setStatus("toolStatus", "Copy is unavailable in this browser.");
    }
  }

  function reset() {
    history = [];

    const output = $("toolOutput");

    if (output) output.replaceChildren();

    $("outputBox")?.classList.remove("show");

    setStatus("toolStatus", "");
    setLastOutput("");
  }

  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.writer = {
    run,
    clear,
    copy,
    reset
  };

  const titleElement = $("activeTitle");

  if (titleElement && window.MutationObserver) {
    const observer = new MutationObserver(activateWriterLayout);

    observer.observe(titleElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  activateWriterLayout();
  renderHistory();

})();
