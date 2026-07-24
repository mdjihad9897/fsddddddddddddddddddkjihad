/**
 * firebase-config.js
 * Firebase SDK v12.x (ES Modules)
 */


import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";



import {
    getAuth,
    setPersistence,
    browserLocalPersistence,
    connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";



import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    CACHE_SIZE_UNLIMITED,
    enableNetwork,
    disableNetwork,
    connectFirestoreEmulator,
    serverTimestamp,
    Timestamp,
    GeoPoint,
    Bytes,
    documentId
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";



import {
    getStorage,
    connectStorageEmulator
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";





/* Firebase Configuration */

const firebaseConfig = {


    apiKey: "AIzaSyDPT3fRRT8m_zHlpEfo3wuuWe2NRsHHUqs",

    authDomain: "jihad-4b833.firebaseapp.com",

    databaseURL:
    "https://jihad-4b833-default-rtdb.firebaseio.com",

    projectId: "jihad-4b833",

    storageBucket:
    "jihad-4b833.firebasestorage.app",

    messagingSenderId:
    "668587419972",

    appId:
    "1:668587419972:web:56e7ceb7bfc7a69af7cf11"

};





/* Initialize App */


const app =

getApps().length

?

getApps()[0]

:

initializeApp(firebaseConfig);







/* Authentication */


const auth =
getAuth(app);



await setPersistence(
    auth,
    browserLocalPersistence
);






/* Firestore */


const db =

initializeFirestore(

    app,

    {

        cache:

        persistentLocalCache({

            tabManager:

            persistentMultipleTabManager()

        }),

        cacheSizeBytes:

        CACHE_SIZE_UNLIMITED,

        ignoreUndefinedProperties:true

    }

);







/* Storage */


const storage =
getStorage(app);







/* Emulator */

const isLocal =

location.hostname === "localhost" ||

location.hostname === "127.0.0.1";



const USE_EMULATOR = false;



if(isLocal && USE_EMULATOR){


connectAuthEmulator(

    auth,

    "http://127.0.0.1:9099",

    {

        disableWarnings:true

    }

);



connectFirestoreEmulator(

    db,

    "127.0.0.1",

    8080

);



connectStorageEmulator(

    storage,

    "127.0.0.1",

    9199

);


}







/* Network */


async function goOffline(){

    try{

        await disableNetwork(db);

        return true;

    }

    catch(error){

        console.error(error);

        return false;

    }

}





async function goOnline(){

    try{

        await enableNetwork(db);

        return true;

    }

    catch(error){

        console.error(error);

        return false;

    }

}







/* Validation */


function firebaseReady(){


return Boolean(

firebaseConfig.apiKey &&

firebaseConfig.projectId &&

firebaseConfig.appId

);


}








export {


app,

auth,

db,

storage,

firebaseConfig,

firebaseReady,

goOffline,

goOnline,

serverTimestamp,

Timestamp,

GeoPoint,

Bytes,

documentId


};