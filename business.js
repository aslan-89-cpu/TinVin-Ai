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
      setStatus("toolStatus", "Please describe your business request.");
      return;
    }

    setStatus("toolStatus", "Creating your business content...");
    if (output) output.textContent = "";
    resultBox?.classList.remove("show");

    try {
      const result = await postJSON("/api/ai", {
        tool: "business",
        message
      });

      const text = extractText(result);

      if (!text) {
        throw new Error("No business content was returned.");
      }

      if (output) output.textContent = text;

      setLastOutput(text);
      resultBox?.classList.add("show");

      setStatus("toolStatus", "Business content created successfully.");
    } catch (error) {
      console.error("Business Studio error:", error);
      setStatus("toolStatus", error.message || "Something went wrong. Please try again.");
    }
  }

  window.TinVinTools = window.TinVinTools || {};
  window.TinVinTools.business = { run };

})();