
/* TinVin AI - QR Scanner & Generator
   Integrated inside the Scanner workspace tab
*/

(() => {
  "use strict";

  if (window.TinVinQRLoaded) return;
  window.TinVinQRLoaded = true;

  const SCAN_CDN =
    "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";

  const GENERATE_CDN =
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

  const $ = id => document.getElementById(id);

  let scanner = null;
  let scannerRunning = false;
  let currentMode = "scan";
  let generated = false;

  function loadScript(src, test) {
    return new Promise((resolve, reject) => {
      if (test()) {
        resolve();
        return;
      }

      const existing = document.querySelector(
        `script[src="${src}"]`
      );

      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => {
          reject(new Error("QR library could not load."));
        }, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        reject(new Error("Could not load QR library. Check your internet."));
      };

      document.head.appendChild(script);
    });
  }

  function setStatus(message, isError = false) {
    const status = $("tvqr-status");
    if (!status) return;

    status.textContent = message || "";
    status.classList.toggle("error", isError);
  }

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
            <div>
              <h2>QR Scanner & Generator</h2>
              <p class="qr-description">
                Scan QR codes or create your own QR code.
              </p>
            </div>
          </div>

          <div class="qr-tabs">
            <button type="button" class="qr-tab active"
              id="tvqr-scan-tab">
              Scan QR
            </button>

            <button type="button" class="qr-tab"
              id="tvqr-create-tab">
              Create QR
            </button>
          </div>

          <section id="tvqr-scan-section">

            <div id="tvqr-reader" class="qr-preview"></div>

            <div class="qr-actions">
              <button type="button" id="tvqr-start">
                Start Camera
              </button>

              <button type="button" id="tvqr-stop"
                class="qr-secondary" hidden>
                Stop Camera
              </button>
            </div>

            <label class="qr-label" for="tvqr-file">
              Or scan a QR code from an image
            </label>

            <input
              type="file"
              id="tvqr-file"
              class="qr-input"
              accept="image/*"
            />

            <div id="tvqr-result" class="qr-result" hidden>
              <strong>Scan result</strong>
              <p id="tvqr-result-text"></p>

              <div class="qr-actions">
                <button type="button" id="tvqr-copy">
                  Copy Result
                </button>

                <button type="button" id="tvqr-open"
                  class="qr-secondary" hidden>
                  Open Link
                </button>
              </div>
            </div>

          </section>

          <section id="tvqr-create-section" hidden>

            <label class="qr-label" for="tvqr-text">
              Enter text or website URL
            </label>

            <textarea
              id="tvqr-text"
              class="qr-input"
              rows="4"
              maxlength="2500"
              placeholder="Enter text or paste a URL..."
            ></textarea>

            <button type="button" id="tvqr-generate">
              Generate QR Code
            </button>

            <div id="tvqr-image" class="qr-generated" hidden></div>

            <button type="button" id="tvqr-download"
              class="qr-secondary" hidden>
              Download QR Image
            </button>

          </section>

          <p id="tvqr-status" class="qr-status" aria-live="polite">
            Ready.
          </p>

          <p class="qr-note">
            Camera access requires permission and a secure HTTPS connection.
          </p>

        </div>
      </div>
    `;

    panel.appendChild(root);

    bindEvents();
  }

  function showMode(mode) {
    currentMode = mode;

    $("tvqr-scan-section").hidden = mode !== "scan";
    $("tvqr-create-section").hidden = mode !== "create";

    $("tvqr-scan-tab").classList.toggle(
      "active",
      mode === "scan"
    );

    $("tvqr-create-tab").classList.toggle(
      "active",
      mode === "create"
    );

    if (mode !== "scan") {
      stopScanner();
    }

    setStatus(
      mode === "scan" ? "Ready to scan a QR code." :
      "Enter text to create a QR code."
    );
  }

  async function stopScanner() {
    if (!scanner) return;

    try {
      if (scannerRunning) {
        await scanner.stop();
      }

      scanner.clear();
    } catch (error) {
      console.warn("QR scanner stop:", error);
    }

    scanner = null;
    scannerRunning = false;

    const start = $("tvqr-start");
    const stop = $("tvqr-stop");

    if (start) start.hidden = false;
    if (stop) stop.hidden = true;
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
    if (scannerRunning) return;

    const startButton = $("tvqr-start");
    startButton.disabled = true;
    startButton.textContent = "Starting camera...";

    $("tvqr-result").hidden = true;

    try {
      await loadScript(
        SCAN_CDN,
        () => typeof window.Html5Qrcode !== "undefined"
      );

      scanner = new Html5Qrcode("tvqr-reader");

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1
        },
        decodedText => showResult(decodedText),
        () => {}
      );

      scannerRunning = true;
      startButton.hidden = true;
      $("tvqr-stop").hidden = false;

      setStatus("Camera is active. Point it at a QR code.");

    } catch (error) {
      scanner = null;
      scannerRunning = false;

      setStatus(
        error.message || "Could not start camera. Check camera permission.",
        true
      );

    } finally {
      startButton.disabled = false;
      startButton.textContent = "Start Camera";
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
      await loadScript(
        SCAN_CDN,
        () => typeof window.Html5Qrcode !== "undefined"
      );

      await stopScanner();

      const reader = new Html5Qrcode("tvqr-reader");

      try {
        const result = await reader.scanFile(file, true);
        showResult(result);
      } finally {
        try {
          reader.clear();
        } catch (_) {}
      }

    } catch (error) {
      setStatus("No readable QR code found in this image.", true);
    }
  }

  async function generateQR() {
    const value = $("tvqr-text").value.trim();

    if (!value) {
      setStatus("Please enter text or a URL first.", true);
      return;
    }

    setStatus("Creating QR code...");

    try {
      await loadScript(
        GENERATE_CDN,
        () => typeof window.QRCode !== "undefined"
      );

      const target = $("tvqr-image");
      target.replaceChildren();
      target.hidden = false;

      new QRCode(target, {
        text: value,
        width: 220,
        height: 220,
        colorDark: "#111827",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });

      generated = true;
      $("tvqr-download").hidden = false;

      setStatus("Your QR code is ready.");

    } catch (error) {
      setStatus(
        error.message || "Could not create QR code.",
        true
      );
    }
  }

  function downloadQR() {
    if (!generated) {
      setStatus("Create a QR code first.", true);
      return;
    }

    const target = $("tvqr-image");
    const canvas = target.querySelector("canvas");
    const image = target.querySelector("img");

    let dataURL = "";

    if (canvas) {
      dataURL = canvas.toDataURL("image/png");
    } else if (image) {
      dataURL = image.src;
    }

    if (!dataURL) {
      setStatus("QR image is not ready yet.", true);
      return;
    }

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "TinVin-AI-QR.png";
    link.click();

    setStatus("QR image downloaded.");
  }

  function bindEvents() {
    $("tvqr-scan-tab").addEventListener("click", () => {
      showMode("scan");
    });

    $("tvqr-create-tab").addEventListener("click", () => {
      showMode("create");
    });

    $("tvqr-start").addEventListener("click", startScanner);
    $("tvqr-stop").addEventListener("click", stopScanner);

    $("tvqr-file").addEventListener("change", event => {
      const file = event.target.files[0];
      scanImage(file);
      event.target.value = "";
    });

    $("tvqr-generate").addEventListener("click", generateQR);
    $("tvqr-download").addEventListener("click", downloadQR);

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
