
/* =========================================
   TinVin AI - QR Scanner & Generator
   Standalone frontend module
========================================= */

(() => {
  "use strict";

  if (window.TinVinQRLoaded) return;
  window.TinVinQRLoaded = true;

  const QR_SCAN_CDN =
    "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";

  const QR_GENERATE_CDN =
    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

  let scanner = null;
  let scannerRunning = false;
  let currentMode = "scan";

  const loadScript = (src, test) => {
    return new Promise((resolve, reject) => {
      if (test()) return resolve();

      const existing = document.querySelector(
        `script[src="${src}"]`
      );

      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Could not load QR library.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () =>
        reject(new Error("Could not load QR library. Check internet."));
      document.head.appendChild(script);
    });
  };

  const style = document.createElement("style");

  style.textContent = `
    #tinvin-qr-button {
      position: fixed;
      right: 18px;
      bottom: 95px;
      z-index: 9990;
      border: 1px solid rgba(233,189,99,.5);
      border-radius: 50px;
      padding: 12px 17px;
      color: #111827;
      background: linear-gradient(135deg,#f5d78b,#d6a83e);
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 5px 22px rgba(0,0,0,.25);
    }

    #tinvin-qr-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(4,8,20,.82);
      backdrop-filter: blur(9px);
    }

    #tinvin-qr-overlay.open {
      display: flex;
    }

    #tinvin-qr-panel {
      width: 100%;
      max-width: 410px;
      max-height: 88vh;
      overflow-y: auto;
      padding: 22px;
      border: 1px solid rgba(233,189,99,.35);
      border-radius: 22px;
      background: #111a2d;
      color: #fff;
      font-family: inherit;
      box-shadow: 0 20px 70px rgba(0,0,0,.4);
    }

    #tinvin-qr-panel * {
      box-sizing: border-box;
    }

    .tvqr-heading {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:18px;
    }

    .tvqr-heading h2 {
      margin:0;
      font-size:21px;
      color:#f0c66e;
    }

    .tvqr-close {
      width:35px;
      height:35px;
      border:0;
      border-radius:50%;
      background:#26334b;
      color:white;
      font-size:22px;
      cursor:pointer;
    }

    .tvqr-tabs {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:8px;
      margin-bottom:17px;
    }

    .tvqr-tab {
      border:1px solid #34425b;
      border-radius:12px;
      padding:12px 6px;
      background:#1b2940;
      color:#cbd5e1;
      font-weight:700;
      cursor:pointer;
    }

    .tvqr-tab.active {
      color:#111827;
      background:#e9bd63;
      border-color:#e9bd63;
    }

    .tvqr-label {
      display:block;
      margin:12px 0 7px;
      color:#dbe4f2;
      font-size:13px;
      font-weight:700;
    }

    .tvqr-input {
      width:100%;
      min-height:45px;
      padding:12px;
      border:1px solid #34425b;
      border-radius:11px;
      outline:none;
      background:#0b1323;
      color:white;
      font:inherit;
    }

    .tvqr-input:focus {
      border-color:#e9bd63;
    }

    .tvqr-main {
      width:100%;
      margin-top:13px;
      padding:13px;
      border:0;
      border-radius:12px;
      background:#e9bd63;
      color:#101827;
      font-weight:800;
      font-size:14px;
      cursor:pointer;
    }

    .tvqr-secondary {
      width:100%;
      margin-top:9px;
      padding:12px;
      border:1px solid #43516a;
      border-radius:12px;
      background:#1b2940;
      color:white;
      font-weight:700;
      cursor:pointer;
    }

    #tinvin-qr-reader {
      width:100%;
      margin-top:12px;
      overflow:hidden;
      border-radius:13px;
      background:#080f1c;
    }

    #tinvin-qr-reader video {
      border-radius:12px;
    }

    #tinvin-qr-result {
      display:none;
      margin-top:14px;
      padding:13px;
      border:1px solid #3b8069;
      border-radius:12px;
      background:#102b29;
      color:#d8fff0;
      overflow-wrap:anywhere;
      font-size:13px;
    }

    #tinvin-qr-image {
      display:none;
      margin:18px auto 0;
      padding:12px;
      width:max-content;
      max-width:100%;
      min-height:20px;
      border-radius:12px;
      background:white;
    }

    #tinvin-qr-image img,
    #tinvin-qr-image canvas {
      display:block;
      max-width:100%;
      height:auto;
    }

    .tvqr-note {
      margin-top:12px;
      color:#9baac1;
      font-size:11px;
      line-height:1.6;
      text-align:center;
    }
  `;

  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "tinvin-qr-overlay";

  overlay.innerHTML = `
    <section id="tinvin-qr-panel">
      <div class="tvqr-heading">
        <h2>QR Tools</h2>
        <button class="tvqr-close" id="tvqr-close"
          aria-label="Close">&times;</button>
      </div>

      <div class="tvqr-tabs">
        <button class="tvqr-tab active" id="tvqr-scan-tab">
          Scan QR
        </button>
        <button class="tvqr-tab" id="tvqr-generate-tab">
          Create QR
        </button>
      </div>

      <div id="tvqr-scan-section">
        <p style="color:#cbd5e1;font-size:13px">
          Scan a QR code using your camera.
        </p>

        <div id="tinvin-qr-reader"></div>

        <button class="tvqr-main" id="tvqr-start">
          Start Camera
        </button>

        <button class="tvqr-secondary" id="tvqr-stop"
          style="display:none">
          Stop Camera
        </button>

        <div id="tinvin-qr-result"></div>
        <button class="tvqr-secondary" id="tvqr-copy"
          style="display:none">
          Copy Result
        </button>

        <label class="tvqr-label" for="tvqr-file">
          Or scan an image
        </label>
        <input class="tvqr-input" id="tvqr-file"
          type="file" accept="image/*">
      </div>

      <div id="tvqr-generate-section" style="display:none">
        <label class="tvqr-label" for="tvqr-text">
          Enter text or website URL
        </label>
        <textarea class="tvqr-input" id="tvqr-text"
          rows="3" placeholder="Enter text or paste a URL"></textarea>

        <button class="tvqr-main" id="tvqr-create">
          Generate QR Code
        </button>

        <div id="tinvin-qr-image"></div>

        <button class="tvqr-secondary" id="tvqr-download"
          style="display:none">
          Download QR Image
        </button>
      </div>

      <p class="tvqr-note">
        Camera access requires permission and a secure HTTPS connection.
      </p>
    </section>
  `;

  document.body.appendChild(overlay);

  const button = document.createElement("button");
  button.id = "tinvin-qr-button";
  button.type = "button";
  button.textContent = "▦ QR Tools";
  document.body.appendChild(button);

  const $ = id => document.getElementById(id);

  function showMode(mode) {
    currentMode = mode;

    $("tvqr-scan-section").style.display =
      mode === "scan" ? "block" : "none";

    $("tvqr-generate-section").style.display =
      mode === "generate" ? "block" : "none";

    $("tvqr-scan-tab").classList.toggle(
      "active", mode === "scan"
    );

    $("tvqr-generate-tab").classList.toggle(
      "active", mode === "generate"
    );

    if (mode !== "scan") stopScanner();
  }

  async function stopScanner() {
    if (!scanner || !scannerRunning) return;

    try {
      await scanner.stop();
      scanner.clear();
    } catch (error) {
      console.warn("QR scanner stop:", error);
    }

    scannerRunning = false;
    $("tvqr-start").style.display = "block";
    $("tvqr-stop").style.display = "none";
  }

  function showResult(value) {
    $("tinvin-qr-result").style.display = "block";
    $("tinvin-qr-result").textContent = value;
    $("tvqr-copy").style.display = "block";
    stopScanner();
  }

  async function startScanner() {
    $("tvqr-start").disabled = true;
    $("tvqr-start").textContent = "Loading camera...";

    try {
      await loadScript(
        QR_SCAN_CDN,
        () => typeof window.Html5Qrcode !== "undefined"
      );

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras.length) {
        throw new Error("No camera was found on this device.");
      }

      const preferred =
        cameras.find(camera =>
          /back|rear|environment/i.test(camera.label)
        ) || cameras[0];

      scanner = new Html5Qrcode("tinvin-qr-reader");

      await scanner.start(
        preferred.id,
        {
          fps: 10,
          qrbox: { width: 230, height: 230 }
        },
        decodedText => showResult(decodedText),
        () => {}
      );

      scannerRunning = true;
      $("tvqr-start").style.display = "none";
      $("tvqr-stop").style.display = "block";

    } catch (error) {
      alert(
        error.message ||
        "Could not start camera. Please allow camera permission."
      );
    } finally {
      $("tvqr-start").disabled = false;
      $("tvqr-start").textContent = "Start Camera";
    }
  }

  async function scanImage(file) {
    if (!file) return;

    try {
      await loadScript(
        QR_SCAN_CDN,
        () => typeof window.Html5Qrcode !== "undefined"
      );

      const reader = new Html5Qrcode("tinvin-qr-reader");
      const result = await reader.scanFile(file, true);
      showResult(result);
      reader.clear();

    } catch (error) {
      alert("No readable QR code found in this image.");
    }
  }

  async function generateQR() {
    const value = $("tvqr-text").value.trim();

    if (!value) {
      alert("Please enter text or a URL first.");
      return;
    }

    if (value.length > 2500) {
      alert("Please use a shorter text (maximum 2500 characters).");
      return;
    }

    try {
      await loadScript(
        QR_GENERATE_CDN,
        () => typeof window.QRCode !== "undefined"
      );

      const target = $("tinvin-qr-image");
      target.innerHTML = "";
      target.style.display = "block";

      new QRCode(target, {
        text: value,
        width: 220,
        height: 220,
        colorDark: "#111827",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });

      $("tvqr-download").style.display = "block";

    } catch (error) {
      alert("QR generator could not load. Check your internet.");
    }
  }

  function downloadQR() {
    const target = $("tinvin-qr-image");
    const canvas = target.querySelector("canvas");
    const img = target.querySelector("img");

    let dataURL = "";

    if (canvas) {
      dataURL = canvas.toDataURL("image/png");
    } else if (img) {
      dataURL = img.src;
    }

    if (!dataURL) {
      alert("Generate a QR code first.");
      return;
    }

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "TinVin-QR.png";
    link.click();
  }

  button.addEventListener("click", () => {
    overlay.classList.add("open");
  });

  $("tvqr-close").addEventListener("click", async () => {
    await stopScanner();
    overlay.classList.remove("open");
  });

  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      stopScanner();
      overlay.classList.remove("open");
    }
  });

  $("tvqr-scan-tab").addEventListener("click", () => {
    showMode("scan");
  });

  $("tvqr-generate-tab").addEventListener("click", () => {
    showMode("generate");
  });

  $("tvqr-start").addEventListener("click", startScanner);
  $("tvqr-stop").addEventListener("click", stopScanner);

  $("tvqr-file").addEventListener("change", event => {
    scanImage(event.target.files[0]);
    event.target.value = "";
  });

  $("tvqr-copy").addEventListener("click", async () => {
    const result = $("tinvin-qr-result").textContent;

    try {
      await navigator.clipboard.writeText(result);
      $("tvqr-copy").textContent = "Copied!";
      setTimeout(() => {
        $("tvqr-copy").textContent = "Copy Result";
      }, 1500);
    } catch {
      alert("Could not copy automatically. Select and copy the result.");
    }
  });

  $("tvqr-create").addEventListener("click", generateQR);
  $("tvqr-download").addEventListener("click", downloadQR);

  window.TinVinQR = {
    open() {
      overlay.classList.add("open");
    },
    close() {
      stopScanner();
      overlay.classList.remove("open");
    },
    openScanner() {
      overlay.classList.add("open");
      showMode("scan");
    },
    openGenerator() {
      overlay.classList.add("open");
      showMode("generate");
    }
  };

})();
