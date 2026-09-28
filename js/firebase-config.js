/* ============================================================
   NutriCycle AI
   Firebase Configuration
   Version 1.0
============================================================ */

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getStorage } from
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


/* ============================================================
   FIREBASE CONFIGURATION
============================================================ */

const firebaseConfig = {

    apiKey: "AIzaSyCxSbspKP--jU0Jv5-Qycbrjz_mzjqoylg",

    authDomain: "nutricycle-ai.firebaseapp.com",

    databaseURL:
        "https://nutricycle-ai-default-rtdb.asia-southeast1.firebasedatabase.app",

    projectId: "nutricycle-ai",

    storageBucket:
        "nutricycle-ai.firebasestorage.app",

    messagingSenderId:
        "771381950455",

    appId:
        "1:771381950455:web:5c37b0d517300bcfbc20f2"

};


/* ============================================================
   INITIALIZE FIREBASE
============================================================ */

const app = initializeApp(firebaseConfig);


/* ============================================================
   FIREBASE SERVICES
============================================================ */

const auth = getAuth(app);

const db = getFirestore(app);

const storage = getStorage(app);


/* ============================================================
   EXPORT SERVICES
============================================================ */

export {

    app,

    auth,

    db,

    storage

};