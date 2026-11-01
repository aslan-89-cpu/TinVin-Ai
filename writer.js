
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

    const hasMessages = history.length > 0;

    resultBox.classList.toggle("show", hasMessages);

    const assistantMessages = history
      .filter(item => item.role === "assistant")
      .map(item => item.text);

    setLastOutput(assistantMessages.join("\n\n"));

    if (hasMessages) {
      output.scrollTop = output.scrollHeight;
    }
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

    history.push({
      role: "user",
      text: message
    });

    renderHistory();

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

      history.push({
        role: "assistant",
        text: responseText.trim()
      });

      renderHistory();

      setStatus("toolStatus", "Your content is ready.");

    } catch (error) {
      history = history.filter(
        (item, index) =>
          !(item.role === "user" &&
            item.text === message &&
            index === history.length - 1)
      );

      renderHistory();

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

  // Register the Writer module.
  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.writer = {
    run,
    clear,
    copy,
    reset
  };

  renderHistory();

})();
