(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVin Core is not loaded.");
    return;
  }

  const {
    $,
    postJSON,
    setStatus,
    setLastOutput
  } = core;

  async function run() {
    const input = $("toolInput");
    const output = $("toolOutput");
    const resultBox = $("outputBox");
    const image = $("toolImage");

    const prompt = input?.value.trim();

    if (!prompt) {
      setStatus("toolStatus", "Please describe the image you want to create.");
      return;
    }

    setStatus("toolStatus", "Creating your image...");
    resultBox?.classList.remove("show");

    if (output) output.textContent = "";
    if (image) {
      image.src = "";
      image.hidden = true;
    }

    try {
      const result = await postJSON("/api/image", {
        prompt
      });

      const imageUrl =
        result?.imageUrl ||
        result?.image_url ||
        result?.url ||
        result?.image;

      if (!imageUrl || typeof imageUrl !== "string") {
        throw new Error("The image provider did not return an image.");
      }

      if (image) {
        image.src = imageUrl;
        image.hidden = false;
        image.alt = "AI generated image";
      } else if (output) {
        output.textContent = imageUrl;
      }

      setLastOutput(imageUrl);
      resultBox?.classList.add("show");

      setStatus("toolStatus", "Your image is ready.");
    } catch (error) {
      console.error("Image Generator error:", error);
      setStatus(
        "toolStatus",
        error.message || "Image generation failed. Please try again."
      );
    }
  }

  window.TinVinTools = window.TinVinTools || {};
  window.TinVinTools.image = { run };

})();