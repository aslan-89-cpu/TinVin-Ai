// TinVin AI - Google sign-in, user profile and saved chats
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, collection, getDocs,
  query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCSzbjGrI3qRfFv8AyU0DySgy7Q69BYzM8",
  authDomain: "tinvinai.firebaseapp.com",
  projectId: "tinvinai",
  storageBucket: "tinvinai.firebasestorage.app",
  messagingSenderId: "740437279999",
  appId: "1:740437279999:web:040ac1a6ffb1cfd850f8ca"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

window.TinVinTools = window.TinVinTools || {};

let currentUser = null;
let currentChatId = null;

const $ = id => document.getElementById(id);

function setStatus(text) {
  const el = $("chatStatus");
  if (el) el.textContent = text || "";
}

function makeButton(text, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "auth-btn";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

/* ---------- Sidebar UI ---------- */

function buildSidebarUI() {
  const menu = document.querySelector(".sidebar-menu");
  if (!menu || $("authBox")) return;

  const box = document.createElement("div");
  box.id = "authBox";

  const list = document.createElement("div");
  list.id = "historyList";
  list.hidden = true;

  menu.after(box);
  box.after(list);

  menu.querySelector('[data-menu="history"]')?.addEventListener("click", () => {
    list.hidden = !list.hidden;
    if (!list.hidden) loadHistory();
  });
}

function renderAuthBox(user) {
  const box = $("authBox");
  if (!box) return;
  box.replaceChildren();

  if (user) {
    const name = document.createElement("div");
    name.className = "auth-name";
    name.textContent = user.displayName || user.email || "User";
    box.append(name, makeButton("Sign out", () => signOut(auth)));
  } else {
    box.append(makeButton("Sign in with Google", signIn));
  }
}

/* ---------- Sign in / out ---------- */

async function signIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    // Some iPhone browsers block popups, so fall back to a full redirect
    if (error.code === "auth/popup-blocked" ||
        error.code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
    } else {
      setStatus("Sign-in failed: " + error.code);
    }
  }
}

getRedirectResult(auth).catch(() => {});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  currentChatId = null;
  renderAuthBox(user);

  if (user) {
    // Keep a small profile document for each user
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "",
        email: user.email || "",
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Profile save failed:", error);
    }
  }
});

/* ---------- Saving chats ---------- */

// chat.js calls this after every answer, and with [] when a new chat starts
window.TinVinTools.onChange = async turns => {
  if (!turns.length) {
    currentChatId = null;
    return;
  }

  if (!currentUser) {
    setStatus("Sign in with Google to save your chats.");
    return;
  }

  if (!currentChatId) {
    currentChatId = doc(collection(db, "users", currentUser.uid, "chats")).id;
  }

  const clean = turns.slice(0, 200).map(t => ({
    user: String(t.user || "").slice(0, 4000),
    assistant: String(t.assistant || "").slice(0, 8000)
  }));

  try {
    await setDoc(
      doc(db, "users", currentUser.uid, "chats", currentChatId),
      {
        title: clean[0].user.slice(0, 60),
        turns: clean,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Chat save failed:", error);
  }
};

/* ---------- History ---------- */

async function loadHistory() {
  const list = $("historyList");
  if (!list) return;
  list.replaceChildren();

  if (!currentUser) {
    list.textContent = "Sign in to see your saved chats.";
    return;
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, "users", currentUser.uid, "chats"),
        orderBy("updatedAt", "desc"),
        limit(30)
      )
    );

    if (snap.empty) {
      list.textContent = "No saved chats yet.";
      return;
    }

    snap.forEach(d => {
      const data = d.data();
      const item = makeButton(data.title || "Chat", () => openChat(d.id, data.turns || []));
      item.classList.add("history-item");
      list.appendChild(item);
    });
  } catch (error) {
    list.textContent = "Could not load chats: " + error.code;
  }
}

function openChat(id, turns) {
  currentChatId = id;
  window.TinVinTools.chat?.setHistory?.(turns);
  window.TinVinCore?.openTool?.("chat");
  $("closeMenu")?.click();
}

buildSidebarUI();
