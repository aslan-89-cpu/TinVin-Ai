
/* TinVin AI - Fixed ChatGPT Style Writer */

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

    if (!page) return;

    const isWriter = title?.textContent
      ?.toLowerCase()
      .includes("writer");

    page.classList.toggle("writer-active", !!isWriter);

    const input = $("toolInput");
    const runBtn = $("runBtn");
    const writerRunBtn = $("writerRunBtn");

    if (isWriter && input) {
      input.placeholder = "Message TinVin AI...";
    }

    if (isWriter) {
      [runBtn, writerRunBtn].forEach(btn => {
        if (btn && !busy) btn.textContent = "Send ↑";
      });
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

  function setButtons(disabled, text) {
    ["runBtn", "writerRunBtn"].forEach(id => {
      const btn = $(id);

      if (btn) {
        btn.disabled = disabled;
        btn.textContent = text;
      }
    });
  }

  async function run() {
    if (busy) return;

    const input = $("toolInput");
    const message = input?.value?.trim();

    if (!message) {
      setStatus("toolStatus", "Please enter a message.");
      input?.focus();
      return;
    }

    busy = true;

    setButtons(true, "Sending...");

    history.unshift({
      role: "user",
      text: message
    });

    renderHistory();

    input.value = "";

    setStatus("toolStatus", "TinVin AI is thinking...");

    try {
      console.log("TinVin Writer: Sending request...");

      const result = await postJSON("/api/ai", {
        tool: "writer",
        message: message
      });

      console.log("TinVin Writer: API response:", result);

      const responseText = extractText(result);

      if (
        !responseText ||
        typeof responseText !== "string" ||
        !responseText.trim()
      ) {
        throw new Error(
          "TinVin AI returned an empty response."
        );
      }

      history.splice(1, 0, {
        role: "assistant",
        text: responseText.trim()
      });

      renderHistory();

      setStatus("toolStatus", "");

    } catch (error) {
      console.error("TinVin Writer Error:", error);

      history.splice(1, 0, {
        role: "assistant",
        text:
          "Sorry, TinVin AI could not respond. Please try again."
      });

      renderHistory();

      setStatus(
        "toolStatus",
        error.message || "Writer request failed."
      );

    } finally {
      busy = false;

      setButtons(false, "Send ↑");

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
    } catch (error) {
      setStatus("toolStatus", "Copy is unavailable in this browser.");
    }
  }

  function reset() {
    if (busy) return;

    history = [];

    const output = $("toolOutput");

    if (output) output.replaceChildren();

    $("outputBox")?.classList.remove("show");

    const input = $("toolInput");

    if (input) input.value = "";

    setStatus("toolStatus", "");
    setLastOutput("");
  }

  // Register Writer
  window.TinVinTools = window.TinVinTools || {};

  window.TinVinTools.writer = {
    run,
    clear,
    copy,
    reset
  };

  // Connect Send buttons directly
  ["runBtn", "writerRunBtn"].forEach(id => {
    const btn = $(id);

    if (btn && !btn.dataset.writerConnected) {
      btn.dataset.writerConnected = "true";

      btn.addEventListener("click", event => {
        event.preventDefault();

        const title = $("activeTitle");

        if (
          title?.textContent
            ?.toLowerCase()
            .includes("writer") ||
          id === "writerRunBtn"
        ) {
          run();
        }
      });
    }
  });

  // Enter to Send
  const input = $("toolInput");

  if (input && !input.dataset.writerEnterConnected) {
    input.dataset.writerEnterConnected = "true";

    input.addEventListener("keydown", event => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        run();
      }
    });
  }

  // Watch Writer page
  const titleElement = $("activeTitle");

  if (titleElement && window.MutationObserver) {
    const observer = new MutationObserver(
      activateWriterLayout
    );

    observer.observe(titleElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  activateWriterLayout();
  renderHistory();

  console.log("TinVin AI Writer loaded successfully.");

})();
