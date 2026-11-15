/* TinVin AI - QR Scanner & Generator
   Integrated inside the Scanner workspace tab
*/

(() => {
  "use strict";

  if (window.TinVinQRLoaded) return;
  window.TinVinQRLoaded = true;

  // Each library is tried from several servers, in this order
  const SCAN_LIBS = [
    "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js",
    "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js"
  ];

  const GENERATE_LIBS = [
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
    "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
  ];

  const $ = id => document.getElementById(id);

  let scanner = null;
  let scannerRunning = false;
  let starting = false;
  let generated = false;

  /* ---------- Loading the libraries ---------- */

  const loading = {};

  function loadOne(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error("Could not load " + src));
      };
      document.head.appendChild(script);
    });
  }

  function loadLibrary(urls, isReady) {
    if (isReady()) return Promise.resolve();

    const key = urls[0];

    if (loading[key]) return loading[key];

    loading[key] = (async () => {
      for (const src of urls) {
        try {
          await loadOne(src);
          if (isReady()) return;
        } catch (error) {
          console.warn(error.message);
        }
      }

      throw new Error(
        "Could not load the QR library. Check your internet connection."
      );
    })();

    loading[key].catch(() => {
      delete loading[key];
    });

    return loading[key];
  }

  const loadScanLibrary = () =>
    loadLibrary(SCAN_LIBS, () => typeof window.Html5Qrcode !== "undefined");

  const loadGenerateLibrary = () =>
    loadLibrary(GENERATE_LIBS, () => typeof window.QRCode !== "undefined");

  /* ---------- Small helpers ---------- */

  function setStatus(message, isError = false) {
    const status = $("tvqr-status");
    if (!status) return;

    status.textContent = message || "";
    status.classList.toggle("error", isError);
  }

  function setPill(text) {
    const pill = $("tvqr-pill-text");
    if (pill) pill.textContent = text;
  }

  function cameraErrorMessage(error) {
    const name = (error && error.name) || "";
    const text = String((error && error.message) || error || "");

    let message;

    if (!window.isSecureContext) {
      message = "The camera needs a secure HTTPS connection.";
    } else if (name === "NotAllowedError" || /permission|denied|notallowed/i.test(text)) {
      message =
        "Camera permission was denied. Allow camera access for this site in your browser settings, then try again.";
    } else if (name === "NotFoundError" || /no camera|not found|requested device/i.test(text)) {
      message = "No camera was found on this device.";
    } else if (name === "NotReadableError" || /not readable|in use/i.test(text)) {
      message = "The camera is being used by another app.";
    } else {
      message = text || "Could not start the camera.";
    }

    // Cameras are often blocked inside the browser of other apps
    if (/FBAN|FBAV|Instagram|Telegram|TikTok|Line\/|Snapchat|; wv\)/i.test(navigator.userAgent)) {
      message += " If you opened this link inside another app, open it in Safari or Chrome instead.";
    }

    return message;
  }

  // Makes a big photo smaller; large phone photos are often not readable
  function shrinkImage(file, maxSide = 1200) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        try {
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          // White background, so transparent PNG files are readable
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);

          canvas.toBlob(blob => {
            URL.revokeObjectURL(url);

            if (!blob) {
              reject(new Error("Could not prepare the image."));
              return;
            }

            resolve(new File([blob], "qr.png", { type: "image/png" }));
          }, "image/png");
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not open the image."));
      };

      image.src = url;
    });
  }

  /* ---------- The screen ---------- */

  function mount() {
    const panel = $("scannerPanel");

    if (!panel || $("tinvinQRWorkspace")) return;

    const launcher = $("openScannerBtn");
    if (launcher) launcher.style.display = "none";

    const root = document.createElement("div");
    root.id = "tinvinQRWorkspace";
    root.innerHTML = `
      <div id="qrPage">
        <div class="qr-container">

          <div class="qr-heading">
            <h2>QR Scanner &amp; Generator</h2>
            <p class="qr-description">
              Scan QR codes or create your own instantly.
            </p>
          </div>

          <div class="tvqr-tabs" role="tablist">
            <button type="button" class="tvqr-tab active"
              id="tvqr-scan-tab" role="tab" aria-selected="true">
              Scan QR
            </button>

            <button type="button" class="tvqr-tab"
              id="tvqr-create-tab" role="tab" aria-selected="false">
              Create QR
            </button>
          </div>

          <section id="tvqr-scan-section">

            <div class="tvqr-camera" id="tvqr-camera">
              <div id="tvqr-reader" class="tvqr-reader"></div>

              <span class="tvqr-corner tl"></span>
              <span class="tvqr-corner tr"></span>
              <span class="tvqr-corner bl"></span>
              <span class="tvqr-corner br"></span>

              <div class="tvqr-idle" id="tvqr-idle">
                <button type="button" id="tvqr-start" class="tvqr-primary">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                    stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round"
                    aria-hidden="true">
                    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
                    <circle cx="12" cy="13" r="3.5"/>
                  </svg>
                  <span>Start Camera</span>
                </button>

                <div class="tvqr-pill">
                  <span class="tvqr-dot"></span>
                  <span id="tvqr-pill-text">Ready to scan</span>
                </div>
              </div>

              <button type="button" id="tvqr-stop" class="tvqr-stop" hidden>
                Stop Camera
              </button>
            </div>

            <div class="tvqr-or"><span>OR</span></div>

            <label class="tvqr-upload" for="tvqr-file">
              <span class="tvqr-upload-icon">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none"
                  stroke="currentColor" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round"
                  aria-hidden="true">
                  <path d="M12 16V4M7 9l5-5 5 5"/>
                  <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
                </svg>
              </span>
              <strong>Upload QR Image</strong>
              <small>PNG, JPG or WEBP</small>
            </label>

            <input type="file" id="tvqr-file" accept="image/png,image/jpeg,image/webp" hidden />

            <div id="tvqr-file-reader" style="display:none"></div>

            <div id="tvqr-result" class="tvqr-result" hidden>
              <strong>Scan result</strong>
              <p id="tvqr-result-text"></p>

              <div class="tvqr-actions">
                <button type="button" id="tvqr-copy" class="tvqr-primary">
                  Copy Result
                </button>

                <button type="button" id="tvqr-open"
                  class="tvqr-secondary" hidden>
                  Open Link
                </button>
              </div>
            </div>

          </section>

          <section id="tvqr-create-section" hidden>

            <label class="tvqr-label" for="tvqr-text">
              Enter text or website URL
            </label>

            <textarea
              id="tvqr-text"
              class="tvqr-input"
              rows="4"
              maxlength="2500"
              placeholder="Enter text or paste a URL..."
            ></textarea>

            <button type="button" id="tvqr-generate" class="tvqr-primary">
              Generate QR Code
            </button>

            <div id="tvqr-image" class="tvqr-generated" hidden></div>

            <div class="tvqr-actions" id="tvqr-create-actions" hidden>
              <button type="button" id="tvqr-share" class="tvqr-secondary">
                Share
              </button>

              <button type="button" id="tvqr-download" class="tvqr-secondary">
                Download
              </button>
            </div>

          </section>

          <p id="tvqr-status" class="qr-status" aria-live="polite"></p>

          <p class="tvqr-note">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
              stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"
              aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2"/>
              <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
            </svg>
            <span>Requires camera permission &amp; secure HTTPS</span>
          </p>

        </div>
      </div>
    `;

    panel.appendChild(root);

    bindEvents();
    watchVisibility();
  }

  function showMode(mode) {
    $("tvqr-scan-section").hidden = mode !== "scan";
    $("tvqr-create-section").hidden = mode !== "create";

    const scanTab = $("tvqr-scan-tab");
    const createTab = $("tvqr-create-tab");

    scanTab.classList.toggle("active", mode === "scan");
    createTab.classList.toggle("active", mode === "create");

    scanTab.setAttribute("aria-selected", String(mode === "scan"));
    createTab.setAttribute("aria-selected", String(mode === "create"));

    if (mode !== "scan") {
      stopScanner();
    }

    setStatus(mode === "scan" ? "" : "Enter text to create a QR code.");
  }

  /* ---------- Camera ---------- */

  async function stopScanner() {
    const current = scanner;

    scanner = null;

    if (current) {
      try {
        if (scannerRunning) await current.stop();
      } catch (error) {
        console.warn("QR scanner stop:", error);
      }

      try {
        await current.clear();
      } catch {}
    }

    scannerRunning = false;

    $("tvqr-camera")?.classList.remove("running");

    const stop = $("tvqr-stop");
    if (stop) stop.hidden = true;

    setPill("Ready to scan");
  }

  function showResult(value) {
    if (!value) return;

    $("tvqr-result").hidden = false;
    $("tvqr-result-text").textContent = value;

    const openButton = $("tvqr-open");

    try {
      const url = new URL(value);

      if (url.protocol === "http:" || url.protocol === "https:") {
        openButton.hidden = false;
        openButton.dataset.url = url.href;
      } else {
        openButton.hidden = true;
        delete openButton.dataset.url;
      }
    } catch {
      openButton.hidden = true;
      delete openButton.dataset.url;
    }

    setStatus("QR code scanned successfully.");
    stopScanner();
  }

  async function startScanner() {
    if (scannerRunning || starting) return;

    starting = true;

    const startButton = $("tvqr-start");
    startButton.disabled = true;

    $("tvqr-result").hidden = true;
    setPill("Starting camera...");
    setStatus("");

    try {
      await loadScanLibrary();

      scanner = new Html5Qrcode("tvqr-reader");

      // Give the camera picture room before it starts
      $("tvqr-camera").classList.add("running");

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.floor(Math.min(width, height) * 0.7);
            const side = Math.max(120, size);
            return { width: side, height: side };
          },
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        },
        decodedText => showResult(decodedText),
        () => {}
      );

      scannerRunning = true;
      $("tvqr-stop").hidden = false;

      setStatus("Point the camera at a QR code.");

    } catch (error) {
      console.error("Camera start failed:", error);

      scanner = null;
      scannerRunning = false;

      $("tvqr-camera").classList.remove("running");
      setPill("Ready to scan");
      setStatus(cameraErrorMessage(error), true);

    } finally {
      starting = false;
      startButton.disabled = false;
    }
  }

  async function scanImage(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Please select an image file.", true);
      return;
    }

    setStatus("Reading QR code from image...");

    try {
      await loadScanLibrary();
      await stopScanner();

      const reader = new Html5Qrcode("tvqr-file-reader");

      try {
        let text = "";

        try {
          text = await reader.scanFile(file, false);
        } catch {
          // A smaller copy of the photo is often easier to read
          const smaller = await shrinkImage(file);
          text = await reader.scanFile(smaller, false);
        }

        showResult(text);
      } finally {
        try {
          await reader.clear();
        } catch {}
      }

    } catch (error) {
      console.error("Image scan failed:", error);

      if (/load the QR library/i.test(error.message || "")) {
        setStatus(error.message, true);
      } else {
        setStatus("No readable QR code found in this image.", true);
      }
    }
  }

  /* ---------- Creating a QR code ---------- */

  async function generateQR() {
    const value = $("tvqr-text").value.trim();

    if (!value) {
      setStatus("Please enter text or a URL first.", true);
      return;
    }

    setStatus("Creating QR code...");

    try {
      await loadGenerateLibrary();

      const target = $("tvqr-image");
      target.replaceChildren();
      target.hidden = false;

      new QRCode(target, {
        text: value,
        width: 512,
        height: 512,
        colorDark: "#111827",
        colorLight: "#ffffff",
        correctLevel:
          value.length > 600
            ? QRCode.CorrectLevel.L
            : QRCode.CorrectLevel.H
      });

      generated = true;
      $("tvqr-create-actions").hidden = false;

      setStatus("Your QR code is ready.");

    } catch (error) {
      console.error("QR creation failed:", error);

      generated = false;
      $("tvqr-image").hidden = true;
      $("tvqr-create-actions").hidden = true;

      setStatus(
        /overflow|length/i.test(String(error?.message || error))
          ? "The text is too long for a QR code. Please shorten it."
          : (error.message || "Could not create QR code."),
        true
      );
    }
  }

  function getGeneratedDataURL() {
    const target = $("tvqr-image");
    const canvas = target.querySelector("canvas");
    const image = target.querySelector("img");

    if (canvas) return canvas.toDataURL("image/png");
    if (image && image.src) return image.src;

    return "";
  }

  function downloadQR() {
    if (!generated) {
      setStatus("Create a QR code first.", true);
      return;
    }

    const dataURL = getGeneratedDataURL();

    if (!dataURL) {
      setStatus("QR image is not ready yet.", true);
      return;
    }

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "TinVin-AI-QR.png";
    document.body.appendChild(link);
    link.click();
    link.remove();

    setStatus("QR image downloaded.");
  }

  async function shareQR() {
    if (!generated) {
      setStatus("Create a QR code first.", true);
      return;
    }

    const dataURL = getGeneratedDataURL();

    if (!dataURL) {
      setStatus("QR image is not ready yet.", true);
      return;
    }

    try {
      const blob = await (await fetch(dataURL)).blob();
      const file = new File([blob], "TinVin-AI-QR.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "TinVin AI QR" });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "TinVin AI QR",
          text: $("tvqr-text").value.trim()
        });
        return;
      }

      downloadQR();

    } catch (error) {
      // The person closed the share sheet: not an error
      if (error && error.name === "AbortError") return;

      console.error("Share failed:", error);
      setStatus("Could not share. Try Download instead.", true);
    }
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    $("tvqr-scan-tab").addEventListener("click", () => showMode("scan"));
    $("tvqr-create-tab").addEventListener("click", () => showMode("create"));

    $("tvqr-start").addEventListener("click", startScanner);
    $("tvqr-stop").addEventListener("click", stopScanner);

    $("tvqr-file").addEventListener("change", event => {
      const file = event.target.files[0];
      scanImage(file);
      event.target.value = "";
    });

    $("tvqr-generate").addEventListener("click", generateQR);
    $("tvqr-download").addEventListener("click", downloadQR);
    $("tvqr-share").addEventListener("click", shareQR);

    $("tvqr-copy").addEventListener("click", async () => {
      const value = $("tvqr-result-text").textContent;

      try {
        await navigator.clipboard.writeText(value);
        setStatus("QR result copied.");
      } catch {
        setStatus("Could not copy automatically.", true);
      }
    });

    $("tvqr-open").addEventListener("click", () => {
      const url = $("tvqr-open").dataset.url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  // Turn the camera off when the person leaves the Scanner screen
  function watchVisibility() {
    const camera = $("tvqr-camera");

    if (camera && "ResizeObserver" in window) {
      new ResizeObserver(entries => {
        const box = entries[0]?.contentRect;

        if (box && box.width === 0 && (scannerRunning || starting)) {
          stopScanner();
        }
      }).observe(camera);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && scannerRunning) stopScanner();
    });
  }

  function initialize() {
    mount();

    window.TinVinQR = {
      open() {
        const panel = $("scannerPanel");
        if (panel) panel.hidden = false;
        showMode("scan");
      },
      close() {
        stopScanner();
      },
      openScanner() {
        this.open();
        showMode("scan");
      },
      openGenerator() {
        this.open();
        showMode("create");
      },
      stop: stopScanner
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

})();
