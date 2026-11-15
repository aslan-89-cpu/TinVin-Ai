/* TinVin AI - small translator for messages created by scripts
   (for example "daily limit reached" and the Premium page).
   It uses the interface language chosen in Settings and the same saved
   translations (localStorage) as the interface translator in app.js. */

(() => {
  "use strict";

  const PREFIX = "tinvin_i18n_";

  function language() {
    try {
      return localStorage.getItem("tinvin_language") || "English";
    } catch {
      return "English";
    }
  }

  function loadCache(lang) {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + lang) || "{}");
    } catch {
      return {};
    }
  }

  function saveCache(lang, cache) {
    try {
      localStorage.setItem(PREFIX + lang, JSON.stringify(cache));
    } catch {}
  }

  function parseJSONObject(raw) {
    if (typeof raw !== "string") return null;

    const cleaned = raw.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}

    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");

    if (first === -1 || last <= first) return null;

    try {
      const parsed = JSON.parse(cleaned.slice(first, last + 1));

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}

    return null;
  }

  // Translates a list of English texts. Returns the list in the same order.
  // If anything fails, the English text is returned, so nothing breaks.
  async function translateMany(texts) {
    const list = Array.from(texts || [], item => String(item ?? ""));
    const lang = language();

    if (!lang || lang === "English") return list;

    const core = window.TinVinCore;

    if (!core || typeof core.postJSON !== "function") return list;

    const cache = loadCache(lang);

    const missing = [
      ...new Set(
        list.map(text => text.trim()).filter(text => text && !cache[text])
      )
    ];

    if (missing.length) {
      try {
        const payload = {};

        missing.forEach((text, index) => {
          payload["s" + index] = text;
        });

        const result = await core.postJSON("/api/ai", {
          tool: "ui-translate",
          message: JSON.stringify(payload),
          targetLanguage: lang
        });

        const parsed = parseJSONObject(core.extractText(result));

        if (parsed) {
          missing.forEach((text, index) => {
            const value = parsed["s" + index];

            if (typeof value === "string" && value.trim()) {
              cache[text] = value.trim();
            }
          });

          saveCache(lang, cache);
        }
      } catch (error) {
        console.error("Message translation failed:", error);
      }
    }

    return list.map(text => cache[text.trim()] || text);
  }

  async function t(text) {
    const result = await translateMany([text]);
    return result[0];
  }

  window.TinVinI18n = { translateMany, t, language };
})();
