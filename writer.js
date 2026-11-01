
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

  function isWriterPage() {
    return $("activeTitle")?.textContent
      ?.toLowerCase()
      .includes("writer");
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

    // Newest conversation stays at the top.
    output.scrollTop = 0;
  }

  async function run() {
    if (busy) return;

    const input = $("toolInput");
    const runBtn = $("runBtn");

    const message = input?.value.trim();

    if (!message) {
      setStatus(
        "toolStatus",
        "Please enter what you want me to write."
      );
      input?.focus();
      return;
    }

    busy = true;

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.textContent = "Writing...";
    }

    const userMessage = {
      role: "user",
      text: message
    };

    // Put the newest request at the beginning.
    history.unshift(userMessage);

    renderHistory();

    // Empty the input after sending.
    if (input) input.value = "";

    setStatus("toolStatus", "Writing your content...");

    try {
      const result = await postJSON("/api/ai", {
        tool: "writer",
        message
      });

      const responseText = extractText(result);

      if (!responseText || !responseText.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      // Put the response immediately under its request.
      const userIndex = history.indexOf(userMessage);

      history.splice(userIndex + 1, 0, {
        role: "assistant",
        text: responseText.trim()
      });

      renderHistory();

      setStatus("toolStatus", "Your content is ready.");

    } catch (error) {
      // Keep the request visible if the server fails.
      setStatus(
        "toolStatus",
        error.message || "Writer request failed. Please try again."
      );

    } finally {
      busy = false;

      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = "Generate";
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

    input?.focus();
  }

  async function copy() {
    const text = history
      .filter(item => item.role === "assistant")
      .map(item => item.text)
      .join("\n\n");

    if (!text) {
      setStatus(
        "toolStatus",
        "There is no AI response to copy."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("toolStatus", "Copied to clipboard.");

    } catch {
      setStatus(
        "toolStatus",
        "Copy is unavailable in this browser."
      );
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

  renderHistory();

})();
