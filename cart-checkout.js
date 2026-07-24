'use strict';

import {
  auth,
  db,
  serverTimestamp
} from "./firebase-config.js";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  money,
  toast,
  alertDialog,
  State
} from "./core.js";

const CartState = {

  items: [],

  coupon: null,

  subtotal: 0,

  delivery: 0,

  discount: 0,

  total: 0

};

/* ==========================================================================
   LOAD CART
   ========================================================================== */

export async function loadCart() {

  if (!auth.currentUser) {

    CartState.items = [];

    calculate();

    return CartState.items;

  }

  const snapshot = await getDocs(

    query(

      collection(db, "cart"),

      where(
        "uid",
        "==",
        auth.currentUser.uid
      )

    )

  );

  CartState.items =
    snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

  calculate();

  return CartState.items;

}

/* ==========================================================================
   ADD TO CART
   ========================================================================== */

export async function addToCart(product) {

  if (!auth.currentUser) {

    throw new Error(
      "Please login first."
    );

  }

  const cartRef =
    collection(db, "cart");

  const exists = await getDocs(

    query(

      cartRef,

      where(
        "uid",
        "==",
        auth.currentUser.uid
      ),

      where(
        "productId",
        "==",
        product.id
      )

    )

  );

  if (!exists.empty) {

    const row =
      exists.docs[0];

    await updateDoc(

      row.ref,

      {

        quantity:

          row.data().quantity + 1,

        updatedAt:

          serverTimestamp()

      }

    );

  } else {

    await addDoc(

      cartRef,

      {

        uid:

          auth.currentUser.uid,

        productId:

          product.id,

        name:

          product.name,

        image:

          product.images[0],

        price:

          product.price,

        deliveryCharge:

          product.deliveryCharge,

        quantity: 1,

        createdAt:

          serverTimestamp(),

        updatedAt:

          serverTimestamp()

      }

    );

  }

  await loadCart();

  toast(
    "Added to cart.",
    "success"
  );

}

/* ==========================================================================
   UPDATE QUANTITY
   ========================================================================== */

export async function updateQuantity(
  id,
  quantity
) {

  if (quantity <= 0) {

    await removeCartItem(id);

    return;

  }

  await updateDoc(

    doc(db, "cart", id),

    {

      quantity,

      updatedAt:
        serverTimestamp()

    }

  );

  await loadCart();

}

/* ==========================================================================
   REMOVE ITEM
   ========================================================================== */

export async function removeCartItem(id) {

  await deleteDoc(
    doc(db, "cart", id)
  );

  await loadCart();

  toast(
    "Item removed.",
    "success"
  );

}

/* ==========================================================================
   COUPON
   ========================================================================== */

export async function applyCoupon(code) {

  code = code.trim().toUpperCase();

  if (!code) {

    throw new Error(
      "Coupon code required."
    );

  }

  const snapshot = await getDocs(

    query(

      collection(db, "coupons"),

      where("code", "==", code),

      where("active", "==", true)

    )

  );

  if (snapshot.empty) {

    throw new Error(
      "Invalid coupon."
    );

  }

  const coupon =
    snapshot.docs[0].data();

  const expiry =
    coupon.expiry.toDate();

  if (expiry < new Date()) {

    throw new Error(
      "Coupon expired."
    );

  }

  CartState.coupon = coupon;

  calculate();

  toast(
    "Coupon applied.",
    "success"
  );

}

/* ==========================================================================
   CALCULATION
   ========================================================================== */

function calculate() {

  CartState.subtotal = 0;

  CartState.delivery = 0;

  CartState.discount = 0;

  CartState.total = 0;

  CartState.items.forEach(item => {

    CartState.subtotal +=
      item.price * item.quantity;

    CartState.delivery +=
      (item.deliveryCharge || 0) *
      item.quantity;

  });

  if (CartState.coupon) {

    if (
      CartState.coupon.type ===
      "percentage"
    ) {

      CartState.discount =
        Math.round(
          CartState.subtotal *
          (
            CartState.coupon.value /
            100
          )
        );

    } else {

      CartState.discount =
        CartState.coupon.value;

    }

  }

  CartState.total =
    CartState.subtotal +
    CartState.delivery -
    CartState.discount;

  renderSummary();

}

/* ==========================================================================
   SUMMARY
   ========================================================================== */

function renderSummary() {

  const subtotal =
    document.getElementById(
      "summarySubtotal"
    );

  const delivery =
    document.getElementById(
      "summaryDelivery"
    );

  const total =
    document.getElementById(
      "summaryTotal"
    );

  if (subtotal) {

    subtotal.textContent =
      money(
        CartState.subtotal
      );

  }

  if (delivery) {

    delivery.textContent =
      money(
        CartState.delivery
      );

  }

  if (total) {

    total.textContent =
      money(
        CartState.total
      );

  }

  const list =
    document.getElementById(
      "cartList"
    );

  if (!list) return;

  if (!CartState.items.length) {

    list.innerHTML = `

      <div class="state">

        <svg>
          <use href="icons.svg#cart"></use>
        </svg>

        <h3>

          Your cart is empty

        </h3>

      </div>

    `;

    return;

  }

  list.innerHTML =
    CartState.items.map(item => `

      <article class="cart-item">

        <img
          src="${item.image}"
          alt="${item.name}">

        <div class="cart-info">

          <h4>

            ${item.name}

          </h4>

          <small>

            Delivery:
            ${money(item.deliveryCharge)}

          </small>

          <strong>

            ${money(item.price)}

          </strong>

        </div>

        <div class="qty-box">

          <button
            data-minus="${item.id}">

            −

          </button>

          <span>

            ${item.quantity}

          </span>

          <button
            data-plus="${item.id}">

            +

          </button>

        </div>

      </article>

    `).join("");

}

/* ==========================================================================
   CHECKOUT
   ========================================================================== */

export async function placeOrder(customer) {

  if (!auth.currentUser) {

    throw new Error(
      "Please login first."
    );

  }

  if (!CartState.items.length) {

    throw new Error(
      "Your cart is empty."
    );

  }

  return runTransaction(
    db,
    async transaction => {

      for (const item of CartState.items) {

        const productRef = doc(
          db,
          "products",
          item.productId
        );

        const productSnap =
          await transaction.get(
            productRef
          );

        if (!productSnap.exists()) {

          throw new Error(
            `${item.name} no longer exists.`
          );

        }

        const product =
          productSnap.data();

        if (
          product.stock < item.quantity
        ) {

          throw new Error(
            `${item.name} is out of stock.`
          );

        }

        transaction.update(
          productRef,
          {
            stock:
              product.stock -
              item.quantity,

            sold:
              (product.sold || 0) +
              item.quantity,

            updatedAt:
              serverTimestamp()
          }
        );

      }

      const orderRef = doc(
        collection(db, "orders")
      );

      transaction.set(orderRef, {

        uid: auth.currentUser.uid,

        orderNumber:
          `ORD-${Date.now()}`,

        customer,

        items: CartState.items,

        subtotal:
          CartState.subtotal,

        delivery:
          CartState.delivery,

        discount:
          CartState.discount,

        total:
          CartState.total,

        paymentMethod:
          customer.payment,

        paymentStatus:
          "Pending",

        deliveryStatus:
          "Pending",

        orderStatus:
          "Placed",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()

      });

      for (const item of CartState.items) {

        transaction.delete(
          doc(db, "cart", item.id)
        );

      }

      CartState.items = [];

      calculate();

      toast(
        "Order placed successfully.",
        "success"
      );

      return orderRef.id;

    }
  );

}

/* ==========================================================================
   PUBLIC API
   ========================================================================== */

export function getCartState() {

  return {

    ...CartState,

    items: [...CartState.items]

  };

}

export async function initializeCart() {

  await loadCart();

}

