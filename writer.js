
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
    const output = $("writerOutput");
    const resultBox = $("writerOutputBox");

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

    resultBox.classList.toggle("hidden", !hasMessages);

    if (hasMessages) {
      resultBox.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });

      output.scrollTop = output.scrollHeight;
    }
  }

  async function run() {
    if (busy) return;

    const input = $("writerInput");
    const runBtn = $("writerRunBtn");

    const message = input?.value.trim();

    if (!message) {
      setStatus(
        "writerStatus",
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

    if (input) {
      input.value = "";
    }

    setStatus("writerStatus", "Writing your content...");

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

      setLastOutput(responseText.trim());

      renderHistory();

      setStatus("writerStatus", "Your content is ready.");

    } catch (error) {
      history = history.filter(
        (item, index) =>
          !(item.role === "user" &&
            item.text === message &&
            index === history.length - 1)
      );

      renderHistory();

      setStatus(
        "writerStatus",
        error.message || "Writer request failed. Please try again."
      );

    } finally {
      busy = false;

      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = "Send";
      }

      input?.focus();
    }
  }

  function clear() {
    if (busy) return;

    history = [];

    const input = $("writerInput");

    if (input) {
      input.value = "";
    }

    renderHistory();

    setStatus("writerStatus", "");
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
        "writerStatus",
        "There is no AI response to copy."
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      setStatus(
        "writerStatus",
        "Copied to clipboard."
      );

    } catch {
      setStatus(
        "writerStatus",
        "Copy is unavailable in this browser."
      );
    }
  }

  function reset() {
    history = [];
    renderHistory();
    setStatus("writerStatus", "");
    setLastOutput("");
  }

  $("writerRunBtn")?.addEventListener("click", run);
  $("writerClearBtn")?.addEventListener("click", clear);
  $("writerCopyBtn")?.addEventListener("click", copy);

  $("writerInput")?.addEventListener("keydown", event => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      run();
    }
  });

  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.writer = {
    run,
    clear,
    copy,
    reset
  };

  renderHistory();

})();
