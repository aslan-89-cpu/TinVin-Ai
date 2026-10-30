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
      setStatus("toolStatus", "Please describe the kind of ideas you need.");
      return;
    }

    setStatus("toolStatus", "Generating creative ideas...");
    if (output) output.textContent = "";
    resultBox?.classList.remove("show");

    try {
      const result = await postJSON("/api/ai", {
        tool: "ideas",
        message
      });

      const text = extractText(result);

      if (!text) {
        throw new Error("No ideas were returned.");
      }

      if (output) output.textContent = text;

      setLastOutput(text);
      resultBox?.classList.add("show");

      setStatus("toolStatus", "Your ideas are ready.");
    } catch (error) {
      console.error("Idea Generator error:", error);
      setStatus("toolStatus", error.message || "Something went wrong. Please try again.");
    }
  }

  window.TinVinTools = window.TinVinTools || {};
  window.TinVinTools.ideas = { run };

})();