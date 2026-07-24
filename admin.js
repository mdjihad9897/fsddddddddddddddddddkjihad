'use strict';


import {
    db,
    storage,
    auth,
    serverTimestamp
} from "./firebase-config.js";


import {

    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    orderBy,
    onSnapshot,
    where

} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";





/* =========================================================
ADMIN APP STATE
========================================================= */


const AdminState = {

    currentSection: "dashboard",

    editingProduct: null,

    editingCategory: null,

    editingBanner: null,

    editingCoupon: null,

    selectedChatUser: null,

    products: [],

    categories: [],

    orders: [],

    customers: []

};





/* =========================================================
SECTION ROUTER
========================================================= */


const menuItems =
document.querySelectorAll(
    ".menu-item"
);


const sections =
document.querySelectorAll(
    ".admin-section"
);



function openSection(sectionName){


    sections.forEach(section=>{


        section.classList.toggle(

            "active",

            section.id === sectionName

        );


    });



    menuItems.forEach(item=>{


        item.classList.toggle(

            "active",

            item.dataset.section === sectionName

        );


    });



    const title =
    document.getElementById(
        "pageTitle"
    );


    if(title){


        title.textContent =

        sectionName
        .charAt(0)
        .toUpperCase()
        +
        sectionName.slice(1);



    }



    AdminState.currentSection =
    sectionName;



    history.pushState(

        null,

        "",

        "#" + sectionName

    );


}




menuItems.forEach(item=>{


    item.addEventListener(

        "click",

        ()=>{


            openSection(

                item.dataset.section

            );


        }


    );


});




window.addEventListener(

"load",

()=>{


    const hash =
    location.hash.replace("#","");


    if(hash){

        openSection(hash);

    }


});


/* =========================================================
MOBILE MENU
========================================================= */


const mobileButton =
document.getElementById(
    "mobileMenuButton"
);



mobileButton?.addEventListener(

"click",

()=>{


    document
    .querySelector(
        ".admin-sidebar"
    )
    ?.classList.toggle(
        "open"
    );


});







/* =========================================================
AUTH CHECK
========================================================= */


auth.onAuthStateChanged(

async user=>{


    if(!user){


        window.location.href =
        "index.html";


        return;


    }




    const adminName =
    document.getElementById(
        "adminName"
    );


    const adminAvatar =
    document.getElementById(
        "adminAvatar"
    );



    if(adminName){


        adminName.textContent =

        user.displayName ||
        "Administrator";


    }



    if(adminAvatar && user.photoURL){


        adminAvatar.src =
        user.photoURL;


    }



}

);


/* =========================================================
PRODUCT MANAGEMENT
========================================================= */


const productForm =
document.getElementById(
    "productForm"
);


const productsTable =
document.getElementById(
    "productsTable"
);



const productImageLinks =
document.getElementById(
    "productImageLinks"
);



const addImageLink =
document.getElementById(
    "addImageLink"
);




addImageLink?.addEventListener(

"click",

()=>{


    const row =
    document.createElement(
        "div"
    );


    row.className =
    "link-row";



    row.innerHTML = `

<input
type="url"
class="image-link"
placeholder="https://image-url.com">


<button
type="button"
class="remove-link">

×

</button>

`;



    productImageLinks.appendChild(
        row
    );



});





productImageLinks?.addEventListener(

"click",

event=>{


    if(
        event.target.classList.contains(
            "remove-link"
        )
    ){


        event.target
        .parentElement
        .remove();


    }


}

);






async function loadProducts(){


    const snapshot =
    await getDocs(

        query(

            collection(
                db,
                "products"
            ),

            orderBy(
                "createdAt",
                "desc"
            )

        )

    );



    AdminState.products =

    snapshot.docs.map(item=>({


        id:item.id,

        ...item.data()


    }));




    renderProducts();



}





function renderProducts(){


    if(!productsTable)
    return;



    productsTable.innerHTML =

    AdminState.products

    .map(product=>`


<tr>


<td>


<img

src="${product.images?.[0] || ''}"

style="
width:55px;
height:55px;
object-fit:cover;
border-radius:10px;
">


</td>



<td>

${product.name}

<br>

<small>

${product.brand || ""}

</small>

</td>



<td>

৳${product.price}

</td>



<td>

${product.stock}

</td>



<td>

৳${product.deliveryCharge || 0}

</td>




<td>


<button

class="edit-product"

data-id="${product.id}">

Edit

</button>




<button

class="delete-product"

data-id="${product.id}">

Delete

</button>



</td>


</tr>


`)

.join("");



}







productForm?.addEventListener(

"submit",

async event=>{


event.preventDefault();




const images =

[
...
document.querySelectorAll(
".image-link"
)

]

.map(
input=>input.value.trim()
)

.filter(Boolean);





const productData = {


name:
productName.value.trim(),



brand:
productBrand.value.trim(),



category:
productCategory.value,



price:
Number(
productPrice.value
),



discountPrice:
Number(
productDiscount.value || 0
),



deliveryCharge:
Number(
productDeliveryCharge.value || 0
),



stock:
Number(
productStock.value
),



sku:
productSKU.value.trim(),



images,



description:
productDescription.value.trim(),



specifications:
productSpecifications.value.trim(),



updatedAt:
serverTimestamp()



};





if(
AdminState.editingProduct
){


await updateDoc(

doc(
db,
"products",
AdminState.editingProduct
),

productData

);



}
else{



await addDoc(

collection(
db,
"products"
),

{

...productData,


createdAt:
serverTimestamp()



}

);



}




productForm.reset();



AdminState.editingProduct =
null;



await loadProducts();



}

);






productsTable?.addEventListener(

"click",

async event=>{


const id =
event.target.dataset.id;



if(
event.target.classList.contains(
"delete-product"
)
){



await deleteDoc(

doc(
db,
"products",
id
)

);



await loadProducts();



}




if(
event.target.classList.contains(
"edit-product"
)
){



const product =

AdminState.products.find(

item=>

item.id===id

);



if(!product)
return;



AdminState.editingProduct =
id;



productName.value =
product.name;



productBrand.value =
product.brand || "";



productCategory.value =
product.category || "";



productPrice.value =
product.price;



productDiscount.value =
product.discountPrice || 0;



productDeliveryCharge.value =
product.deliveryCharge || 0;



productStock.value =
product.stock;



productSKU.value =
product.sku || "";



productDescription.value =
product.description || "";



productSpecifications.value =
product.specifications || "";




productImageLinks.innerHTML =

(product.images || [])

.map(image=>`

<div class="link-row">


<input
type="url"
class="image-link"
value="${image}">


<button
type="button"
class="remove-link">

×

</button>


</div>

`)

.join("");



}



}

);




loadProducts();


/* =========================================================
CATEGORY MANAGEMENT
========================================================= */


const categoryForm =
document.getElementById(
    "categoryForm"
);


const categoryList =
document.getElementById(
    "categoryList"
);



async function loadCategories(){


    const snapshot =
    await getDocs(

        query(

            collection(
                db,
                "categories"
            ),

            orderBy(
                "createdAt",
                "desc"
            )

        )

    );



    AdminState.categories =

    snapshot.docs.map(item=>({


        id:item.id,

        ...item.data()


    }));



    renderCategories();



    populateCategorySelect();


}







function renderCategories(){


    if(!categoryList)
    return;



    categoryList.innerHTML =

    AdminState.categories

    .map(category=>`


<div class="category-card">


<img

src="${category.image || ''}"

alt="${category.name}"

>



<h3>

${category.name}

</h3>



<div>


<button

class="edit-category"

data-id="${category.id}">

Edit

</button>



<button

class="delete-category"

data-id="${category.id}">

Delete

</button>



</div>


</div>



`)

.join("");



}






function populateCategorySelect(){


const select =
document.getElementById(
"productCategory"
);



if(!select)
return;



select.innerHTML =

`

<option value="">

Select Category

</option>

`

+

AdminState.categories

.map(category=>`


<option

value="${category.name}">

${category.name}

</option>


`)

.join("");



}





categoryForm?.addEventListener(

"submit",

async event=>{


event.preventDefault();



const id =
document.getElementById(
"categoryId"
).value;



const data = {


name:

document.getElementById(
"categoryName"
).value.trim(),



image:

document.getElementById(
"categoryImage"
).value.trim(),



updatedAt:
serverTimestamp()



};





if(id){


await updateDoc(

doc(
db,
"categories",
id
),

data

);



}
else{



await addDoc(

collection(
db,
"categories"
),

{

...data,


createdAt:
serverTimestamp()


}

);



}





categoryForm.reset();



await loadCategories();



}

);








categoryList?.addEventListener(

"click",

async event=>{


const id =
event.target.dataset.id;




if(
event.target.classList.contains(
"delete-category"
)
){



await deleteDoc(

doc(
db,
"categories",
id
)

);



await loadCategories();



}






if(
event.target.classList.contains(
"edit-category"
)
){



const category =

AdminState.categories.find(

item=>

item.id===id

);



if(!category)
return;



document.getElementById(
"categoryId"
).value =
category.id;



document.getElementById(
"categoryName"
).value =
category.name;



document.getElementById(
"categoryImage"
).value =
category.image || "";



}



}

);







/* =========================================================
BANNER MANAGEMENT
========================================================= */


const bannerForm =
document.getElementById(
"bannerForm"
);



const bannerList =
document.getElementById(
"bannerList"
);






async function loadBanners(){


const snapshot =
await getDocs(

query(

collection(
db,
"banners"
),

orderBy(
"priority",
"asc"
)

)

);



const banners =

snapshot.docs.map(item=>({


id:item.id,

...item.data()


}));




if(!bannerList)
return;



bannerList.innerHTML =

banners.map(banner=>`


<div class="banner-card">


<img

src="${banner.image}"

>



<h3>

${banner.title}

</h3>



<button

class="delete-banner"

data-id="${banner.id}">

Delete

</button>


</div>


`)

.join("");




}



bannerForm?.addEventListener(

"submit",

async event=>{


event.preventDefault();



const data = {


title:

bannerTitle.value.trim(),



image:

bannerImage.value.trim(),



buttonText:

bannerButtonText.value.trim(),



buttonLink:

bannerButtonLink.value.trim(),



priority:

Number(
bannerPriority.value || 1
),



updatedAt:
serverTimestamp()



};




await addDoc(

collection(
db,
"banners"
),

{

...data,


createdAt:
serverTimestamp()


}

);




bannerForm.reset();



loadBanners();



});


/* =========================================================
COUPON MANAGEMENT
========================================================= */


const couponForm =
document.getElementById(
    "couponForm"
);


const couponList =
document.getElementById(
    "couponList"
);




async function loadCoupons(){


const snapshot =

await getDocs(

query(

collection(
db,
"coupons"
),

orderBy(
"createdAt",
"desc"
)

)

);



const coupons =

snapshot.docs.map(item=>({


id:item.id,

...item.data()


}));




if(!couponList)
return;



couponList.innerHTML =


coupons.map(coupon=>`


<div class="coupon-card">


<h3>

${coupon.code}

</h3>


<p>

${coupon.type}

:
${coupon.value}

</p>



<p>

Expiry:
${coupon.expiry}

</p>



<button

class="delete-coupon"

data-id="${coupon.id}">

Delete

</button>



</div>


`)

.join("");



}





couponForm?.addEventListener(

"submit",

async event=>{


event.preventDefault();




const data = {


code:

couponCode.value
.trim()
.toUpperCase(),



type:

couponType.value,



value:

Number(
couponValue.value
),



expiry:

couponExpiry.value,



active:true,



createdAt:
serverTimestamp()



};




await addDoc(

collection(
db,
"coupons"
),

data

);



couponForm.reset();



loadCoupons();



});







/* =========================================================
ORDER MANAGEMENT
========================================================= */


const ordersTable =
document.getElementById(
"ordersTable"
);





async function loadOrders(){


const snapshot =

await getDocs(

query(

collection(
db,
"orders"
),

orderBy(
"createdAt",
"desc"
)

)

);





AdminState.orders =


snapshot.docs.map(item=>({


id:item.id,

...item.data()


}));





renderOrders();



}





function renderOrders(){


if(!ordersTable)
return;




ordersTable.innerHTML =


AdminState.orders.map(order=>`


<tr>


<td>

${order.id}

</td>



<td>

${order.customer?.name || ""}

<br>

${order.customer?.phone || ""}

</td>



<td>

৳${order.total || 0}

</td>



<td>

${order.paymentMethod || ""}

</td>



<td>

${order.deliveryStatus || ""}

</td>



<td>


<select

class="order-status"

data-id="${order.id}">


<option

${order.status==="Pending"?"selected":""}>

Pending

</option>



<option

${order.status==="Processing"?"selected":""}>

Processing

</option>



<option

${order.status==="Shipped"?"selected":""}>

Shipped

</option>



<option

${order.status==="Delivered"?"selected":""}>

Delivered

</option>



<option

${order.status==="Cancelled"?"selected":""}>

Cancelled

</option>


</select>


</td>



<td>

<button

class="view-order"

data-id="${order.id}">

View

</button>


</td>


</tr>


`)

.join("");



}






ordersTable?.addEventListener(

"change",

async event=>{


if(
event.target.classList.contains(
"order-status"
)
){


await updateDoc(

doc(

db,

"orders",

event.target.dataset.id

),

{


status:

event.target.value,


updatedAt:

serverTimestamp()


}

);



}



}

);







/* =========================================================
CUSTOMERS MANAGEMENT
========================================================= */


const customersTable =
document.getElementById(
"customersTable"
);




async function loadCustomers(){


const snapshot =

await getDocs(

collection(
db,
"users"
)

);



AdminState.customers =


snapshot.docs.map(item=>({


id:item.id,

...item.data()


}));





if(!customersTable)
return;




customersTable.innerHTML =


AdminState.customers.map(user=>`


<tr>


<td>

${user.name || "Customer"}

</td>


<td>

${user.phone || ""}

</td>



<td>

${user.email || ""}

</td>



<td>

${user.orderCount || 0}

</td>



<td>


<button>

Details

</button>


</td>


</tr>


`)

.join("");



}


/* =========================================================
INVENTORY MANAGEMENT
========================================================= */


const inventoryTable =
document.getElementById(
    "inventoryTable"
);



function renderInventory(){


if(!inventoryTable)
return;



inventoryTable.innerHTML =


AdminState.products.map(product=>`


<tr>


<td>

${product.name}

</td>



<td>

${product.stock}

</td>



<td>


<input

class="stock-input"

type="number"

min="0"

value="${product.stock}"

data-id="${product.id}">


</td>



<td>


<span class="stock-status">


${product.stock > 10

? "Available"

:

product.stock > 0

? "Low Stock"

:

"Out Of Stock"


}


</span>


</td>




<td>


<button

class="update-stock"

data-id="${product.id}">


Update

</button>


</td>


</tr>


`)

.join("");



}





inventoryTable?.addEventListener(

"click",

async event=>{


if(
event.target.classList.contains(
"update-stock"
)
){



const id =
event.target.dataset.id;



const input =
document.querySelector(

`.stock-input[data-id="${id}"]`

);



await updateDoc(

doc(

db,

"products",

id

),

{


stock:

Number(
input.value
),


updatedAt:

serverTimestamp()


}

);



loadProducts();



}



}

);








/* =========================================================
LIVE CHAT MANAGEMENT
========================================================= */


const chatUsers =
document.getElementById(
"chatUsers"
);



const adminChatMessages =
document.getElementById(
"adminChatMessages"
);



const adminChatForm =
document.getElementById(
"adminChatForm"
);




async function loadChatUsers(){



const snapshot =

await getDocs(

collection(
db,
"chats"
)

);



if(!chatUsers)
return;



chatUsers.innerHTML =



snapshot.docs.map(chat=>`


<button

class="chat-user"

data-id="${chat.id}">


${chat.data().userName || "Customer"}


</button>


`)

.join("");



}






chatUsers?.addEventListener(

"click",

event=>{


if(
event.target.classList.contains(
"chat-user"
)
){



AdminState.selectedChatUser =

event.target.dataset.id;



loadChatMessages();



}



}

);







async function loadChatMessages(){


if(
!AdminState.selectedChatUser
)

return;




const snapshot =

await getDocs(

query(

collection(

db,

"chats",

AdminState.selectedChatUser,

"messages"

),

orderBy(
"createdAt",
"asc"
)

)

);





if(!adminChatMessages)
return;




adminChatMessages.innerHTML =



snapshot.docs.map(message=>`


<div class="chat-message">


${message.data().text}


</div>


`)

.join("");



}






adminChatForm?.addEventListener(

"submit",

async event=>{


event.preventDefault();




if(
!AdminState.selectedChatUser
)

return;




const input =
document.getElementById(
"adminChatInput"
);




const text =
input.value.trim();




if(!text)
return;





await addDoc(

collection(

db,

"chats",

AdminState.selectedChatUser,

"messages"

),

{


text,


sender:

"admin",


createdAt:

serverTimestamp()


}

);




input.value="";



loadChatMessages();



});






/* =========================================================
ANALYTICS DATA
========================================================= */


async function loadAnalytics(){


const orders =
AdminState.orders;



const revenue =


orders.reduce(

(total,order)=>

total +

Number(
order.total || 0
),

0

);





const revenueElement =

document.getElementById(
"revenueCount"
);



const orderElement =

document.getElementById(
"orderCount"
);



const customerElement =

document.getElementById(
"customerCount"
);



const productElement =

document.getElementById(
"productCount"
);





if(revenueElement)

revenueElement.textContent =

"৳" + revenue;



if(orderElement)

orderElement.textContent =

orders.length;



if(customerElement)

customerElement.textContent =

AdminState.customers.length;



if(productElement)

productElement.textContent =

AdminState.products.length;



}




/* =========================================================
SYSTEM SETTINGS
========================================================= */


const settingsForm =
document.getElementById(
    "settingsForm"
);




async function loadSettings(){


const snapshot =

await getDoc(

doc(

db,

"settings",

"store"

)

);





if(
!snapshot.exists()
)

return;




const settings =
snapshot.data();




document.getElementById(
"storeName"
).value =

settings.storeName || "";



document.getElementById(
"supportPhone"
).value =

settings.supportPhone || "";



document.getElementById(
"supportEmail"
).value =

settings.supportEmail || "";



document.getElementById(
"bkashNumber"
).value =

settings.bkashNumber || "";



document.getElementById(
"nagadNumber"
).value =

settings.nagadNumber || "";



}







settingsForm?.addEventListener(

"submit",

async event=>{


event.preventDefault();



await updateDoc(

doc(

db,

"settings",

"store"

),

{


storeName:

storeName.value.trim(),



supportPhone:

supportPhone.value.trim(),



supportEmail:

supportEmail.value.trim(),



bkashNumber:

bkashNumber.value.trim(),



nagadNumber:

nagadNumber.value.trim(),



updatedAt:

serverTimestamp()


}

);



});









/* =========================================================
DASHBOARD DATA REAL TIME
========================================================= */


function startRealtimeDashboard(){


onSnapshot(

collection(
db,
"orders"
),

snapshot=>{


AdminState.orders =


snapshot.docs.map(item=>({


id:item.id,


...item.data()


}));



loadAnalytics();



renderOrders();



}

);





onSnapshot(

collection(
db,
"users"
),

snapshot=>{


AdminState.customers =


snapshot.docs.map(item=>({


id:item.id,


...item.data()


}));



loadAnalytics();



renderCustomers();



}

);



onSnapshot(

collection(
db,
"products"
),

snapshot=>{


AdminState.products =


snapshot.docs.map(item=>({


id:item.id,


...item.data()


}));



renderProducts();



renderInventory();



loadAnalytics();



}

);



}





function renderCustomers(){


if(!customersTable)

return;




customersTable.innerHTML =



AdminState.customers.map(user=>`


<tr>


<td>

${user.name || "Customer"}

</td>



<td>

${user.phone || "-"}

</td>



<td>

${user.email || "-"}

</td>



<td>

${user.orderCount || 0}

</td>



<td>

<button

data-user="${user.id}">

View

</button>

</td>


</tr>


`)

.join("");



}








/* =========================================================
BANNER DELETE
========================================================= */


bannerList?.addEventListener(

"click",

async event=>{


if(
event.target.classList.contains(
"delete-banner"
)
){


await deleteDoc(

doc(

db,

"banners",

event.target.dataset.id

)

);



loadBanners();



}



}

);







/* =========================================================
COUPON DELETE
========================================================= */


couponList?.addEventListener(

"click",

async event=>{


if(
event.target.classList.contains(
"delete-coupon"
)
){



await deleteDoc(

doc(

db,

"coupons",

event.target.dataset.id

)

);



loadCoupons();



}


}

);







/* =========================================================
INITIALIZE ADMIN APPLICATION
========================================================= */


async function initializeAdmin(){



await Promise.all([


loadProducts(),


loadCategories(),


loadBanners(),


loadCoupons(),


loadOrders(),


loadCustomers(),


loadChatUsers(),


loadSettings()


]);



startRealtimeDashboard();



}




initializeAdmin()

.catch(error=>{


console.error(

"Admin initialization error:",

error

);



});
