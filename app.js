'use strict';

import {
  $,
  $$,
  toast
} from "./core.js";

import {
  initializeShop
} from "./shop.js";

import {
  initializeCart
} from "./cart-checkout.js";

import {
  subscribeMessages,
  subscribeChatStatus,
  sendMessage,
  setTyping
} from "./chat.js";

import {
  bindLoginForm,
  bindRegisterForm,
  bindForgotPasswordForm,
  logout,
  onUserChanged
} from "./auth.js";

/* ==========================================================================
   ROUTER
   ========================================================================== */

const routes = {

  home: "homePage",

  categories: "categoriesPage",

  shop: "shopPage",

  wishlist: "wishlistPage",

  cart: "cartPage",

  checkout: "checkoutPage",

  profile: "profilePage",

  chat: "chatPage",

  login: "loginPage",

  register: "registerPage"

};

function navigate(page) {

  Object.values(routes).forEach(id => {

    const el = $("#" + id);

    if (el) {

      el.classList.add("hidden");

    }

  });

  const target =
    $("#" + (
      routes[page] ||
      routes.home
    ));

  if (target) {

    target.classList.remove(
      "hidden"
    );

  }

  $$(".nav-item").forEach(item => {

    item.classList.toggle(

      "active",

      item.dataset.page === page

    );

  });

}

window.addEventListener(

  "hashchange",

  () => {

    navigate(

      location.hash.replace("#", "") ||

      "home"

    );

  }

);

/* ==========================================================================
   DRAWER
   ========================================================================== */

const drawer =
  $("#appDrawer");

$("#drawerButton")?.addEventListener(

  "click",

  () =>

    drawer.classList.add("open")

);

$("#closeDrawer")?.addEventListener(

  "click",

  () =>

    drawer.classList.remove("open")

);

drawer
?.querySelector(
  ".drawer-backdrop"
)
?.addEventListener(

  "click",

  () =>

    drawer.classList.remove(
      "open"
    )

);

/* ==========================================================================
   AUTH FORMS
   ========================================================================== */

const loginForm =
  $("#loginForm");

if (loginForm) {

  bindLoginForm(
    loginForm
  );

}

const registerForm =
  $("#registerForm");

if (registerForm) {

  bindRegisterForm(
    registerForm
  );

}

const forgotBtn =
  $("#forgotPasswordButton");

forgotBtn?.addEventListener(

  "click",

  () => {

    const email =
      prompt(
        "Enter your email"
      );

    if (!email) return;

    bindForgotPasswordForm({

      addEventListener(
        type,
        callback
      ) {

        callback({

          preventDefault() {}

        });

      },

      email: {

        value: email

      }

    });

  }

);

$("#logoutButton")
?.addEventListener(

  "click",

  async () => {

    await logout();

    location.hash = "#home";

  }

);

/* ==========================================================================
   USER STATE
   ========================================================================== */

onUserChanged(user => {

  const profileName =
    document.getElementById(
      "profileName"
    );

  const profileEmail =
    document.getElementById(
      "profileEmail"
    );

  const profilePhoto =
    document.getElementById(
      "profilePhoto"
    );

  if (!user) {

    if (profileName) {

      profileName.textContent =
        "Guest";

    }

    if (profileEmail) {

      profileEmail.textContent =
        "Not signed in";

    }

    if (profilePhoto) {

      profilePhoto.src =
        "assets/avatar.svg";

    }

    return;

  }

  if (profileName) {

    profileName.textContent =
      user.displayName ||
      "Customer";

  }

  if (profileEmail) {

    profileEmail.textContent =
      user.email;

  }

  if (profilePhoto) {

    profilePhoto.src =
      user.photoURL ||
      "assets/avatar.svg";

  }

});

/* ==========================================================================
   CHAT UI
   ========================================================================== */

const chatForm =
  document.getElementById(
    "chatForm"
  );

const chatInput =
  document.getElementById(
    "chatInput"
  );

const chatMessages =
  document.getElementById(
    "chatMessages"
  );

if (
  chatForm &&
  chatInput &&
  chatMessages
) {

  chatForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const message =
        chatInput.value.trim();

      if (!message) {

        return;

      }

      await sendMessage(
        message
      );

      chatInput.value = "";

    }
  );

  chatInput.addEventListener(
    "input",
    () => {

      setTyping(true);

    }
  );

  subscribeMessages(messages => {

    chatMessages.innerHTML =
      messages
        .map(item => `

<div class="message ${
  item.senderRole === "user"
    ? "mine"
    : "theirs"
}">

<div class="bubble">

${item.text}

</div>

</div>

`)
        .join("");

    chatMessages.scrollTop =
      chatMessages.scrollHeight;

  }).catch(console.error);

  subscribeChatStatus(status => {

    const chip =
      document.getElementById(
        "chatStatus"
      );

    if (!chip) return;

    if (status.typingAdmin) {

      chip.textContent =
        "Typing...";

      return;

    }

    chip.textContent =
      status.online
        ? "Online"
        : "Offline";

  }).catch(console.error);

}

/* ==========================================================================
   SEARCH
   ========================================================================== */

document
  .getElementById(
    "globalSearch"
  )
  ?.addEventListener(
    "focus",
    () => {

      location.hash =
        "#shop";

    }
  );

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

(async () => {

  try {

    await Promise.all([

      initializeShop(),

      initializeCart()

    ]);

    navigate(
      location.hash.replace(
        "#",
        ""
      ) || "home"
    );

    toast(
      "Application ready.",
      "success"
    );

  } catch (error) {

    console.error(error);

    toast(
      error.message,
      "error"
    );

  }

})();

