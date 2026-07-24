'use strict';

import {
  auth,
  db,
  storage,
  serverTimestamp,
  Timestamp
} from './firebase-config.js';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

/* ==========================================================================
   APPLICATION CONSTANTS
   ========================================================================== */

export const APP = Object.freeze({

  NAME: "Premium Commerce",

  VERSION: "1.0.0",

  CURRENCY: "৳",

  IMAGE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif"
  ],

  MAX_IMAGE_SIZE: 10 * 1024 * 1024,

  PAGE_SIZE: 20,

  TOAST_DURATION: 3200

});

/* ==========================================================================
   GLOBAL STATE
   ========================================================================== */

export const State = {

  user: null,

  profile: null,

  cartCount: 0,

  wishlistCount: 0,

  online: navigator.onLine,

  listeners: [],

  cache: new Map()

};

/* ==========================================================================
   DOM HELPERS
   ========================================================================== */

export const $ = (selector, root = document) =>
  root.querySelector(selector);

export const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

export function create(tag, className = "") {

  const el = document.createElement(tag);

  if (className) {

    el.className = className;

  }

  return el;

}

export function empty(node) {

  while (node.firstChild) {

    node.removeChild(node.firstChild);

  }

}

export function show(el) {

  if (el) {

    el.classList.remove("hidden");

  }

}

export function hide(el) {

  if (el) {

    el.classList.add("hidden");

  }

}

export function toggle(el, state) {

  if (!el) return;

  el.classList.toggle("hidden", !state);

}

/* ==========================================================================
   FORMATTERS
   ========================================================================== */

export function money(value = 0) {

  return `${APP.CURRENCY}${Number(value).toLocaleString("en-BD")}`;

}

export function percent(oldPrice, newPrice) {

  if (!oldPrice || oldPrice <= newPrice) {

    return 0;

  }

  return Math.round(
    ((oldPrice - newPrice) / oldPrice) * 100
  );

}

export function stockLabel(stock) {

  if (stock <= 0) return "Out of Stock";

  if (stock <= 5) return "Low Stock";

  return "In Stock";

}

export function shortDate(value) {

  if (!value) return "";

  const date =
    value instanceof Timestamp
      ? value.toDate()
      : new Date(value);

  return new Intl.DateTimeFormat(
    "en-BD",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  ).format(date);

}

export function dateTime(value) {

  if (!value) return "";

  const date =
    value instanceof Timestamp
      ? value.toDate()
      : new Date(value);

  return new Intl.DateTimeFormat(
    "en-BD",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(date);

}

/* ==========================================================================
   VALIDATION
   ========================================================================== */

export function required(value) {

  return String(value ?? "").trim().length > 0;

}

export function validPhone(phone) {

  return /^(?:\+8801|8801|01)[3-9]\d{8}$/.test(
    phone.trim()
  );

}

export function validEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email.trim()
  );

}

export function validImage(file) {

  if (!file) return false;

  return (
    APP.IMAGE_TYPES.includes(file.type) &&
    file.size <= APP.MAX_IMAGE_SIZE
  );

}

/* ==========================================================================
   TOAST
   ========================================================================== */

let toastStack;

function ensureToastStack() {

  if (toastStack) return toastStack;

  toastStack = document.createElement("div");

  toastStack.className = "toast-stack";

  document.body.appendChild(toastStack);

  return toastStack;

}

export function toast(message, type = "success") {

  const stack = ensureToastStack();

  const item = create("div", `toast ${type}`);

  item.innerHTML = `
    <div>
      <strong>${type.toUpperCase()}</strong>
      <div>${message}</div>
    </div>
  `;

  stack.appendChild(item);

  setTimeout(() => {

    item.remove();

  }, APP.TOAST_DURATION);

}

/* ==========================================================================
   DIALOG
   ========================================================================== */

export function alertDialog(title, message) {

  return new Promise(resolve => {

    const dialog = create("div", "dialog show");

    dialog.innerHTML = `
      <div class="dialog-overlay"></div>

      <div class="dialog-card">

        <h3>${title}</h3>

        <p>${message}</p>

        <button class="btn btn-primary w-100">
          OK
        </button>

      </div>
    `;

    $("button", dialog).onclick = () => {

      dialog.remove();

      resolve();

    };

    document.body.append(dialog);

  });

}


/* ==========================================================================
   CONFIRM DIALOG
   ========================================================================== */

export function confirmDialog(
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel"
) {

  return new Promise(resolve => {

    const dialog = create("div", "dialog show");

    dialog.innerHTML = `
      <div class="dialog-overlay"></div>

      <div class="dialog-card">

        <h3>${title}</h3>

        <p>${message}</p>

        <div class="flex" style="gap:.8rem">

          <button
            class="btn btn-secondary w-100"
            data-action="cancel">

            ${cancelText}

          </button>

          <button
            class="btn btn-primary w-100"
            data-action="confirm">

            ${confirmText}

          </button>

        </div>

      </div>
    `;

    dialog
      .querySelector("[data-action='cancel']")
      .onclick = () => {

        dialog.remove();

        resolve(false);

      };

    dialog
      .querySelector("[data-action='confirm']")
      .onclick = () => {

        dialog.remove();

        resolve(true);

      };

    dialog
      .querySelector(".dialog-overlay")
      .onclick = () => {

        dialog.remove();

        resolve(false);

      };

    document.body.append(dialog);

  });

}

/* ==========================================================================
   LOCAL STORAGE
   ========================================================================== */

export const Storage = {

  get(key, fallback = null) {

    try {

      const value = localStorage.getItem(key);

      return value
        ? JSON.parse(value)
        : fallback;

    } catch {

      return fallback;

    }

  },

  set(key, value) {

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

  },

  remove(key) {

    localStorage.removeItem(key);

  },

  clear(prefix = "") {

    if (!prefix) {

      localStorage.clear();

      return;

    }

    Object.keys(localStorage).forEach(key => {

      if (key.startsWith(prefix)) {

        localStorage.removeItem(key);

      }

    });

  }

};

/* ==========================================================================
   FIRESTORE HELPERS
   ========================================================================== */

export async function getDocument(path) {

  const snapshot =
    await getDoc(doc(db, path));

  return snapshot.exists()
    ? {
        id: snapshot.id,
        ...snapshot.data()
      }
    : null;

}

export async function setDocument(path, data) {

  await setDoc(
    doc(db, path),
    {
      ...data,
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );

}

export async function removeDocument(path) {

  await deleteDoc(doc(db, path));

}

export async function addCollection(
  collectionName,
  data
) {

  return addDoc(
    collection(db, collectionName),
    {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  );

}

export function subscribeDocument(
  path,
  callback
) {

  return onSnapshot(
    doc(db, path),
    snap => {

      callback(
        snap.exists()
          ? {
              id: snap.id,
              ...snap.data()
            }
          : null
      );

    }
  );

}

export function subscribeCollection(
  collectionName,
  callback,
  constraints = []
) {

  const q = query(
    collection(db, collectionName),
    ...constraints
  );

  return onSnapshot(q, snap => {

    callback(
      snap.docs.map(item => ({
        id: item.id,
        ...item.data()
      }))
    );

  });

}

/* ==========================================================================
   STORAGE HELPERS
   ========================================================================== */

export async function uploadImage(
  path,
  file
) {

  if (!validImage(file)) {

    throw new Error(
      "Invalid image."
    );

  }

  const storageRef =
    ref(storage, path);

  await uploadBytes(
    storageRef,
    file
  );

  return getDownloadURL(storageRef);

}

export async function removeFile(path) {

  await deleteObject(ref(storage, path));

}

/* ==========================================================================
   AUTH OBSERVER
   ========================================================================== */

export function listenAuth() {

  return onAuthStateChanged(
    auth,
    async user => {

      State.user = user;

      if (!user) {

        State.profile = null;

        return;

      }

      State.profile =
        await getDocument(
          `users/${user.uid}`
        );

    }
  );

}

/* ==========================================================================
   NETWORK STATUS
   ========================================================================== */

window.addEventListener(
  "online",
  () => {

    State.online = true;

    toast(
      "Internet connection restored.",
      "success"
    );

  }
);

window.addEventListener(
  "offline",
  () => {

    State.online = false;

    toast(
      "You are offline.",
      "warning"
    );

  }
);

/* ==========================================================================
   EVENT CLEANUP
   ========================================================================== */

export function registerListener(fn) {

  State.listeners.push(fn);

}

export function cleanupListeners() {

  while (State.listeners.length) {

    const unsubscribe =
      State.listeners.pop();

    if (
      typeof unsubscribe === "function"
    ) {

      unsubscribe();

    }

  }

}

/* ==========================================================================
   UTILITIES
   ========================================================================== */

export function debounce(
  callback,
  delay = 300
) {

  let timer;

  return (...args) => {

    clearTimeout(timer);

    timer = setTimeout(
      () => callback(...args),
      delay
    );

  };

}

export function throttle(
  callback,
  wait = 200
) {

  let busy = false;

  return (...args) => {

    if (busy) return;

    busy = true;

    callback(...args);

    setTimeout(() => {

      busy = false;

    }, wait);

  };

}

export function uuid() {

  return crypto.randomUUID();

}

listenAuth();

