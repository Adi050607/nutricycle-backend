/* ============================================================
   NutriCycle AI
   Donor Dashboard
   Firebase-first replacement
   Version 3.0
============================================================ */

"use strict";

import Auth from "./auth.js";

import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "./firebase-config.js";


/* ============================================================
   APPLICATION STATE
============================================================ */

const app = {
    currentUser: null,
    donations: [],
    activePage: "dashboard",
    donationUnsubscribe: null
};


/* ============================================================
   DOM CACHE
============================================================ */

const ui = {
    userName: document.getElementById("userName"),
    totalDonations: document.getElementById("totalDonations"),
    mealsServed: document.getElementById("mealsServed"),
    co2Saved: document.getElementById("co2Saved"),
    rewardPoints: document.getElementById("rewardPoints"),

    summaryUserName: document.getElementById("summaryUserName"),
    summaryEmail: document.getElementById("summaryEmail"),
    summaryPhone: document.getElementById("summaryPhone"),
    summaryRole: document.getElementById("summaryRole"),

    createDonationButton:
        document.getElementById("createDonationButton"),

    startDonationButton:
        document.getElementById("startDonationButton"),

    notificationButton:
        document.getElementById("notificationButton"),

    profileButton:
        document.getElementById("profileButton"),

    logoutButton:
        document.getElementById("logoutButton"),

    sidebarButtons:
        document.querySelectorAll(".menu"),

    loadingScreen:
        document.getElementById("loadingScreen"),

    recentDonationsContainer:
        document.getElementById("recentDonationsContainer"),

    rewardCount:
        document.getElementById("rewardCount"),

    badgeCount:
        document.getElementById("badgeCount"),

    levelText:
        document.getElementById("levelText"),

    donorTrackingStatus:
        document.getElementById("donorTrackingStatus"),

    donorTrackingMessage:
        document.getElementById("donorTrackingMessage"),

    donorTrackingVehicle:
        document.getElementById("donorTrackingVehicle"),

    donorVehicle:
        document.getElementById("donorVehicle"),

    donorDriver:
        document.getElementById("donorDriver"),

    donorNGO:
        document.getElementById("donorNGO"),

    donorETA:
        document.getElementById("donorETA"),

    donorDistance:
        document.getElementById("donorDistance"),

    donorGPSAccuracy:
        document.getElementById("donorGPSAccuracy"),

    trackingMap:
        document.getElementById("trackingMap"),

    recenterTrackingButton:
        document.getElementById("recenterTrackingButton"),

    refreshTrackingButton:
        document.getElementById("refreshTrackingButton")
};


/* ============================================================
   LOCAL STORAGE COMPATIBILITY
   IMPORTANT:
   localStorage is NOT used for authentication.
============================================================ */

const STORAGE = {
    CURRENT_USER: "nutricycle_current_user",
    DONATIONS: "nutricycle_donations"
};


function safeReadJSON(key, fallback) {

    try {

        const raw =
            localStorage.getItem(key);

        if (!raw) {

            return fallback;

        }

        const parsed =
            JSON.parse(raw);

        return parsed ?? fallback;

    }

    catch (error) {

        console.warn(
            "NutriCycle AI — Local storage read failed:",
            key,
            error
        );

        return fallback;

    }

}


function safeWriteJSON(key, value) {

    try {

        localStorage.setItem(

            key,

            JSON.stringify(value)

        );

    }

    catch (error) {

        console.warn(
            "NutriCycle AI — Local storage write failed:",
            key,
            error
        );

    }

}


/* ============================================================
   LOADING
============================================================ */

function showLoading() {

    ui.loadingScreen
        ?.classList
        .add("active");

}


function hideLoading() {

    ui.loadingScreen
        ?.classList
        .remove("active");

}


/* ============================================================
   FIREBASE PROFILE NORMALIZATION
============================================================ */

function normalizeUser(
    firebaseProfile
) {

    if (!firebaseProfile) {

        return null;

    }


    const identity =
        firebaseProfile.identity || {};


    const stats =
        firebaseProfile.stats || {};


    return {

        ...firebaseProfile,


        uid:
            firebaseProfile.uid || "",


        fullName:
            identity.name ||
            firebaseProfile.fullName ||
            firebaseProfile.name ||
            "User",


        email:
            identity.email ||
            firebaseProfile.email ||
            "",


        phone:
            identity.phoneE164 ||
            firebaseProfile.phone ||
            "",


        role:
            firebaseProfile.role ||
            "donor",


        totalDonations:
            stats.totalDonations ??
            firebaseProfile.totalDonations ??
            0,


        mealsServed:
            stats.mealsServed ??
            firebaseProfile.mealsServed ??
            0,


        co2Saved:
            stats.carbonSaved ??
            stats.co2Saved ??
            firebaseProfile.co2Saved ??
            0,


        rewardPoints:
            stats.rewardPoints ??
            firebaseProfile.rewardPoints ??
            0

    };

}


/* ============================================================
   AUTHENTICATION
   Firebase Auth is the source of truth.
============================================================ */

async function authenticateUser() {

    return new Promise(
        resolve => {

            let unsubscribe =
                null;

            let settled =
                false;


            const finish =
                value => {

                    if (settled) {

                        return;

                    }


                    settled =
                        true;


                    if (unsubscribe) {

                        unsubscribe();

                    }


                    resolve(value);

                };


            unsubscribe =
                Auth.onUserChanged(
                    user => {

                        if (!user) {

                            console.error(
                                "NutriCycle AI — Firebase session/profile unavailable."
                            );


                            hideLoading();


                            showDashboardError(
                                "Your Firebase login session could not be restored. Please sign in again."
                            );


                            finish(false);

                            return;

                        }


                        const normalized =
                            normalizeUser(
                                user
                            );


                        if (!normalized) {

                            hideLoading();


                            showDashboardError(
                                "Your NutriCycle profile could not be loaded."
                            );


                            finish(false);

                            return;

                        }


                        if (

                            String(
                                normalized.role
                            )
                                .trim()
                                .toLowerCase()

                            !==

                            "donor"

                        ) {

                            console.error(
                                "NutriCycle AI — User reached donor dashboard with role:",
                                normalized.role
                            );


                            hideLoading();


                            showDashboardError(
                                "This account is not registered as a Food Donor."
                            );


                            finish(false);

                            return;

                        }


                        app.currentUser =
                            normalized;


                        /*
                         * Compatibility only.
                         * Authentication remains Firebase-based.
                         */

                        safeWriteJSON(

                            STORAGE.CURRENT_USER,

                            app.currentUser

                        );


                        console.log(
                            "NutriCycle AI — Donor Firebase session restored:",
                            {
                                uid:
                                    app.currentUser.uid,

                                role:
                                    app.currentUser.role,

                                email:
                                    app.currentUser.email
                            }
                        );


                        finish(true);

                    }

                );

        }

    );

}


/* ============================================================
   DASHBOARD ERROR
============================================================ */

function showDashboardError(
    message
) {

    const container =
        ui.recentDonationsContainer;


    if (container) {

        container.className =
            "empty-card";


        container.innerHTML = `

            <i class="fa-solid fa-triangle-exclamation"></i>

            <h3>
                Account Loading Problem
            </h3>

            <p>
                ${escapeHTML(message)}
            </p>

            <button
                type="button"
                id="dashboardLoginAgainButton"
                class="primary-btn"
                style="margin-top:16px;"
            >
                Return to Login
            </button>

        `;


        document
            .getElementById(
                "dashboardLoginAgainButton"
            )
            ?.addEventListener(
                "click",
                () => {

                    window.location.href =
                        "login.html";

                }
            );

    }


    if (
        ui.donorTrackingMessage
    ) {

        ui.donorTrackingMessage.textContent =
            message;

    }

}


/* ============================================================
   DASHBOARD POPULATION
============================================================ */

function populateDashboard() {

    const user =
        app.currentUser;


    if (!user) {

        return;

    }


    const firstName =
        String(
            user.fullName ||
            "User"
        )
            .trim()
            .split(/\s+/)[0] ||
        "User";


    if (ui.userName) {

        ui.userName.textContent =
            firstName;

    }


    if (
        ui.summaryUserName
    ) {

        ui.summaryUserName.textContent =
            user.fullName ||
            "--";

    }


    if (ui.summaryEmail) {

        ui.summaryEmail.textContent =
            user.email ||
            "--";

    }


    if (ui.summaryPhone) {

        ui.summaryPhone.textContent =
            user.phone ||
            "--";

    }


    if (ui.summaryRole) {

        ui.summaryRole.textContent =
            user.role ||
            "Donor";

    }


    if (
        ui.totalDonations
    ) {

        ui.totalDonations.textContent =
            formatNumber(
                user.totalDonations
            );

    }


    if (ui.mealsServed) {

        ui.mealsServed.textContent =
            formatNumber(
                user.mealsServed
            );

    }


    if (ui.co2Saved) {

        ui.co2Saved.textContent =
            `${formatNumber(
                user.co2Saved
            )} kg`;

    }


    if (ui.rewardPoints) {

        ui.rewardPoints.textContent =
            formatNumber(
                user.rewardPoints
            );

    }

}


/* ============================================================
   NUMBER / TEXT HELPERS
============================================================ */

function formatNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "0";

    }


    return number.toLocaleString(
        "en-IN"
    );

}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function safeText(
    value,
    fallback = "--"
) {

    const text =
        String(
            value ?? ""
        )
            .trim();


    return (
        text ||
        fallback
    );

}


function dateValue(
    value
) {

    if (!value) {

        return null;

    }


    /*
     * Firestore Timestamp
     */

    if (

        typeof value === "object" &&

        typeof value.toDate ===
            "function"

    ) {

        return value.toDate();

    }


    /*
     * Firestore serialized timestamp
     */

    if (

        typeof value === "object" &&

        Number.isFinite(
            value.seconds
        )

    ) {

        return new Date(
            value.seconds * 1000
        );

    }


    const date =
        new Date(value);


    return Number.isNaN(
        date.getTime()
    )

        ? null

        : date;

}


function formatDate(
    value
) {

    const date =
        dateValue(value);


    if (!date) {

        return "Date unavailable";

    }


    return date.toLocaleDateString(
        undefined,
        {

            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"

        }
    );

}


/* ============================================================
   NAVIGATION
============================================================ */

function openPage(
    page
) {

    app.activePage =
        page;


    ui.sidebarButtons
        .forEach(
            button => {

                button.classList.toggle(

                    "active",

                    button.dataset.page ===
                        page

                );

            }
        );


    switch (page) {

        case "dashboard":

            window.scrollTo({

                top:
                    0,

                behavior:
                    "smooth"

            });

            break;


        case "donations":

            ui.recentDonationsContainer
                ?.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

            break;


        case "rewards":

            document
                .querySelector(
                    ".reward-preview"
                )
                ?.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

            break;


        case "notifications":

            document
                .getElementById(
                    "notificationContainer"
                )
                ?.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

            break;


        case "profile":

            document
                .querySelector(
                    ".profile-grid"
                )
                ?.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

            break;

    }

}


function initializeNavigation() {

    ui.sidebarButtons
        .forEach(
            button => {

                if (
                    button.id ===
                    "logoutButton"
                ) {

                    return;

                }


                button.addEventListener(

                    "click",

                    () => {

                        openPage(
                            button.dataset.page
                        );

                    }

                );

            }
        );

}


/* ============================================================
   BUTTONS
============================================================ */

function initializeButtons() {

    ui.logoutButton
        ?.addEventListener(
            "click",
            logout
        );


    const goToDonation =
        () => {

            window.location.href =
                "donation.html";

        };


    ui.createDonationButton
        ?.addEventListener(
            "click",
            goToDonation
        );


    ui.startDonationButton
        ?.addEventListener(
            "click",
            goToDonation
        );


    ui.notificationButton
        ?.addEventListener(
            "click",
            () =>
                openPage(
                    "notifications"
                )
        );


    ui.profileButton
        ?.addEventListener(
            "click",
            () =>
                openPage(
                    "profile"
                )
        );

}


/* ============================================================
   LOGOUT
============================================================ */

async function logout() {

    const confirmed =
        window.confirm(
            "Do you really want to logout?"
        );


    if (!confirmed) {

        return;

    }


    showLoading();


    try {

        await Auth.logout();

    }


    catch (error) {

        console.error(
            "NutriCycle AI — Logout failed:",
            error
        );


        localStorage.removeItem(
            STORAGE.CURRENT_USER
        );


        hideLoading();


        window.location.href =
            "login.html";

    }

}


/* ============================================================
   DONATIONS
============================================================ */

function loadLocalDonations() {

    const local =
        safeReadJSON(

            STORAGE.DONATIONS,

            []

        );


    return Array.isArray(local)
        ? local
        : [];

}


function donationBelongsToCurrentUser(
    donation
) {

    const user =
        app.currentUser;


    if (
        !user ||
        !donation
    ) {

        return false;

    }


    const uid =
        String(
            user.uid ||
            ""
        );


    const donorUid =
        String(

            donation.donorUid ||

            donation.userUid ||

            donation.uid ||

            ""

        );


    if (
        uid &&
        donorUid
    ) {

        return uid === donorUid;

    }


    const email =
        String(
            user.email ||
            ""
        )
            .trim()
            .toLowerCase();


    const donorEmail =
        String(

            donation.donorEmail ||

            donation.email ||

            ""

        )
            .trim()
            .toLowerCase();


    return Boolean(

        email &&

        donorEmail &&

        email === donorEmail

    );

}


function donationTimestamp(
    donation
) {

    return (

        dateValue(
            donation?.updatedAt
        )?.getTime()

        ||

        dateValue(
            donation?.createdAt
        )?.getTime()

        ||

        0

    );

}


function sortDonations(
    donations
) {

    return [...donations]
        .sort(

            (a, b) =>

                donationTimestamp(b) -

                donationTimestamp(a)

        );

}


function mergeDonations(
    firestoreDonations,
    localDonations
) {

    const merged =
        [];

    const keys =
        new Set();


    for (

        const donation of [

            ...firestoreDonations,

            ...localDonations

        ]

    ) {

        if (

            !donationBelongsToCurrentUser(
                donation
            )

        ) {

            continue;

        }


        const key =
            String(

                donation.id ||

                donation.donationId ||

                [

                    donation.foodName,

                    donation.createdAt,

                    donation.quantity

                ].join("|")

            );


        if (
            keys.has(key)
        ) {

            continue;

        }


        keys.add(
            key
        );


        merged.push(
            donation
        );

    }


    return sortDonations(
        merged
    );

}


function subscribeToDonations() {

    const uid =
        app.currentUser?.uid;


    if (!uid) {

        renderDonationHistory(
            []
        );

        return;

    }


    if (
        app.donationUnsubscribe
    ) {

        app.donationUnsubscribe();


        app.donationUnsubscribe =
            null;

    }


    const donationQuery =
        query(

            collection(
                db,
                "donations"
            ),

            where(
                "donorUid",
                "==",
                uid
            )

        );


    app.donationUnsubscribe =
        onSnapshot(

            donationQuery,

            snapshot => {

                const firestoreDonations =
                    snapshot.docs.map(

                        document => ({

                            id:
                                document.id,

                            ...document.data()

                        })

                    );


                const localDonations =
                    loadLocalDonations();


                app.donations =
                    mergeDonations(

                        firestoreDonations,

                        localDonations

                    );


                updateDashboardStats();


                renderDonationHistory(
                    app.donations
                );


                updateRewardPreview(
                    app.donations
                );


                updateTrackingFromDonation();

            },


            error => {

                console.error(

                    "NutriCycle AI — Firestore donation listener failed:",

                    error

                );


                app.donations =
                    mergeDonations(

                        [],

                        loadLocalDonations()

                    );


                updateDashboardStats();


                renderDonationHistory(
                    app.donations
                );


                updateRewardPreview(
                    app.donations
                );


                updateTrackingFromDonation();

            }

        );

}


function updateDashboardStats() {

    const donations =
        app.donations || [];


    const completed =
        donations.filter(
            isCompletedDonation
        );


    const totalDonations =
        donations.length;


    const mealsServed =
        completed.reduce(

            (
                total,
                donation
            ) => {

                const value =
                    Number(
                        donation.mealsServed ??
                        donation.meals ??
                        0
                    );


                if (
                    Number.isFinite(
                        value
                    ) &&
                    value > 0
                ) {

                    return total + value;

                }


                /*
                 * No invented conversion from kg
                 * to meals.
                 */

                return total;

            },

            0

        );


    const carbonSaved =
        completed.reduce(

            (
                total,
                donation
            ) => {

                const direct =
                    Number(
                        donation.carbonSaved ??
                        donation.co2Saved ??
                        0
                    );


                return (

                    Number.isFinite(
                        direct
                    ) &&

                    direct > 0

                )

                    ? total + direct

                    : total;

            },

            0

        );


    const fallbackRewardPoints =
        completed.length *
        100;


    if (
        ui.totalDonations
    ) {

        ui.totalDonations.textContent =
            formatNumber(
                totalDonations
            );

    }


    if (
        ui.mealsServed
    ) {

        ui.mealsServed.textContent =
            formatNumber(
                mealsServed
            );

    }


    if (
        ui.co2Saved
    ) {

        ui.co2Saved.textContent =
            `${formatNumber(
                carbonSaved
            )} kg`;

    }


    if (
        ui.rewardPoints
    ) {

        ui.rewardPoints.textContent =
            formatNumber(
                fallbackRewardPoints
            );

    }

}


function getActiveDonation() {

    const valid =
        app.donations.filter(

            donation =>

                donation &&

                donation.status &&

                String(
                    donation.status
                )
                    .toLowerCase()
                !==
                "draft"

        );


    return valid.length
        ? valid[0]
        : null;

}


/* ============================================================
   DONATION HISTORY
============================================================ */

function getQuantityKg(
    donation
) {

    const direct =
        Number(
            donation?.quantityKg
        );


    if (

        Number.isFinite(
            direct
        ) &&

        direct > 0

    ) {

        return direct;

    }


    const quantity =
        Number(
            donation?.quantity
        );


    if (

        !Number.isFinite(
            quantity
        ) ||

        quantity <= 0

    ) {

        return 0;

    }


    const unit =
        String(
            donation?.unit ||
            "kg"
        )
            .toLowerCase();


    if (
        unit.includes("kg")
    ) {

        return quantity;

    }


    if (

        unit.includes("gram") ||

        unit === "g"

    ) {

        return quantity /
            1000;

    }


    return quantity;

}


function isCompletedDonation(
    donation
) {

    const status =
        String(
            donation?.status ||
            ""
        )
            .trim()
            .toLowerCase();


    return (

        status ===
            "delivered" ||

        status ===
            "delivery complete" ||

        status ===
            "completed"

    );

}


function injectHistoryStyles() {

    if (
        document.getElementById(
            "nutricycle-history-reward-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "nutricycle-history-reward-styles";


    style.textContent = `

        .nutricycle-history-list {
            display: grid;
            gap: 12px;
        }

        .nutricycle-history-item {
            display: grid;
            grid-template-columns: 64px 1fr auto;
            gap: 14px;
            align-items: center;
            padding: 16px;
            border: 1px solid #dce8df;
            border-radius: 16px;
            background: #ffffff;
            transition:
                transform .2s ease,
                box-shadow .2s ease;
        }

        .nutricycle-history-item:hover {
            transform: translateY(-2px);
            box-shadow:
                0 12px 28px rgba(15,60,35,.10);
        }

        .nutricycle-history-icon {
            width: 64px;
            height: 64px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e9f7ee;
            color: #159447;
            font-size: 28px;
            overflow: hidden;
        }

        .nutricycle-history-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .nutricycle-history-main h3 {
            margin: 0;
            font-size: 16px;
            color: #173024;
        }

        .nutricycle-history-main p {
            margin: 5px 0 0;
            color: #718078;
            font-size: 12px;
        }

        .nutricycle-history-meta {
            margin-top: 9px;
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
        }

        .nutricycle-history-pill {
            padding: 5px 8px;
            border-radius: 999px;
            background: #f1f5f2;
            color: #4f6056;
            font-size: 11px;
            font-weight: 700;
        }

        .nutricycle-history-status {
            text-align: right;
        }

        .nutricycle-history-status strong {
            display: block;
            color: #159447;
            font-size: 13px;
        }

        .nutricycle-history-status small {
            display: block;
            margin-top: 5px;
            color: #8a968f;
        }

        .nutricycle-no-delivery {
            padding: 22px;
            border: 1px dashed #cbd9cf;
            border-radius: 18px;
            background: #f8fbf9;
            text-align: center;
        }

        .nutricycle-no-delivery i {
            font-size: 28px;
            color: #159447;
            margin-bottom: 10px;
        }

        .nutricycle-no-delivery h3 {
            margin: 0;
            color: #173024;
        }

        .nutricycle-no-delivery p {
            margin: 8px 0 0;
            color: #718078;
            line-height: 1.5;
        }

        .nutricycle-profile-modal {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(10,25,16,.55);
            backdrop-filter: blur(7px);
        }

        .nutricycle-profile-modal.hidden {
            display: none;
        }

        .nutricycle-profile-card {
            width: min(860px, 100%);
            max-height: 90vh;
            overflow-y: auto;
            background: #ffffff;
            border-radius: 24px;
            padding: 28px;
            box-shadow: 0 25px 80px rgba(0,0,0,.22);
        }

        .nutricycle-profile-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            margin-bottom: 22px;
        }

        .nutricycle-profile-header h2 {
            margin: 0;
            color: #173024;
        }

        .nutricycle-profile-close {
            width: 40px;
            height: 40px;
            border: 0;
            border-radius: 50%;
            cursor: pointer;
            background: #eef4f0;
            color: #173024;
            font-size: 18px;
        }

        .nutricycle-profile-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 16px;
        }

        .nutricycle-profile-field {
            display: flex;
            flex-direction: column;
            gap: 7px;
        }

        .nutricycle-profile-field.full {
            grid-column: 1 / -1;
        }

        .nutricycle-profile-field label {
            font-size: 12px;
            font-weight: 800;
            color: #53645a;
        }

        .nutricycle-profile-field input,
        .nutricycle-profile-field textarea {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #d9e4dc;
            border-radius: 12px;
            padding: 11px 12px;
            font: inherit;
            color: #173024;
            background: #fbfdfb;
            outline: none;
        }

        .nutricycle-profile-field textarea {
            min-height: 100px;
            resize: vertical;
        }

        .nutricycle-profile-field input:focus,
        .nutricycle-profile-field textarea:focus {
            border-color: #159447;
            box-shadow: 0 0 0 3px rgba(21,148,71,.10);
        }

        .nutricycle-profile-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 22px;
        }

        .nutricycle-profile-actions button {
            border: 0;
            border-radius: 12px;
            padding: 11px 16px;
            cursor: pointer;
            font-weight: 800;
        }

        .nutricycle-profile-save {
            background: #159447;
            color: #ffffff;
        }

        .nutricycle-profile-cancel {
            background: #edf3ef;
            color: #173024;
        }

        @media (max-width:680px) {

            .nutricycle-history-item {
                grid-template-columns: 52px 1fr;
            }

            .nutricycle-history-icon {
                width: 52px;
                height: 52px;
                font-size: 23px;
            }

            .nutricycle-history-status {
                grid-column: 2;
                text-align: left;
            }

            .nutricycle-profile-grid {
                grid-template-columns: 1fr;
            }

            .nutricycle-profile-field.full {
                grid-column: auto;
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


function renderDonationHistory(
    donations
) {

    injectHistoryStyles();


    const container =
        ui.recentDonationsContainer;


    if (!container) {

        return;

    }


    if (!donations.length) {

        container.className =
            "empty-card";


        container.innerHTML = `

            <i class="fa-solid fa-clock-rotate-left"></i>

            <h3>
                No Donation History
            </h3>

            <p>
                Your previous donations will appear here after your first successful food donation.
            </p>

        `;


        return;

    }


    container.className =
        "nutricycle-history-list";


    container.innerHTML =
        "";


    donations
        .slice(0, 10)
        .forEach(
            donation => {

                const article =
                    document.createElement(
                        "article"
                    );


                article.className =
                    "nutricycle-history-item";


                const image =
                    safeText(
                        donation.image,
                        ""
                    );


                const imageOrIcon =
                    image

                        ? `

                            <img
                                src="${escapeHTML(image)}"
                                alt="Donation"
                            >

                          `

                        : `

                            <i
                                class="fa-solid fa-bowl-food"
                            ></i>

                          `;


                const food =
                    safeText(
                        donation.foodName,
                        "Food Donation"
                    );


                const quantity =
                    safeText(
                        donation.quantity,
                        "—"
                    );


                const unit =
                    safeText(
                        donation.unit,
                        ""
                    );


                const status =
                    safeText(
                        donation.status,
                        "Submitted"
                    );


                const ngo =
                    safeText(

                        donation.assignment?.ngo ||

                        donation.tracking?.ngo,

                        "NGO pending"

                    );


                const date =
                    formatDate(

                        donation.updatedAt ||

                        donation.createdAt

                    );


                const quantityKg =
                    getQuantityKg(
                        donation
                    );


                const completionText =
                    isCompletedDonation(
                        donation
                    )

                        ? "Rescue completed"

                        : "In progress";


                article.innerHTML = `

                    <div
                        class="nutricycle-history-icon"
                    >
                        ${imageOrIcon}
                    </div>


                    <div
                        class="nutricycle-history-main"
                    >

                        <h3>
                            ${escapeHTML(food)}
                        </h3>

                        <p>
                            ${escapeHTML(date)}
                        </p>


                        <div
                            class="nutricycle-history-meta"
                        >

                            <span
                                class="nutricycle-history-pill"
                            >
                                ${escapeHTML(
                                    `${quantity} ${unit}`
                                )}
                            </span>


                            ${
                                quantityKg > 0

                                    ? `

                                        <span
                                            class="nutricycle-history-pill"
                                        >
                                            ${quantityKg.toFixed(1)}
                                            kg rescued
                                        </span>

                                      `

                                    : ""

                            }


                            <span
                                class="nutricycle-history-pill"
                            >
                                NGO:
                                ${escapeHTML(ngo)}
                            </span>

                        </div>

                    </div>


                    <div
                        class="nutricycle-history-status"
                    >

                        <strong>
                            ${escapeHTML(status)}
                        </strong>

                        <small>
                            ${completionText}
                        </small>

                    </div>

                `;


                container.appendChild(
                    article
                );

            }
        );

}


/* ============================================================
   REWARDS
============================================================ */

function calculateRewards(
    donations
) {

    const completed =
        donations.filter(
            isCompletedDonation
        );


    const completedCount =
        completed.length;


    const totalFoodKg =
        completed.reduce(

            (
                total,
                donation
            ) =>

                total +
                getQuantityKg(
                    donation
                ),

            0

        );


    const rewardPoints =
        completedCount *
        100;


    const xp =
        rewardPoints;


    let level =
        1;


    let levelName =
        "Beginner";


    if (
        xp >= 5000
    ) {

        level =
            5;

        levelName =
            "Rescue Champion";

    }


    else if (
        xp >= 2500
    ) {

        level =
            4;

        levelName =
            "Community Hero";

    }


    else if (
        xp >= 1500
    ) {

        level =
            3;

        levelName =
            "Food Saver";

    }


    else if (
        xp >= 500
    ) {

        level =
            2;

        levelName =
            "Food Friend";

    }


    const badges = [

        {
            name:
                "First Rescue",

            unlocked:
                completedCount >= 1
        },


        {
            name:
                "Food Saver",

            unlocked:
                completedCount >= 3
        },


        {
            name:
                "Community Hero",

            unlocked:
                completedCount >= 5
        },


        {
            name:
                "Rescue Champion",

            unlocked:
                completedCount >= 10
        }

    ].filter(
        badge =>
            badge.unlocked
    );


    const unlockedOffers =
        completed.filter(

            donation =>

                donation?.reward
                    ?.revealed ===
                true

        );


    return {

        completedCount,

        totalFoodKg,

        rewardPoints,

        xp,

        level,

        levelName,

        badges,

        unlockedOffers

    };

}


function updateRewardPreview(
    donations
) {

    const rewardData =
        calculateRewards(
            donations
        );


    if (
        ui.rewardCount
    ) {

        ui.rewardCount.textContent =
            rewardData
                .unlockedOffers
                .length;

    }


    if (
        ui.badgeCount
    ) {

        ui.badgeCount.textContent =
            rewardData
                .badges
                .length;

    }


    if (
        ui.levelText
    ) {

        ui.levelText.textContent =
            rewardData
                .levelName;

    }


    if (
        ui.rewardPoints
    ) {

        ui.rewardPoints.textContent =
            formatNumber(
                rewardData.rewardPoints
            );

    }

}


/* ============================================================
   PROFILE
============================================================ */

function buildProfileModal() {

    if (
        document.getElementById(
            "nutricycleProfileModal"
        )
    ) {

        return;

    }


    injectHistoryStyles();


    const user =
        app.currentUser ||
        {};


    const identity =
        user.identity ||
        {};


    const profile =
        user.profile ||
        {};


    const location =
        user.location ||
        {};


    const preferences =
        user.preferences ||
        {};


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "nutricycleProfileModal";


    modal.className =
        "nutricycle-profile-modal hidden";


    modal.innerHTML = `

        <div
            class="nutricycle-profile-card"
        >

            <div
                class="nutricycle-profile-header"
            >

                <div>

                    <h2>
                        My Profile
                    </h2>

                </div>


                <button
                    type="button"
                    class="nutricycle-profile-close"
                    id="nutricycleProfileClose"
                    aria-label="Close profile"
                >
                    ×
                </button>

            </div>


            <div
                class="nutricycle-profile-grid"
            >

                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Full Name
                    </label>

                    <input
                        id="profileFullName"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Email
                    </label>

                    <input
                        id="profileEmail"
                        type="email"
                        readonly
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Mobile Number
                    </label>

                    <input
                        id="profilePhone"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Gender
                    </label>

                    <input
                        id="profileGender"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Date of Birth
                    </label>

                    <input
                        id="profileDateOfBirth"
                        type="date"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Country
                    </label>

                    <input
                        id="profileCountry"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        State / Province / Region
                    </label>

                    <input
                        id="profileAdministrativeArea"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        District / County
                    </label>

                    <input
                        id="profileDistrict"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        City / Town / Municipality
                    </label>

                    <input
                        id="profileMunicipality"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Locality / Neighbourhood
                    </label>

                    <input
                        id="profileLocality"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Postal Code
                    </label>

                    <input
                        id="profilePostalCode"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Preferred Language
                    </label>

                    <input
                        id="profileLanguage"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field"
                >

                    <label>
                        Preferred Currency
                    </label>

                    <input
                        id="profileCurrency"
                        type="text"
                    >

                </div>


                <div
                    class="nutricycle-profile-field full"
                >

                    <label>
                        Bio
                    </label>

                    <textarea
                        id="profileBio"
                    ></textarea>

                </div>

            </div>


            <div
                class="nutricycle-profile-actions"
            >

                <button
                    type="button"
                    class="nutricycle-profile-cancel"
                    id="nutricycleProfileCancel"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    class="nutricycle-profile-save"
                    id="nutricycleProfileSave"
                >
                    Save Changes
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    document.getElementById(
        "profileFullName"
    ).value =
        identity.name ||
        user.fullName ||
        "";


    document.getElementById(
        "profileEmail"
    ).value =
        identity.email ||
        user.email ||
        "";


    document.getElementById(
        "profilePhone"
    ).value =
        identity.phoneE164 ||
        user.phone ||
        "";


    document.getElementById(
        "profileGender"
    ).value =
        profile.gender ||
        "";


    document.getElementById(
        "profileDateOfBirth"
    ).value =
        profile.dateOfBirth ||
        "";


    document.getElementById(
        "profileCountry"
    ).value =
        location.countryName ||
        "";


    document.getElementById(
        "profileAdministrativeArea"
    ).value =
        location.administrativeArea ||
        "";


    document.getElementById(
        "profileDistrict"
    ).value =
        location.district ||
        "";


    document.getElementById(
        "profileMunicipality"
    ).value =
        location.municipalityOrCity ||
        "";


    document.getElementById(
        "profileLocality"
    ).value =
        location.locality ||
        "";


    document.getElementById(
        "profilePostalCode"
    ).value =
        location.postalCode ||
        "";


    document.getElementById(
        "profileLanguage"
    ).value =
        preferences.language ||
        "";


    document.getElementById(
        "profileCurrency"
    ).value =
        preferences.currency ||
        "";


    document.getElementById(
        "profileBio"
    ).value =
        profile.bio ||
        "";


    document.getElementById(
        "nutricycleProfileClose"
    )
        ?.addEventListener(
            "click",
            closeProfile
        );


    document.getElementById(
        "nutricycleProfileCancel"
    )
        ?.addEventListener(
            "click",
            closeProfile
        );


    document.getElementById(
        "nutricycleProfileSave"
    )
        ?.addEventListener(
            "click",
            saveProfile
        );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                modal
            ) {

                closeProfile();

            }

        }
    );

}


function openProfile() {

    buildProfileModal();


    document
        .getElementById(
            "nutricycleProfileModal"
        )
        ?.classList
        .remove("hidden");

}


function closeProfile() {

    document
        .getElementById(
            "nutricycleProfileModal"
        )
        ?.classList
        .add("hidden");

}


async function saveProfile() {

    const uid =
        app.currentUser?.uid;


    if (!uid) {

        alert(
            "Your account session is unavailable."
        );

        return;

    }


    const button =
        document.getElementById(
            "nutricycleProfileSave"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Saving...";

    }


    try {

        const {
            updateDoc,
            doc
        } = await import(
            "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
        );


        const name =
            document
                .getElementById(
                    "profileFullName"
                )
                ?.value
                .trim() ||
            "";


        const gender =
            document
                .getElementById(
                    "profileGender"
                )
                ?.value
                .trim() ||
            "";


        const dateOfBirth =
            document
                .getElementById(
                    "profileDateOfBirth"
                )
                ?.value ||
            "";


        const phone =
            document
                .getElementById(
                    "profilePhone"
                )
                ?.value
                .trim() ||
            "";


        const country =
            document
                .getElementById(
                    "profileCountry"
                )
                ?.value
                .trim() ||
            "";


        const administrativeArea =
            document
                .getElementById(
                    "profileAdministrativeArea"
                )
                ?.value
                .trim() ||
            "";


        const district =
            document
                .getElementById(
                    "profileDistrict"
                )
                ?.value
                .trim() ||
            "";


        const municipality =
            document
                .getElementById(
                    "profileMunicipality"
                )
                ?.value
                .trim() ||
            "";


        const locality =
            document
                .getElementById(
                    "profileLocality"
                )
                ?.value
                .trim() ||
            "";


        const postalCode =
            document
                .getElementById(
                    "profilePostalCode"
                )
                ?.value
                .trim() ||
            "";


        const language =
            document
                .getElementById(
                    "profileLanguage"
                )
                ?.value
                .trim() ||
            "";


        const currency =
            document
                .getElementById(
                    "profileCurrency"
                )
                ?.value
                .trim() ||
            "";


        const bio =
            document
                .getElementById(
                    "profileBio"
                )
                ?.value
                .trim() ||
            "";


        await updateDoc(

            doc(
                db,
                "users",
                uid
            ),

            {

                "identity.name":
                    name,

                "identity.phoneE164":
                    phone,

                "profile.gender":
                    gender,

                "profile.dateOfBirth":
                    dateOfBirth,

                "profile.bio":
                    bio,

                "location.countryName":
                    country,

                "location.administrativeArea":
                    administrativeArea,

                "location.district":
                    district,

                "location.municipalityOrCity":
                    municipality,

                "location.locality":
                    locality,

                "location.postalCode":
                    postalCode,

                "preferences.language":
                    language,

                "preferences.currency":
                    currency

            }

        );


        /*
         * Update local dashboard state immediately.
         */

        app.currentUser =
            {

                ...app.currentUser,

                fullName:
                    name || "User",

                phone,

                identity: {

                    ...(
                        app.currentUser.identity ||
                        {}
                    ),

                    name,

                    phoneE164:
                        phone

                },

                profile: {

                    ...(
                        app.currentUser.profile ||
                        {}
                    ),

                    gender,

                    dateOfBirth,

                    bio

                },

                location: {

                    ...(
                        app.currentUser.location ||
                        {}
                    ),

                    countryName:
                        country,

                    administrativeArea,

                    district,

                    municipalityOrCity:
                        municipality,

                    locality,

                    postalCode

                },

                preferences: {

                    ...(
                        app.currentUser.preferences ||
                        {}
                    ),

                    language,

                    currency

                }

            };


        safeWriteJSON(

            STORAGE.CURRENT_USER,

            app.currentUser

        );


        populateDashboard();


        closeProfile();


        alert(
            "Profile updated successfully."
        );

    }


    catch (error) {

        console.error(
            "NutriCycle AI — Profile update failed:",
            error
        );


        alert(
            "Profile could not be updated. Please try again."
        );

    }


    finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Save Changes";

        }

    }

}


/* ============================================================
   TRACKING STATE
============================================================ */

const donorTracking = {

    map:
        null,

    userMarker:
        null,

    ngoMarker:
        null,

    vehicleMarker:
        null,

    routeLine:
        null,

    liveLocation:
        null,

    ngoLocation:
        null,

    routePoints:
        [],

    routeDistanceKm:
        0,

    remainingDistanceKm:
        0,

    watchId:
        null,

    vehicle:
        "Car",

    vehicleEmoji:
        "🚗",

    driver:
        "--",

    ngo:
        "--"

};


/* ============================================================
   VEHICLE
============================================================ */

function donorVehicleEmoji(
    vehicle
) {

    const icons = {

        Bike:
            "🏍️",

        Car:
            "🚗",

        Tempo:
            "🚚",

        Truck:
            "🚛"

    };


    return (

        icons[vehicle] ||

        "🚗"

    );

}


/* ============================================================
   DISTANCE
============================================================ */

function donorDistanceKm(
    a,
    b
) {

    const R =
        6371;


    const dLat =

        (
            b[0] -
            a[0]
        ) *
        Math.PI /
        180;


    const dLng =

        (
            b[1] -
            a[1]
        ) *
        Math.PI /
        180;


    const lat1 =
        a[0] *
        Math.PI /
        180;


    const lat2 =
        b[0] *
        Math.PI /
        180;


    const x =

        Math.sin(
            dLat / 2
        ) ** 2

        +

        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(
            dLng / 2
        ) ** 2;


    return (

        2 *
        R *
        Math.atan2(

            Math.sqrt(x),

            Math.sqrt(
                1 - x
            )

        )

    );

}


function donorFormatDistance(
    km
) {

    if (
        !Number.isFinite(km)
    ) {

        return "--";

    }


    if (
        km < 1
    ) {

        return (

            Math.round(
                km * 1000
            ) +

            " m"

        );

    }


    return (

        km.toFixed(1) +

        " km"

    );

}


/* ============================================================
   NGO LOCATION
============================================================ */

function determineNGOLocation(
    donation
) {

    const candidate =

        donation?.assignment
            ?.ngoLocation

        ||

        donation?.tracking
            ?.ngoLocation

        ||

        donation?.ngoLocation

        ||

        donation?.destination
            ?.location

        ||

        donation?.ngo
            ?.location

        ||

        null;


    if (

        Array.isArray(
            candidate
        ) &&

        candidate.length >= 2 &&

        Number.isFinite(
            Number(candidate[0])
        ) &&

        Number.isFinite(
            Number(candidate[1])
        )

    ) {

        return [

            Number(candidate[0]),

            Number(candidate[1])

        ];

    }


    if (

        candidate &&

        Number.isFinite(
            Number(candidate.latitude)
        ) &&

        Number.isFinite(
            Number(candidate.longitude)
        )

    ) {

        return [

            Number(
                candidate.latitude
            ),

            Number(
                candidate.longitude
            )

        ];

    }


    if (

        candidate &&

        Number.isFinite(
            Number(candidate.lat)
        ) &&

        Number.isFinite(
            Number(candidate.lng)
        )

    ) {

        return [

            Number(
                candidate.lat
            ),

            Number(
                candidate.lng
            )

        ];

    }


    return null;

}


/* ============================================================
   VEHICLE ICON
============================================================ */

function createDonorVehicleIcon(
    vehicle
) {

    const emoji =
        donorVehicleEmoji(
            vehicle
        );


    return L.divIcon({

        className:
            "donor-vehicle-marker",


        html: `

            <div
                style="
                    width:52px;
                    height:52px;
                    border-radius:50%;
                    background:#16b84e;
                    border:4px solid white;
                    box-shadow:0 6px 18px rgba(0,0,0,.25);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:29px;
                "
            >
                ${emoji}
            </div>

        `,


        iconSize: [

            52,

            52

        ],


        iconAnchor: [

            26,

            26

        ]

    });

}


/* ============================================================
   MAP
============================================================ */

function initializeDonorTrackingMap() {

    if (
        typeof L ===
        "undefined"
    ) {

        console.error(
            "NutriCycle AI — Leaflet unavailable."
        );

        return;

    }


    const mapElement =
        ui.trackingMap;


    if (!mapElement) {

        return;

    }


    if (
        donorTracking.map
    ) {

        try {

            donorTracking
                .map
                .remove();

        }

        catch (_) {}


        donorTracking.map =
            null;

    }


    donorTracking.map =
        L.map(

            mapElement,

            {
                zoomControl:
                    true
            }

        );


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom:
                19,

            attribution:
                "&copy; OpenStreetMap contributors"

        }

    )
        .addTo(
            donorTracking.map
        );


    setTimeout(

        () =>

            donorTracking
                .map
                ?.invalidateSize(
                    true
                ),

        200

    );


    setTimeout(

        () =>

            donorTracking
                .map
                ?.invalidateSize(
                    true
                ),

        700

    );

}


/* ============================================================
   LIVE LOCATION
============================================================ */

function startDonorLiveLocation() {

    if (
        !navigator.geolocation
    ) {

        updateDonorTrackingMessage(
            "Live location is not supported by this browser."
        );

        return;

    }


    navigator.geolocation
        .getCurrentPosition(

            position => {

                updateDonorLocation(
                    position
                );


                startDonorLocationWatch();

            },


            error => {

                console.warn(

                    "NutriCycle AI — Donor location error:",

                    error

                );


                updateDonorTrackingMessage(

                    "Location permission is required to display your live position."

                );

            },


            {

                enableHighAccuracy:
                    true,

                maximumAge:
                    0,

                timeout:
                    15000

            }

        );

}


function startDonorLocationWatch() {

    if (

        donorTracking
            .watchId !==
        null

    ) {

        return;

    }


    donorTracking.watchId =

        navigator.geolocation
            .watchPosition(

                position => {

                    updateDonorLocation(
                        position
                    );

                },


                error => {

                    console.warn(

                        "NutriCycle AI — Donor location watch:",

                        error.message

                    );

                },


                {

                    enableHighAccuracy:
                        true,

                    maximumAge:
                        0,

                    timeout:
                        15000

                }

            );

}


function updateDonorLocation(
    position
) {

    donorTracking.liveLocation = [

        position.coords.latitude,

        position.coords.longitude

    ];


    updateDonorGPSAccuracy(

        position.coords.accuracy

    );


    if (
        donorTracking.userMarker
    ) {

        donorTracking
            .userMarker
            .setLatLng(

                donorTracking
                    .liveLocation

            );

    }


    if (

        donorTracking.map &&

        !donorTracking.routeLine

    ) {

        donorTracking.map.setView(

            donorTracking
                .liveLocation,

            15

        );


        createDonorMarker();

    }

}


/* ============================================================
   DONOR MARKER
============================================================ */

function createDonorMarker() {

    if (

        !donorTracking.map ||

        !donorTracking.liveLocation

    ) {

        return;

    }


    if (
        donorTracking.userMarker
    ) {

        donorTracking.userMarker
            .remove();

    }


    const icon =
        L.divIcon({

            className:
                "donor-location-marker",


            html: `

                <div
                    style="
                        width:36px;
                        height:36px;
                        border-radius:50%;
                        background:#ffffff;
                        border:4px solid #16b84e;
                        box-shadow:0 4px 14px rgba(0,0,0,.25);
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#16b84e;
                        font-size:17px;
                    "
                >
                    <i class="fa-solid fa-location-dot"></i>
                </div>

            `,


            iconSize: [

                36,

                36

            ],


            iconAnchor: [

                18,

                18

            ]

        });


    donorTracking.userMarker =

        L.marker(

            donorTracking
                .liveLocation,

            {

                icon

            }

        )


            .addTo(

                donorTracking.map

            )


            .bindPopup(

                "📍 Your Live Location"

            );

}


/* ============================================================
   NGO MARKER
============================================================ */

function createDonorNGOMarker() {

    if (
        !donorTracking.map
    ) {

        return;

    }


    if (
        !donorTracking.ngoLocation
    ) {

        return;

    }


    if (
        donorTracking.ngoMarker
    ) {

        donorTracking.ngoMarker
            .remove();

    }


    const icon =
        L.divIcon({

            className:
                "donor-ngo-marker",


            html: `

                <div
                    style="
                        width:36px;
                        height:36px;
                        border-radius:50%;
                        background:#ffffff;
                        border:4px solid #ef4444;
                        box-shadow:0 4px 14px rgba(0,0,0,.25);
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#ef4444;
                        font-size:16px;
                    "
                >
                    <i class="fa-solid fa-building"></i>
                </div>

            `,


            iconSize: [

                36,

                36

            ],


            iconAnchor: [

                18,

                18

            ]

        });


    donorTracking.ngoMarker =

        L.marker(

            donorTracking.ngoLocation,

            {

                icon

            }

        )


            .addTo(

                donorTracking.map

            )


            .bindPopup(

                `🏢 ${escapeHTML(
                    donorTracking.ngo
                )}`

            );

}


/* ============================================================
   ROAD ROUTE
============================================================ */

async function createDonorRoadRoute() {

    if (

        !donorTracking.liveLocation ||

        !donorTracking.map ||

        !donorTracking.ngoLocation

    ) {

        return;

    }


    const start =
        donorTracking
            .liveLocation;


    const end =
        donorTracking
            .ngoLocation;


    const url =

        "https://router.project-osrm.org/route/v1/driving/" +

        `${start[1]},${start[0]};` +

        `${end[1]},${end[0]}` +

        "?overview=full&geometries=geojson";


    try {

        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(

                `OSRM HTTP ${response.status}`

            );

        }


        const data =
            await response.json();


        const route =
            data?.routes?.[0];


        if (

            !route ||

            !route.geometry ||

            !Array.isArray(

                route
                    .geometry
                    .coordinates

            )

        ) {

            throw new Error(

                "OSRM did not return a usable route."

            );

        }


        const points =

            route
                .geometry
                .coordinates
                .map(

                    coordinate => [

                        coordinate[1],

                        coordinate[0]

                    ]

                );


        donorTracking.routePoints =
            points;


        donorTracking.routeDistanceKm =

            Number(
                route.distance ||
                0
            ) /
            1000;


        donorTracking.remainingDistanceKm =

            donorTracking
                .routeDistanceKm;


        if (
            donorTracking.routeLine
        ) {

            donorTracking.routeLine
                .remove();

        }


        donorTracking.routeLine =

            L.polyline(

                points,

                {

                    color:
                        "#16b84e",

                    weight:
                        6,

                    opacity:
                        0.9,

                    lineJoin:
                        "round",

                    lineCap:
                        "round"

                }

            )
                .addTo(
                    donorTracking.map
                );


        createDonorVehicleMarker();


        donorTracking.map.fitBounds(

            donorTracking
                .routeLine
                .getBounds(),

            {

                padding: [

                    40,

                    40

                ]

            }

        );


        updateDonorDistance(

            donorTracking
                .remainingDistanceKm

        );

    }


    catch (error) {

        console.warn(

            "NutriCycle AI — Road route unavailable:",

            error

        );


        updateDonorTrackingMessage(

            "Live location detected, but the road route could not be loaded."

        );

    }

}


/* ============================================================
   VEHICLE MARKER
============================================================ */

function createDonorVehicleMarker() {

    if (

        !donorTracking.map ||

        !donorTracking.routePoints
            .length

    ) {

        return;

    }


    if (
        donorTracking.vehicleMarker
    ) {

        donorTracking.vehicleMarker
            .remove();

    }


    donorTracking.vehicleMarker =

        L.marker(

            donorTracking
                .routePoints[0],

            {

                icon:

                    createDonorVehicleIcon(

                        donorTracking
                            .vehicle

                    ),

                zIndexOffset:
                    1000

            }

        )

            .addTo(

                donorTracking.map

            )

            .bindPopup(

                `${donorTracking.vehicleEmoji} ${escapeHTML(
                    donorTracking.vehicle
                )}`

            );

}


/* ============================================================
   TRACKING UI
============================================================ */

function updateDonorTrackingMessage(
    message
) {

    if (
        ui.donorTrackingMessage
    ) {

        ui.donorTrackingMessage.textContent =
            message;

    }

}


function updateDonorGPSAccuracy(
    accuracy
) {

    if (

        ui.donorGPSAccuracy &&

        Number.isFinite(
            Number(accuracy)
        )

    ) {

        ui.donorGPSAccuracy.textContent =

            `${Math.round(
                Number(accuracy)
            )} m`;

    }

}


function updateDonorDistance(
    distance
) {

    if (
        ui.donorDistance
    ) {

        ui.donorDistance.textContent =

            donorFormatDistance(
                distance
            );

    }

}


function updateDonorTrackingUI() {

    if (
        ui.donorTrackingVehicle
    ) {

        ui.donorTrackingVehicle
            .replaceChildren(

                document.createTextNode(

                    donorTracking
                        .vehicleEmoji

                )

            );

    }


    if (
        ui.donorTrackingStatus
    ) {

        ui.donorTrackingStatus.textContent =

            getActiveDonation()
                ?.status ||

            "No Active Delivery";

    }


    if (
        ui.donorVehicle
    ) {

        ui.donorVehicle.textContent =

            donorTracking.ngoLocation

                ? `${donorTracking.vehicleEmoji} ${donorTracking.vehicle}`

                : "--";

    }


    if (
        ui.donorDriver
    ) {

        ui.donorDriver.textContent =

            donorTracking.ngoLocation

                ? donorTracking.driver

                : "--";

    }


    if (
        ui.donorNGO
    ) {

        ui.donorNGO.textContent =

            donorTracking.ngoLocation

                ? donorTracking.ngo

                : "--";

    }


    if (
        ui.donorETA
    ) {

        ui.donorETA.textContent =

            donorTracking.ngoLocation

                ? "Calculating..."

                : "--";

    }


    updateDonorDistance(

        donorTracking
            .remainingDistanceKm

    );

}


function loadDonorTrackingData() {

    const donation =
        getActiveDonation();


    /*
     * No active donation.
     */

    if (!donation) {

        donorTracking.vehicle =
            "Car";


        donorTracking.vehicleEmoji =
            "🚗";


        donorTracking.driver =
            "--";


        donorTracking.ngo =
            "--";


        donorTracking.ngoLocation =
            null;


        updateDonorTrackingUI();


        updateDonorTrackingMessage(

            "No active delivery. Your live delivery map will appear here once a donation has been accepted and a delivery agent has been assigned."

        );


        return;

    }


    /*
     * We only show active delivery tracking
     * after a real assignment exists.
     */

    const assignment =
        donation.assignment ||
        {};


    const tracking =
        donation.tracking ||
        {};


    const agent =
        assignment.agent ||
        assignment.driver ||
        assignment.driverName ||
        tracking.driverName ||
        "";


    const ngo =
        assignment.ngo ||
        tracking.ngo ||
        donation.ngo?.name ||
        "";


    const ngoLocation =
        determineNGOLocation(
            donation
        );


    if (
        !agent ||
        !ngo ||
        !ngoLocation
    ) {

        donorTracking.vehicle =
            assignment.vehicle ||
            tracking.vehicle ||
            "Car";


        donorTracking.vehicleEmoji =
            donorVehicleEmoji(

                donorTracking.vehicle

            );


        donorTracking.driver =
            agent ||
            "--";


        donorTracking.ngo =
            ngo ||
            "--";


        donorTracking.ngoLocation =
            null;


        updateDonorTrackingUI();


        updateDonorTrackingMessage(

            "Your donation is being processed. Live delivery tracking will appear after the NGO and delivery agent are assigned."

        );


        return;

    }


    donorTracking.vehicle =
        assignment.vehicle ||
        tracking.vehicle ||
        "Car";


    donorTracking.vehicleEmoji =
        donorVehicleEmoji(

            donorTracking.vehicle

        );


    donorTracking.driver =
        agent;


    donorTracking.ngo =
        ngo;


    donorTracking.ngoLocation =
        ngoLocation;


    updateDonorTrackingUI();

}


/* ============================================================
   UPDATE TRACKING FROM DONATION
============================================================ */

function updateTrackingFromDonation() {

    loadDonorTrackingData();


    if (

        !donorTracking.ngoLocation

    ) {

        return;

    }


    if (

        donorTracking.map &&

        donorTracking.liveLocation

    ) {

        createDonorNGOMarker();


        void createDonorRoadRoute();

    }

}


/* ============================================================
   INITIALIZE TRACKING
============================================================ */

async function initializeDonorTracking() {

    if (!ui.trackingMap) {

        return;

    }


    /*
     * First load donation state.
     */

    loadDonorTrackingData();


    /*
     * Don't create a map at all when there is
     * no active delivery.
     */

    if (
        !donorTracking.ngoLocation
    ) {

        updateDonorTrackingMessage(

            getActiveDonation()

                ? "Your donation is awaiting NGO and delivery-agent assignment."

                : "No active delivery. Your live delivery map will appear here once a donation has been accepted and a delivery agent has been assigned."

        );


        return;

    }


    if (
        !navigator.geolocation
    ) {

        updateDonorTrackingMessage(

            "Your browser does not support live location."

        );


        return;

    }


    let position;


    try {

        position =
            await new Promise(

                (
                    resolve,
                    reject
                ) => {

                    navigator.geolocation
                        .getCurrentPosition(

                            resolve,

                            reject,

                            {

                                enableHighAccuracy:
                                    true,

                                maximumAge:
                                    0,

                                timeout:
                                    10000

                            }

                        );

                }

            );

    }


    catch (error) {

        console.warn(

            "NutriCycle AI — Donor GPS unavailable:",

            error

        );


        updateDonorTrackingMessage(

            "Allow location access to display live donor tracking."

        );


        return;

    }


    donorTracking.liveLocation = [

        position.coords.latitude,

        position.coords.longitude

    ];


    updateDonorGPSAccuracy(

        position.coords.accuracy

    );


    initializeDonorTrackingMap();


    if (
        !donorTracking.map
    ) {

        return;

    }


    createDonorMarker();


    createDonorNGOMarker();


    await createDonorRoadRoute();


    startDonorLocationWatch();


    updateDonorTrackingMessage(

        "Live location and road route are active."

    );


    requestAnimationFrame(

        () =>

            donorTracking
                .map
                ?.invalidateSize(
                    true
                )

    );

}


/* ============================================================
   MAP BUTTONS
============================================================ */

ui.recenterTrackingButton
    ?.addEventListener(

        "click",

        () => {

            if (

                donorTracking.map &&

                donorTracking.liveLocation

            ) {

                donorTracking.map.setView(

                    donorTracking
                        .liveLocation,

                    16

                );

            }

        }

    );


ui.refreshTrackingButton
    ?.addEventListener(

        "click",

        async () => {

            try {

                await initializeDonorTracking();

            }

            catch (error) {

                console.error(

                    "NutriCycle AI — Tracking refresh failed:",

                    error

                );

            }

        }

    );


/* ============================================================
   PROFILE BUTTON OVERRIDE
============================================================ */

ui.profileButton
    ?.addEventListener(

        "click",

        event => {

            event.preventDefault();

            openProfile();

        }

    );


ui.sidebarButtons
    ?.forEach(

        button => {

            if (
                button.dataset.page !==
                "profile"
            ) {

                return;

            }


            button.addEventListener(

                "click",

                event => {

                    event.preventDefault();

                    openProfile();

                }

            );

        }

    );


/* ============================================================
   INITIALIZATION
============================================================ */

async function initialize() {

    showLoading();


    const authenticated =
        await authenticateUser();


    if (!authenticated) {

        return;

    }


    populateDashboard();


    initializeNavigation();


    initializeButtons();


    subscribeToDonations();


    /*
     * Tracking is deliberately not allowed
     * to block dashboard rendering.
     */

    hideLoading();


    void initializeDonorTracking();


    console.log(
        "NutriCycle AI — Donor Dashboard Ready"
    );

}


/* ============================================================
   START
============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        void initialize();

    },

    {
        once: true
    }

);