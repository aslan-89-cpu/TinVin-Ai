/* TinVin AI - Business Studio */

(() => {
“use strict”;

const core = window.TinVinCore;

if (!core) {
console.error(“TinVin Core is not loaded.”);
return;
}

const { $, postJSON, extractText, setStatus, setLastOutput } = core;

let busy = false;

function createButton(label, className, callback) {
const button = document.createElement(“button”);

button.type = "button";
button.textContent = label;
button.className = className;
button.addEventListener("click", callback);
return button;

}

function getElements() {
return {
input: $(“toolInput”),
output: $(“toolOutput”),
resultBox: $(“outputBox”),
status: $(“toolStatus”)
};
}

function clearMessage() {
const { output, resultBox } = getElements();

if (output) output.textContent = "";
resultBox?.classList.remove("show");
setLastOutput("");

}

async function copyMessage() {
const { output } = getElements();

const text = output?.textContent?.trim();
if (!text) return;
try {
  await navigator.clipboard.writeText(text);
  setStatus("toolStatus", "Copied successfully!");
} catch (error) {
  console.error("Copy error:", error);
  setStatus("toolStatus", "Unable to copy this message.");
}

}

function deleteMessage() {
clearMessage();

setStatus("toolStatus", "Message deleted.");

}

function newChat() {
const { input } = getElements();

clearMessage();
if (input) {
  input.value = "";
  input.focus();
}
setStatus("toolStatus", "New chat started.");

}

function createActions() {
const { resultBox } = getElements();

if (!resultBox) return;
if ($("businessActions")) return;
const actions = document.createElement("div");
actions.id = "businessActions";
actions.className = "business-actions";
const copyButton = createButton(
  "Copy",
  "business-action-btn",
  copyMessage
);
const deleteButton = createButton(
  "Delete",
  "business-action-btn",
  deleteMessage
);
const newChatButton = createButton(
  "New Chat",
  "business-action-btn",
  newChat
);
actions.append(
  copyButton,
  deleteButton,
  newChatButton
);
resultBox.appendChild(actions);

}

async function run() {
const { input, output, resultBox } = getElements();

const message = input?.value.trim();
if (!message) {
  setStatus(
    "toolStatus",
    "Please describe your business request."
  );
  return;
}
if (busy) return;
busy = true;
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
  if (output) {
    output.textContent = text;
  }
  setLastOutput(text);
  createActions();
  resultBox?.classList.add("show");
  setStatus(
    "toolStatus",
    "Business content created successfully."
  );
} catch (error) {
  console.error("Business Studio error:", error);
  setStatus(
    "toolStatus",
    error.message || "Something went wrong. Please try again."
  );
} finally {
  busy = false;
}

}

window.TinVinTools = window.TinVinTools || {};

window.TinVinTools.business = {
run,
copyMessage,
deleteMessage,
newChat
};

})();