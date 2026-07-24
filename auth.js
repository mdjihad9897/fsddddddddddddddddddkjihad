'use strict';

import {
  auth,
  db,
  serverTimestamp
} from "./firebase-config.js";

import {
  toast,
  alertDialog,
  validEmail,
  validPhone,
  required,
  getDocument,
  setDocument,
  State
} from "./core.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

/* ==========================================================================
   AUTH STATE
   ========================================================================== */

const subscribers = new Set();

let initialized = false;

function emit(user) {

  subscribers.forEach(callback => {

    try {

      callback(user);

    } catch (error) {

      console.error(error);

    }

  });

}

export function onUserChanged(callback) {

  subscribers.add(callback);

  if (State.user) {

    callback(State.user);

  }

  return () => subscribers.delete(callback);

}

if (!initialized) {

  initialized = true;

  onAuthStateChanged(auth, async user => {

    State.user = user;

    if (user) {

      State.profile =
        await getDocument(
          `users/${user.uid}`
        );

    } else {

      State.profile = null;

    }

    emit(user);

  });

}

/* ==========================================================================
   REGISTER
   ========================================================================== */

export async function register({

  name,
  email,
  phone,
  password

}) {

  name = name.trim();
  email = email.trim().toLowerCase();
  phone = phone.trim();

  if (!required(name)) {

    throw new Error(
      "Full name is required."
    );

  }

  if (!validEmail(email)) {

    throw new Error(
      "Invalid email address."
    );

  }

  if (!validPhone(phone)) {

    throw new Error(
      "Invalid phone number."
    );

  }

  if (password.length < 8) {

    throw new Error(
      "Password must contain at least 8 characters."
    );

  }

  const credential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  await updateProfile(
    credential.user,
    {
      displayName: name
    }
  );

  const profile = {

    uid: credential.user.uid,

    name,

    email,

    phone,

    photoURL: "",

    role: "customer",

    disabled: false,

    address: {

      division: "",
      district: "",
      upazila: "",
      area: "",
      address: ""

    },

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp()

  };

  await setDoc(
    doc(
      db,
      "users",
      credential.user.uid
    ),
    profile
  );

  toast(
    "Registration completed.",
    "success"
  );

  return credential.user;

}

/* ==========================================================================
   LOGIN
   ========================================================================== */

export async function login(
  email,
  password
) {

  email = email.trim().toLowerCase();

  if (!validEmail(email)) {

    throw new Error(
      "Enter a valid email."
    );

  }

  if (!password) {

    throw new Error(
      "Password is required."
    );

  }

  const credential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  const profile =
    await getDoc(
      doc(
        db,
        "users",
        credential.user.uid
      )
    );

  if (
    profile.exists() &&
    profile.data().disabled
  ) {

    await signOut(auth);

    throw new Error(
      "This account has been disabled."
    );

  }

  toast(
    "Welcome back.",
    "success"
  );

  return credential.user;

}

/* ==========================================================================
   RESET PASSWORD
   ========================================================================== */

export async function forgotPassword(
  email
) {

  email = email.trim();

  if (!validEmail(email)) {

    throw new Error(
      "Enter a valid email."
    );

  }

  await sendPasswordResetEmail(
    auth,
    email
  );

  toast(
    "Password reset email sent.",
    "success"
  );

}


/* ==========================================================================
   LOGOUT
   ========================================================================== */

export async function logout() {

  await signOut(auth);

  State.user = null;
  State.profile = null;

  toast(
    "You have been logged out.",
    "success"
  );

}

/* ==========================================================================
   PROFILE
   ========================================================================== */

export async function getCurrentProfile() {

  if (!auth.currentUser) {

    return null;

  }

  const snapshot = await getDoc(
    doc(
      db,
      "users",
      auth.currentUser.uid
    )
  );

  if (!snapshot.exists()) {

    return null;

  }

  return {

    id: snapshot.id,
    ...snapshot.data()

  };

}

export async function updateProfileInfo(data) {

  if (!auth.currentUser) {

    throw new Error(
      "You must be logged in."
    );

  }

  const payload = {};

  if ("name" in data) {

    if (!required(data.name)) {

      throw new Error(
        "Full name is required."
      );

    }

    payload.name = data.name.trim();

    await updateProfile(
      auth.currentUser,
      {
        displayName: payload.name
      }
    );

  }

  if ("phone" in data) {

    if (!validPhone(data.phone)) {

      throw new Error(
        "Invalid phone number."
      );

    }

    payload.phone = data.phone.trim();

  }

  if ("photoURL" in data) {

    payload.photoURL = data.photoURL || "";

    await updateProfile(
      auth.currentUser,
      {
        photoURL: payload.photoURL
      }
    );

  }

  if ("address" in data) {

    payload.address = {

      division:
        data.address.division ?? "",

      district:
        data.address.district ?? "",

      upazila:
        data.address.upazila ?? "",

      area:
        data.address.area ?? "",

      address:
        data.address.address ?? ""

    };

  }

  payload.updatedAt =
    serverTimestamp();

  await updateDoc(
    doc(
      db,
      "users",
      auth.currentUser.uid
    ),
    payload
  );

  State.profile =
    await getCurrentProfile();

  toast(
    "Profile updated.",
    "success"
  );

  return State.profile;

}

/* ==========================================================================
   ROUTE GUARDS
   ========================================================================== */

export function requireAuth() {

  if (!auth.currentUser) {

    location.hash = "#login";

    throw new Error(
      "Authentication required."
    );

  }

}

export function requireAdmin() {

  requireAuth();

  if (
    !State.profile ||
    State.profile.role !== "admin"
  ) {

    throw new Error(
      "Administrator access required."
    );

  }

}

/* ==========================================================================
   SESSION HELPERS
   ========================================================================== */

export function currentUser() {

  return auth.currentUser;

}

export function isAuthenticated() {

  return !!auth.currentUser;

}

export function isAdmin() {

  return (
    !!State.profile &&
    State.profile.role === "admin"
  );

}

/* ==========================================================================
   FORM BINDERS
   ========================================================================== */

export function bindLoginForm(form) {

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const button =
        form.querySelector(
          '[type="submit"]'
        );

      button.disabled = true;

      try {

        await login(
          form.email.value,
          form.password.value
        );

      } catch (error) {

        await alertDialog(
          "Login failed",
          error.message
        );

      } finally {

        button.disabled = false;

      }

    }
  );

}

export function bindRegisterForm(
  form
) {

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const button =
        form.querySelector(
          '[type="submit"]'
        );

      button.disabled = true;

      try {

        await register({

          name:
            form.name.value,

          email:
            form.email.value,

          phone:
            form.phone.value,

          password:
            form.password.value

        });

      } catch (error) {

        await alertDialog(
          "Registration failed",
          error.message
        );

      } finally {

        button.disabled = false;

      }

    }
  );

}

export function bindForgotPasswordForm(
  form
) {

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      try {

        await forgotPassword(
          form.email.value
        );

      } catch (error) {

        await alertDialog(
          "Password reset",
          error.message
        );

      }

    }
  );

}
