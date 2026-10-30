(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVin Core is not loaded.");
    return;
  }

  const { $, postJSON, extractText, setStatus, setLastOutput } = core;

  async function run() {
    const input = $("toolInput");
    const output = $("toolOutput");
    const resultBox = $("outputBox");

    const message = input?.value.trim();

    if (!message) {
      setStatus("toolStatus", "Please enter your study question.");
      return;
    }

    setStatus("toolStatus", "Preparing your study answer...");
    if (output) output.textContent = "";
    resultBox?.classList.remove("show");

    try {
      const result = await postJSON("/api/ai", {
        tool: "study",
        message
      });

      const text = extractText(result);

      if (!text) {
        throw new Error("No study answer was returned.");
      }

      if (output) output.textContent = text;

      setLastOutput(text);
      resultBox?.classList.add("show");

      setStatus("toolStatus", "Your study answer is ready.");
    } catch (error) {
      console.error("Study Assistant error:", error);
      setStatus("toolStatus", error.message || "Something went wrong. Please try again.");
    }
  }

  window.TinVinTools = window.TinVinTools || {};
  window.TinVinTools.study = { run };

})();