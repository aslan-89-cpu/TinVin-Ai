
(() => {
  "use strict";

  const core = window.TinVinCore;

  if (!core) {
    console.error("TinVin Core is not loaded.");
    return;
  }

  const { $, postJSON, setStatus, setLastOutput } = core;

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

    if (!image) {
      setStatus("toolStatus", "Image display element was not found.");
      return;
    }

    setStatus("toolStatus", "Creating your image...");
    resultBox?.classList.remove("show");

    if (output) output.textContent = "";

    image.hidden = true;
    image.removeAttribute("src");

    try {
      const result = await postJSON("/api/image", { prompt });

      if (!result || result.ok === false) {
        throw new Error(result?.error || "Image generation failed.");
      }

      let imageUrl = "";

      // Cloudflare Workers AI returns Base64 image data.
      if (typeof result.image === "string" && result.image.trim()) {
        const imageData = result.image.trim();

        if (imageData.startsWith("data:image/")) {
          imageUrl = imageData;
        } else {
          const mimeType = result.mimeType || "image/png";

          if (!mimeType.startsWith("image/")) {
            throw new Error("Invalid image format returned by the server.");
          }

          imageUrl = `data:${mimeType};base64,${imageData}`;
        }
      }

      // Also support regular image URLs.
      if (!imageUrl) {
        imageUrl =
          result.imageUrl ||
          result.image_url ||
          result.url ||
          "";
      }

      if (
        typeof imageUrl !== "string" ||
        !imageUrl.trim()
      ) {
        throw new Error("The server did not return image data.");
      }

      image.alt = "AI generated image";

      await new Promise((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(
          new Error("The generated image could not be displayed.")
        );

        image.src = imageUrl;
      });

      image.hidden = false;

      setLastOutput(imageUrl);

      resultBox?.classList.add("show");

      setStatus("toolStatus", "Your image is ready.");

    } catch (error) {
      console.error("TinVin Image Generator error:", error);

      image.hidden = true;
      image.removeAttribute("src");

      setStatus(
        "toolStatus",
        error.message || "Image generation failed. Please try again."
      );
    }
  }

  window.TinVinTools = window.TinVinTools || {};
  window.TinVinTools.image = { run };

})();
