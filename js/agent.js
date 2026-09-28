"use strict";

/* ==========================================================
   NutriCycle AI
   DELIVERY AGENT DASHBOARD
   FIRESTORE DELIVERY PIPELINE
========================================================== */

import Auth from "./auth.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp
}
from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    db
}
from "./firebase-config.js";


/* ==========================================================
   DOM
========================================================== */

const container =
    document.getElementById(
        "requestContainer"
    );

const agentNameElement =
    document.getElementById(
        "agentName"
    );

const welcomeElement =
    document.getElementById(
        "welcomeText"
    );

const profileNameElement =
    document.getElementById(
        "profileName"
    );

const profileEmailElement =
    document.getElementById(
        "profileEmail"
    );
    const quickAcceptPickupButton =
    document.getElementById(
        "quickAcceptPickupButton"
    );


/* ==========================================================
   STATE
========================================================== */

const state = {

    user:
        null,

    profile:
        null,

    unsubscribe:
        null

};


/* ==========================================================
   NORMALIZE
========================================================== */

function normalize(
    value
) {

    return String(
        value || ""
    )
    .trim()
    .toLowerCase();

}


/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(
    value
) {

    return String(
        value || ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* ==========================================================
   GET CURRENT AGENT PROFILE
========================================================== */

async function loadAgentProfile(
    firebaseUser
) {

    if (
        !firebaseUser
    ) {

        return null;

    }


    try {

        const snapshot =
            await getDoc(

                doc(
                    db,
                    "users",
                    firebaseUser.uid
                )

            );


        if (
            !snapshot.exists()
        ) {

            console.error(

                "NutriCycle AI — Agent profile not found."

            );


            return null;

        }


        return {

            uid:
                firebaseUser.uid,

            email:
                firebaseUser.email ||
                "",

            ...snapshot.data()

        };

    }

    catch (error) {

        console.error(

            "NutriCycle AI — Failed to load agent profile:",

            error

        );


        return null;

    }

}


/* ==========================================================
   UPDATE AGENT UI
========================================================== */

function updateAgentUI() {

    const profile =
        state.profile;


    if (!profile) {

        return;

    }


    const name =
        profile.name ||
        "Delivery Agent";


    if (
        agentNameElement
    ) {

        agentNameElement.innerText =
            name;

    }


    if (
        welcomeElement
    ) {

        welcomeElement.innerText =
            `Welcome, ${name} 👋`;

    }


    if (
        profileNameElement
    ) {

        profileNameElement.innerText =
            name;

    }


    if (
        profileEmailElement
    ) {

        profileEmailElement.innerText =
            profile.email ||
            state.user?.email ||
            "Unknown";

    }


    console.log(

        "NutriCycle AI — Agent profile:",

        {

            uid:
                profile.uid,

            name:
                name,

            vehicle:
                profile.roleDetails?.vehicleType ||
                "Not specified",

            license:
                profile.roleDetails?.licenseNumber ||
                "Not specified"

        }

    );

}


/* ==========================================================
   CHECK AGENT ROLE
========================================================== */

function isAgent() {

    return (

        normalize(
            state.profile?.role
        ) ===
        "agent"

    );

}


/* ==========================================================
   BUILD PICKUP QUERY
========================================================== */

function startPickupListener() {

    if (
        state.unsubscribe
    ) {

        state.unsubscribe();

        state.unsubscribe =
            null;

    }


    if (
        !isAgent()
    ) {

        showMessage(
            "This dashboard is only available to delivery agents."
        );


        return;

    }


    /*
     * Only NGO-approved donations should appear.
     */

    const pickupQuery =

        query(

            collection(
                db,
                "donations"
            ),

            where(
                "status",
                "==",
                "Awaiting Driver"
            )

        );


    state.unsubscribe =

        onSnapshot(

            pickupQuery,

            snapshot => {

                renderPickupRequests(
                    snapshot
                );

            },

            error => {

                console.error(

                    "NutriCycle AI — Pickup feed failed:",

                    error

                );


                showMessage(

                    "Unable to load pickup requests. Check your Firestore rules."

                );

            }

        );

}


/* ==========================================================
   SHOW MESSAGE
========================================================== */

function showMessage(
    message
) {

    if (
        !container
    ) {

        return;

    }


    container.innerHTML = `

        <div
            style="
                padding:20px;
                text-align:center;
                color:#667085;
            "
        >
            ${escapeHTML(message)}
        </div>

    `;

}


/* ==========================================================
   RENDER PICKUP REQUESTS
========================================================== */

function renderPickupRequests(
    snapshot
) {

    if (
        !container
    ) {

        return;

    }


    container.innerHTML =
        "";


    if (
        snapshot.empty
    ) {

        showMessage(
            "No available pickups"
        );


        return;

    }


    snapshot.forEach(

        documentSnapshot => {

            const data =
                documentSnapshot.data();


            const card =
    document.createElement(
        "div"
    );


card.className =
    "pickup-request-card";


            const foodName =
                escapeHTML(
                    data.foodName ||
                    "Food Donation"
                );


            const quantity =
                escapeHTML(
                    data.quantity ??
                    "—"
                );


            const unit =
                escapeHTML(
                    data.unit ||
                    ""
                );


            const donorName =
                escapeHTML(
                    data.donorName ||
                    "Food Donor"
                );


            const donorAddress =
                escapeHTML(
                    data.donorAddress ||
                    "Address unavailable"
                );


            const ngoName =
                escapeHTML(
                    data.acceptedByNGO ||
                    data.assignment?.ngo ||
                    "NGO"
                );


            card.innerHTML = `

                <p>
                    🍱
                    <strong>
                        ${foodName}
                    </strong>
                </p>

                <p>
                    ⚖
                    ${quantity}
                    ${unit}
                </p>

                <p>
                    👤
                    ${donorName}
                </p>

                <p>
                    📍
                    ${donorAddress}
                </p>

                <p>
                    🏢
                    ${ngoName}
                </p>

                <button
    type="button"
    class="accept-pickup-button"
>
    <i class="fa-solid fa-hand-pointer"></i>
    Accept Pickup
</button>

            `;


            const button =
                card.querySelector(
                    ".accept-pickup-button"
                );


            button?.addEventListener(

                "click",

                () => {

                    acceptPickup(
                        documentSnapshot.id,
                        data,
                        button
                    );

                }

            );


            container.appendChild(
                card
            );

        }

    );

}


/* ==========================================================
   ACCEPT PICKUP
========================================================== */

async function acceptPickup(
    donationId,
    donation,
    button
) {

    if (
        !state.user ||
        !state.profile
    ) {

        alert(
            "Agent account is not ready."
        );

        return;

    }


    const agentName =
        state.profile.name ||
        "Delivery Agent";


    const vehicleType =
        state.profile
            ?.roleDetails
            ?.vehicleType ||
        "Not specified";


    const licenseNumber =
        state.profile
            ?.roleDetails
            ?.licenseNumber ||
        "Not specified";


    /* ================================
       BUTTON LOADING STATE
    ================================= */

    if (button) {

        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Assigning Pickup...
        `;

    }


    try {

        await updateDoc(

            doc(
                db,
                "donations",
                donationId
            ),

            {

                assignedDriver:
                    agentName,

                assignedDriverUid:
                    state.user.uid,

                driverEmail:
                    state.user.email || "",

                vehicleType:
                    vehicleType,

                vehicleNumber:
                    licenseNumber,

                driverAssignedAt:
                    serverTimestamp(),

                status:
                    "Driver Assigned",

                updatedAt:
                    serverTimestamp()

            }

        );


        /* ================================
           SUCCESS STATE
        ================================= */

        if (button) {

            button.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                Pickup Accepted
            `;

            button.style.background =
                "linear-gradient(135deg,#0ca84f,#087a3a)";

        }


        console.log(
            "NutriCycle AI — Pickup accepted:",
            donationId
        );


        alert(
            "Pickup accepted successfully."
        );

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Pickup acceptance failed:",
            error
        );


        /* ================================
           ERROR STATE
        ================================= */

        if (button) {

            button.disabled = false;

            button.innerHTML = `
                <i class="fa-solid fa-rotate-right"></i>
                Try Again
            `;

        }


        alert(
            "Unable to accept this pickup. " +
            "The donation may already have been accepted."
        );

    }

}


/* ==========================================================
   LOGOUT
========================================================== */

async function logout() {

    try {

        await Auth.logout();

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Logout failed:",
            error
        );

    }

}


/* ==========================================================
   PROFILE
========================================================== */

function openProfile() {

    const modal =
        document.getElementById(
            "profileModal"
        );


    if (
        modal
    ) {

        modal.style.display =
            "flex";

    }


    updateAgentUI();

}


function closeProfile() {

    const modal =
        document.getElementById(
            "profileModal"
        );


    if (
        modal
    ) {

        modal.style.display =
            "none";

    }

}


/* ==========================================================
   SETTINGS
========================================================== */

function openSettings() {

    const modal =
        document.getElementById(
            "settingsModal"
        );


    if (
        modal
    ) {

        modal.style.display =
            "flex";

    }

}


function closeSettings() {

    const modal =
        document.getElementById(
            "settingsModal"
        );


    if (
        modal
    ) {

        modal.style.display =
            "none";

    }

}


/* ==========================================================
   GLOBAL FUNCTIONS
========================================================== */

window.logout =
    logout;

window.openProfile =
    openProfile;

window.closeProfile =
    closeProfile;

window.openSettings =
    openSettings;

window.closeSettings =
    closeSettings;


/* ==========================================================
   AUTH INITIALIZATION
========================================================== */

function initializeAuthentication() {

    Auth.onUserChanged(

        async user => {

            if (
                !user
            ) {

                window.location.href =
                    "login.html";

                return;

            }


            state.user =
                user;


            /*
             * Auth.onUserChanged already returns
             * the Firestore profile.
             *
             * Use that first.
             */

            state.profile =
                user;


            if (
                normalize(
                    user.role
                ) !==
                "agent"
            ) {

                alert(
                    "This dashboard is restricted to delivery agents."
                );


                await Auth.logout();


                return;

            }


            updateAgentUI();

            startPickupListener();


            console.log(

                "NutriCycle AI — Delivery Agent authenticated:",

                {

                    uid:
                        user.uid,

                    name:
                        user.name,

                    role:
                        user.role

                }

            );

        }

    );

}


/* ==========================================================
   START
========================================================== */

function initialize() {

    initializeAuthentication();
    initializeQuickActions();
}

/* ==========================================================
   QUICK ACTION — ACCEPT PICKUP
========================================================== */

function initializeQuickActions() {

    quickAcceptPickupButton?.addEventListener(

        "click",

        () => {

           const requestSection =
    document.getElementById(
        "pickupRequestsSection"
    );


            if (
                requestSection
            ) {

                requestSection.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "center"

                });

                return;

            }


            alert(
                "Pickup requests are not available right now."
            );

        }

    );

}

document.addEventListener(

    "DOMContentLoaded",

    initialize,

    {
        once:
            true
    }

);