'use strict';

import {
  db
} from "./firebase-config.js";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  money,
  toast,
  debounce,
  State
} from "./core.js";

const ShopState = {

  products: [],

  categories: [],

  banners: [],

  lastVisible: null,

  loading: false,

  hasMore: true,

  search: "",

  filters: {

    category: "",

    brand: "",

    minPrice: 0,

    maxPrice: Infinity,

    rating: 0,

    availability: "",

    sort: "newest"

  }

};

/* ==========================================================================
   CATEGORY
   ========================================================================== */

export async function loadCategories() {

  const snap = await getDocs(

    query(

      collection(db, "categories"),

      orderBy("name")

    )

  );

  ShopState.categories =

    snap.docs.map(item => ({

      id: item.id,

      ...item.data()

    }));

  return ShopState.categories;

}

/* ==========================================================================
   BANNERS
   ========================================================================== */

export async function loadHeroBanners() {

  const snap = await getDocs(

    query(

      collection(db, "banners"),

      where("active", "==", true),

      orderBy("priority")

    )

  );

  ShopState.banners =

    snap.docs.map(item => ({

      id: item.id,

      ...item.data()

    }));

  return ShopState.banners;

}

/* ==========================================================================
   PRODUCTS
   ========================================================================== */

function productQuery(reset = false) {

  const rules = [];

  rules.push(

    where("active", "==", true)

  );

  switch (

    ShopState.filters.sort

  ) {

    case "lowest":

      rules.push(

        orderBy("price")

      );

      break;

    case "highest":

      rules.push(

        orderBy("price", "desc")

      );

      break;

    case "rating":

      rules.push(

        orderBy("rating", "desc")

      );

      break;

    case "popular":

      rules.push(

        orderBy("views", "desc")

      );

      break;

    case "selling":

      rules.push(

        orderBy("sold", "desc")

      );

      break;

    default:

      rules.push(

        orderBy("createdAt", "desc")

      );

  }

  rules.push(limit(20));

  if (

    !reset &&

    ShopState.lastVisible

  ) {

    rules.push(

      startAfter(

        ShopState.lastVisible

      )

    );

  }

  return query(

    collection(db, "products"),

    ...rules

  );

}

export async function loadProducts(

  reset = true

) {

  if (

    ShopState.loading

  ) return [];

  ShopState.loading = true;

  if (reset) {

    ShopState.products = [];

    ShopState.lastVisible = null;

    ShopState.hasMore = true;

  }

  const snapshot = await getDocs(
    productQuery(reset)
  );

  if (snapshot.empty) {

    ShopState.hasMore = false;

    ShopState.loading = false;

    return ShopState.products;

  }

  ShopState.lastVisible =
    snapshot.docs[
      snapshot.docs.length - 1
    ];

  const products = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  ShopState.products.push(...products);

  ShopState.loading = false;

  return ShopState.products;

}

/* ==========================================================================
   SINGLE PRODUCT
   ========================================================================== */

export async function getProduct(id) {

  const snapshot = await getDoc(
    doc(db, "products", id)
  );

  if (!snapshot.exists()) {

    throw new Error(
      "Product not found."
    );

  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };

}

/* ==========================================================================
   LIVE PRODUCTS
   ========================================================================== */

export function subscribeProducts(
  callback
) {

  return onSnapshot(
    productQuery(true),
    snap => {

      ShopState.products =
        snap.docs.map(item => ({
          id: item.id,
          ...item.data()
        }));

      callback(
        ShopState.products
      );

    }
  );

}

/* ==========================================================================
   SEARCH
   ========================================================================== */

export const searchProducts =
  debounce(keyword => {

    ShopState.search =
      keyword
        .trim()
        .toLowerCase();

    renderProducts();

  }, 250);

/* ==========================================================================
   FILTERS
   ========================================================================== */

export function setFilter(
  key,
  value
) {

  ShopState.filters[key] =
    value;

  renderProducts();

}

export function resetFilters() {

  ShopState.filters = {

    category: "",

    brand: "",

    minPrice: 0,

    maxPrice: Infinity,

    rating: 0,

    availability: "",

    sort: "newest"

  };

  renderProducts();

}

function filteredProducts() {

  return ShopState.products.filter(
    product => {

      if (
        ShopState.search &&
        !(
          product.name
            .toLowerCase()
            .includes(
              ShopState.search
            ) ||
          product.brand
            .toLowerCase()
            .includes(
              ShopState.search
            )
        )
      ) {

        return false;

      }

      if (
        ShopState.filters.category &&
        product.category !==
          ShopState.filters.category
      ) {

        return false;

      }

      if (
        ShopState.filters.brand &&
        product.brand !==
          ShopState.filters.brand
      ) {

        return false;

      }

      if (
        product.price <
          ShopState.filters.minPrice ||
        product.price >
          ShopState.filters.maxPrice
      ) {

        return false;

      }

      if (
        product.rating <
        ShopState.filters.rating
      ) {

        return false;

      }

      if (
        ShopState.filters.availability ===
          "stock" &&
        product.stock <= 0
      ) {

        return false;

      }

      return true;

    }
  );

}

/* ==========================================================================
   PRODUCT CARD
   ========================================================================== */

function badge(product) {

  if (product.stock <= 0) {

    return `<span class="product-badge soldout">
      Out of Stock
    </span>`;

  }

  if (
    product.comparePrice &&
    product.comparePrice > product.price
  ) {

    const discount = Math.round(
      (
        (product.comparePrice - product.price) /
        product.comparePrice
      ) * 100
    );

    return `
      <span class="product-badge discount">
        -${discount}%
      </span>
    `;

  }

  if (product.badge) {

    return `
      <span class="product-badge">
        ${product.badge}
      </span>
    `;

  }

  return "";

}

function ratingStars(value = 0) {

  let html = "";

  for (let i = 1; i <= 5; i++) {

    html += `
      <svg class="${
        i <= Math.round(value)
          ? "star-filled"
          : "star-empty"
      }">
        <use href="icons.svg#star"></use>
      </svg>
    `;

  }

  return html;

}

function productCard(product) {

  return `

  <article
    class="product-card"
    data-product="${product.id}">

    <div class="product-media">

      ${badge(product)}

      <img
        loading="lazy"
        src="${product.images[0]}"
        alt="${product.name}">

    </div>

    <div class="product-body">

      <div class="brand-name">

        ${product.brand}

      </div>

      <h3>

        ${product.name}

      </h3>

      <div class="rating-row">

        ${ratingStars(
          product.rating || 0
        )}

        <small>

          (${product.reviewCount || 0})

        </small>

      </div>

      <div class="price-row">

        <strong>

          ${money(product.price)}

        </strong>

        ${
          product.comparePrice
            ? `<del>${money(
                product.comparePrice
              )}</del>`
            : ""
        }

      </div>

      <button
        class="btn btn-primary add-cart"
        data-id="${product.id}">

        Add to Cart

      </button>

    </div>

  </article>

  `;

}

/* ==========================================================================
   RENDER
   ========================================================================== */

export function renderProducts() {

  const container =
    document.getElementById(
      "shopProducts"
    );

  if (!container) return;

  const items =
    filteredProducts();

  if (!items.length) {

    container.innerHTML = `

      <div class="state">

        <svg>
          <use href="icons.svg#search"></use>
        </svg>

        <h3>

          No products found

        </h3>

        <p>

          Try changing filters.

        </p>

      </div>

    `;

    return;

  }

  container.innerHTML =
    items
      .map(productCard)
      .join("");

}

/* ==========================================================================
   INIT
   ========================================================================== */

export async function initializeShop() {

  await Promise.all([
    loadCategories(),
    loadHeroBanners(),
    loadProducts(true)
  ]);

  renderProducts();

  toast(
    "Products loaded.",
    "success"
  );

}

