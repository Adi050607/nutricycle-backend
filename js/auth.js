/* ============================================================
   NutriCycle AI
   Authentication Manager
   Version 1.0
============================================================ */

import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* ============================================================
   AUTHENTICATION MANAGER
============================================================ */

class AuthManager {

    constructor() {

        this.currentUser = null;

    }


    /* ========================================================
       CREATE ACCOUNT
    ======================================================== */

    async signup(userData) {

        if (!userData) {

            throw new Error(
                "Signup data is required."
            );

        }

        const {
    name,
    email,
    password,

    phoneE164,
    phoneCountryCode,
    phoneVerified,

    profile,
    location,
    preferences,

    role,
    roleDetails
} = userData;


        if (!name || !email || !password) {

            throw new Error(
                "Name, email and password are required."
            );

        }


        if (!role) {

            throw new Error(
                "User role is required."
            );

        }


        /* ----------------------------------------------------
           CREATE FIREBASE AUTH ACCOUNT
        ---------------------------------------------------- */

        const credential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user = credential.user;


        /* ----------------------------------------------------
           CREATE FIRESTORE USER PROFILE
        ---------------------------------------------------- */

        const userProfile = {

    uid:
        user.uid,

    role:
        role,


    /* ======================================================
       IDENTITY
    ====================================================== */

    identity: {

        name:
            name || "",

        email:
            email || "",

        phoneE164:
            phoneE164 || "",

        phoneCountryCode:
            phoneCountryCode || "",

        phoneVerified:
            phoneVerified === true

    },


    /* ======================================================
       PROFILE
    ====================================================== */

    profile: {

        profileImage:
            profile?.profileImage || "",

        bio:
            profile?.bio || "",

        gender:
            profile?.gender || "",

        dateOfBirth:
            profile?.dateOfBirth || ""

    },


    /* ======================================================
       LOCATION
    ====================================================== */

    location: {

        countryCode:
            location?.countryCode || "",

        countryName:
            location?.countryName || "",

        administrativeArea:
            location?.administrativeArea || "",

        district:
            location?.district || "",

        municipalityOrCity:
            location?.municipalityOrCity || "",

        locality:
            location?.locality || "",

        postalCode:
            location?.postalCode || "",

        latitude:
            location?.latitude ?? null,

        longitude:
            location?.longitude ?? null,

        timezone:
            location?.timezone || ""

    },


    /* ======================================================
       PREFERENCES
    ====================================================== */

    preferences: {

        language:
            preferences?.language || "",

        currency:
            preferences?.currency || "",

        theme:
            preferences?.theme || "light"

    },


    /* ======================================================
       ROLE-SPECIFIC DATA
    ====================================================== */

    roleDetails:
        roleDetails || {},


    /* ======================================================
       VERIFICATION
    ====================================================== */

    verification: {

        status:
            "unverified",

        level:
            "basic"

    },


    /* ======================================================
       STATS
    ====================================================== */

    stats: {

        totalDonations:
            0,

        mealsServed:
            0,

        impactScore:
            0,

        carbonSaved:
            0,

        rewardPoints:
            0,

        xp:
            0,

        level:
            1

    },


    /* ======================================================
       ACCOUNT STATUS
    ====================================================== */

    status:
        "active",

    joinedOn:
        serverTimestamp(),

    lastLogin:
        serverTimestamp()

};


        await setDoc(

            doc(db, "users", user.uid),

            userProfile

        );


        this.currentUser = {

            ...userProfile,

            uid: user.uid

        };


        return user;

    }


    /* ========================================================
       LOGIN
    ======================================================== */

    async login(email, password) {

        if (!email || !password) {

            throw new Error(
                "Email and password are required."
            );

        }


        const credential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user = credential.user;


        const userRef =
            doc(db, "users", user.uid);


        const snapshot =
            await getDoc(userRef);


        if (!snapshot.exists()) {

            throw new Error(
                "User profile was not found."
            );

        }


        await updateDoc(

            userRef,

            {

                lastLogin:
                    serverTimestamp()

            }

        );


        this.currentUser = {

            uid: user.uid,

            ...snapshot.data()

        };


        return this.currentUser;

    }


    /* ========================================================
       LOGOUT
    ======================================================== */

    async logout() {

        await signOut(auth);

        this.currentUser = null;

        window.location.href =
            "login.html";

    }


    /* ========================================================
       AUTH STATE LISTENER
    ======================================================== */

    onUserChanged(callback) {

        if (typeof callback !== "function") {

            return;

        }


        return onAuthStateChanged(

            auth,

            async user => {

                if (!user) {

                    this.currentUser = null;

                    callback(null);

                    return;

                }


                try {

                    const snapshot =
                        await getDoc(
                            doc(
                                db,
                                "users",
                                user.uid
                            )
                        );


                    if (!snapshot.exists()) {

                        this.currentUser = null;

                        callback(null);

                        return;

                    }


                    this.currentUser = {

                        uid: user.uid,

                        ...snapshot.data()

                    };


                    callback(
                        this.currentUser
                    );

                }

                catch (error) {

                    console.error(
                        "Failed to load user profile:",
                        error
                    );

                    this.currentUser = null;

                    callback(null);

                }

            }

        );

    }


    /* ========================================================
       GET CURRENT USER
    ======================================================== */

    getCurrentUser() {

        return this.currentUser;

    }


    /* ========================================================
       REQUIRE LOGIN
    ======================================================== */

    requireLogin() {

        return onAuthStateChanged(

            auth,

            user => {

                if (!user) {

                    window.location.href =
                        "login.html";

                }

            }

        );

    }

}


/* ============================================================
   SINGLE AUTH INSTANCE
============================================================ */

const Auth =
    new AuthManager();


export default Auth;