
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

  async function run() {
    if (busy) return;

    const input = $("writerInput");
    const output = $("writerOutput");
    const resultBox = $("writerOutputBox");
    const runBtn = $("writerRunBtn");

    const message = input?.value.trim();

    if (!message) {
      setStatus("writerStatus", "Please enter what you want me to write.");
      return;
    }

    busy = true;
    runBtn.disabled = true;
    runBtn.textContent = "Sending...";

    setStatus("writerStatus", "Writing your content...");
    output.textContent = "";
    resultBox.classList.add("hidden");

    try {
      const result = await postJSON("/api/ai", {
        tool: "writer",
        message
      });

      const text = extractText(result);

      if (!text) {
        throw new Error("The AI returned an empty response.");
      }

      output.textContent = text;
      setLastOutput(text);

      resultBox.classList.remove("hidden");

      setStatus("writerStatus", "Your content is ready.");
    } catch (error) {
      setStatus(
        "writerStatus",
        error.message || "Writer request failed. Please try again."
      );
    } finally {
      busy = false;
      runBtn.disabled = false;
      runBtn.textContent = "Send";
    }
  }

  function clear() {
    $("writerInput").value = "";
    $("writerOutput").textContent = "";
    $("writerOutputBox").classList.add("hidden");
    setStatus("writerStatus", "");
    setLastOutput("");
  }

  async function copy() {
    const text = $("writerOutput").textContent;

    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setStatus("writerStatus", "Copied to clipboard.");
    } catch {
      setStatus("writerStatus", "Copy is unavailable in this browser.");
    }
  }

  $("writerRunBtn").addEventListener("click", run);
  $("writerClearBtn").addEventListener("click", clear);
  $("writerCopyBtn").addEventListener("click", copy);

  $("writerInput").addEventListener("keydown", event => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      run();
    }
  });

  window.TinVinTools = window.TinVinTools || {};
  window.TinVinTools.writer = { run, clear };
})();
