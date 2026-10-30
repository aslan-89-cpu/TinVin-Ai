
(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVinCore is not loaded.");
    return;
  }

  const { $, postJSON, extractText, setStatus, setLastOutput } = core;

  async function run() {
    const input = $("toolInput");
    const output = $("toolOutput");
    const resultBox = $("outputBox");

    const message = input?.value.trim();

    if (!message) {
      setStatus("toolStatus", "Please enter what you want me to write.");
      return;
    }

    setStatus("toolStatus", "Writing your content...");
    output.textContent = "";
    resultBox?.classList.remove("show");

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
      resultBox?.classList.add("show");

      setStatus("toolStatus", "Your content is ready.");
    } catch (error) {
      setStatus(
        "toolStatus",
        error.message || "Writer request failed. Please try again."
      );
    }
  }

  window.TinVinTools = window.TinVinTools || {};
  window.TinVinTools.writer = { run };

})();
