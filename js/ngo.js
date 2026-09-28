"use strict";

/* ============================================================
   NutriCycle AI
   NGO DASHBOARD
   Firebase + Location Matching + Circular Analytics
   Full Replacement
============================================================ */


/* ============================================================
   FIREBASE
============================================================ */

import Auth from "./auth.js";

import {
    collection,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import {
    db,
    storage
} from "./firebase-config.js";


/* ============================================================
   APPLICATION STATE
============================================================ */

const appState = {

    currentUser:
        null,

    ngoName:
        "NGO",

    ngoRegistration:
        "",

    profileImage:
        "",

    verificationStatus:
        "unverified",

    verificationLevel:
        "basic",

    ngoLocation:
        null,

    locationSource:
        "profile",

    allDonations:
        [],

    nearbyDonations:
        [],

    incomingDonations:
        [],

    assignedPickups:
        [],

    completedDonations:
        [],

    inventory:
        [],

    activities:
        [],

    donationUnsubscribe:
        null,

    analyticsMode:
        "monthly",

    statistics:
        {

            totalDonations:
                0,

            activePickups:
                0,

            foodSaved:
                0,

            mealsServed:
                0

        }

};


/* ============================================================
   CONFIGURATION
============================================================ */

const CONFIG = {

    nearbyRadiusKm:
        50,

    maximumNearbyRequests:
        10,

    analyticsHistoryDays:
        7,

    analyticsHistoryMonths:
        12,

    analyticsHistoryYears:
        5

};


/* ============================================================
   DOM CACHE
============================================================ */

const ui = {

    dashboardButton:
        document.getElementById(
            "dashboardButton"
        ),

    incomingButton:
        document.getElementById(
            "incomingButton"
        ),

    pickupButton:
        document.getElementById(
            "pickupButton"
        ),

    inventoryButton:
        document.getElementById(
            "inventoryButton"
        ),

    analyticsButton:
        document.getElementById(
            "analyticsButton"
        ),

    notificationButton:
        document.getElementById(
            "notificationButton"
        ),

    profileButton:
        document.getElementById(
            "profileButton"
        ),

    logoutButton:
        document.getElementById(
            "logoutButton"
        ),

    notificationBell:
        document.getElementById(
            "notificationBell"
        ),

    searchBar:
        document.getElementById(
            "searchBar"
        ),

    totalDonations:
        document.getElementById(
            "totalDonations"
        ),

    activePickups:
        document.getElementById(
            "activePickups"
        ),

    foodSaved:
        document.getElementById(
            "foodSaved"
        ),

    mealsServed:
        document.getElementById(
            "mealsServed"
        ),

    incomingContainer:
        document.getElementById(
            "incomingContainer"
        ),

    pickupContainer:
        document.getElementById(
            "pickupContainer"
        ),

    inventoryContainer:
        document.getElementById(
            "inventoryContainer"
        ),

    activityContainer:
        document.getElementById(
            "activityContainer"
        ),

    profileName:
        document.querySelector(
            ".profile-details h4"
        ),

    profileStatus:
        document.querySelector(
            ".profile-details p"
        ),

    profileAvatar:
        document.querySelector(
            ".profile-avatar"
        )

};


/* ============================================================
   GENERAL HELPERS
============================================================ */

function normalizeText(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();

}


function formatNumber(
    value
) {

    const number =
        Number(
            value || 0
        );


    if (
        !Number.isFinite(
            number
        )
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


function formatDate(
    value
) {

    if (!value) {

        return "Date unavailable";

    }


    if (
        typeof value?.toDate ===
        "function"
    ) {

        return value
            .toDate()
            .toLocaleDateString(

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


    if (

        typeof value ===
        "object" &&

        Number.isFinite(
            value?.seconds
        )

    ) {

        return new Date(
            value.seconds * 1000
        )
            .toLocaleDateString(

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


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

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


function getDateObject(
    value
) {

    if (!value) {

        return null;

    }


    if (
        typeof value?.toDate ===
        "function"
    ) {

        return value.toDate();

    }


    if (

        typeof value ===
        "object" &&

        Number.isFinite(
            value?.seconds
        )

    ) {

        return new Date(
            value.seconds * 1000
        );

    }


    const result =
        new Date(
            value
        );


    return Number.isNaN(
        result.getTime()
    )
        ? null
        : result;

}


/* ============================================================
   QUANTITY
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
        normalizeText(
            donation?.unit
        );


    if (

        unit === "kg" ||

        unit.includes(
            "kilogram"
        )

    ) {

        return quantity;

    }


    if (

        unit === "g" ||

        unit.includes(
            "gram"
        )

    ) {

        return quantity / 1000;

    }


    return quantity;

}


/* ============================================================
   DONATION STATUS
============================================================ */

function getDonationStatus(
    donation
) {

    return normalizeText(
        donation?.status
    );

}


function isCompleted(
    donation
) {

    const status =
        getDonationStatus(
            donation
        );


    return (

        status ===
            "completed" ||

        status ===
            "delivered" ||

        status ===
            "delivery complete"

    );

}


function isRejected(
    donation
) {

    const status =
        getDonationStatus(
            donation
        );


    return (

        status ===
            "rejected" ||

        status ===
            "cancelled"

    );

}


function isAcceptedByAnyNGO(
    donation
) {

    return Boolean(

        donation?.acceptedBy ||

        donation?.acceptedByNGO

    );

}


function isAcceptedByThisNGO(
    donation
) {

    const currentUid =
        normalizeText(
            appState.currentUser?.uid
        );


    const acceptedBy =
        normalizeText(
            donation?.acceptedBy
        );


    const currentNGO =
        normalizeText(
            appState.ngoName
        );


    const acceptedByNGO =
        normalizeText(
            donation?.acceptedByNGO
        );


    return (

        (

            currentUid &&

            acceptedBy &&

            currentUid ===
                acceptedBy

        )

        ||

        (

            currentNGO &&

            acceptedByNGO &&

            currentNGO ===
                acceptedByNGO

        )

    );

}


/* ============================================================
   LOCATION EXTRACTION
============================================================ */

function numberOrNull(
    value
) {

    const number =
        Number(value);


    return Number.isFinite(
        number
    )
        ? number
        : null;

}


function extractCoordinates(
    object
) {

    if (!object) {

        return null;

    }


    const latitudeCandidates = [

        object.latitude,

        object.lat

    ];


    const longitudeCandidates = [

        object.longitude,

        object.lng,

        object.lon

    ];


    let latitude =
        null;


    let longitude =
        null;


    for (
        const value of
        latitudeCandidates
    ) {

        const parsed =
            numberOrNull(
                value
            );


        if (
            parsed !==
            null
        ) {

            latitude =
                parsed;

            break;

        }

    }


    for (
        const value of
        longitudeCandidates
    ) {

        const parsed =
            numberOrNull(
                value
            );


        if (
            parsed !==
            null
        ) {

            longitude =
                parsed;

            break;

        }

    }


    if (

        latitude ===
            null ||

        longitude ===
            null

    ) {

        return null;

    }


    if (

        latitude < -90 ||

        latitude > 90 ||

        longitude < -180 ||

        longitude > 180

    ) {

        return null;

    }


    return {

        latitude,

        longitude

    };

}


function extractNGOLocation(
    user
) {

    const location =
        user?.location;


    if (location) {

        const direct =
            extractCoordinates(
                location
            );


        if (direct) {

            return direct;

        }

    }


    const candidates = [

        user?.coordinates,

        user?.geo,

        user?.address,

        user?.roleDetails?.location,

        user?.roleData?.location

    ];


    for (
        const candidate of
        candidates
    ) {

        const result =
            extractCoordinates(
                candidate
            );


        if (result) {

            return result;

        }

    }


    return null;

}


function extractDonationLocation(
    donation
) {

    const candidates = [

        donation?.location,

        donation?.donorLocation,

        donation?.pickupLocation,

        donation?.pickup?.location,

        donation?.donor?.location,

        donation?.address?.location,

        donation?.geo,

        donation?.coordinates

    ];


    for (
        const candidate of
        candidates
    ) {

        const result =
            extractCoordinates(
                candidate
            );


        if (result) {

            return result;

        }

    }


    const direct =
        extractCoordinates(
            donation
        );


    if (direct) {

        return direct;

    }


    return null;

}


/* ============================================================
   DISTANCE
============================================================ */

function distanceKm(
    first,
    second
) {

    if (

        !first ||

        !second

    ) {

        return null;

    }


    const earthRadius =
        6371;


    const lat1 =
        first.latitude *
        Math.PI /
        180;


    const lat2 =
        second.latitude *
        Math.PI /
        180;


    const deltaLat =

        (
            second.latitude -
            first.latitude
        ) *

        Math.PI /
        180;


    const deltaLng =

        (
            second.longitude -
            first.longitude
        ) *

        Math.PI /
        180;


    const a =

        Math.sin(
            deltaLat / 2
        ) ** 2

        +

        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(
            deltaLng / 2
        ) ** 2;


    return (

        2 *
        earthRadius *
        Math.atan2(

            Math.sqrt(a),

            Math.sqrt(
                1 - a
            )

        )

    );

}


function formatDistance(
    value
) {

    if (
        !Number.isFinite(
            Number(value)
        )
    ) {

        return "Distance unavailable";

    }


    const km =
        Number(value);


    if (
        km < 1
    ) {

        return `${Math.round(
            km * 1000
        )} m away`;

    }


    return `${km.toFixed(
        1
    )} km away`;

}


/* ============================================================
   LOCATION MATCHING
============================================================ */

function donorMatchesNGOArea(
    donation
) {

    const ngoLocation =
        appState.ngoLocation;


    const donorLocation =
        extractDonationLocation(
            donation
        );


    /*
     * Best case:
     * real coordinates available.
     */

    if (

        ngoLocation &&

        donorLocation

    ) {

        const distance =
            distanceKm(
                ngoLocation,
                donorLocation
            );


        if (
            distance ===
            null
        ) {

            return null;

        }


        return {

            matched:
                distance <=
                CONFIG.nearbyRadiusKm,

            distance

        };

    }


    /*
     * Second-best case:
     * compare country + administrative/city/locality.
     * This supports profiles that have not yet stored
     * coordinates.
     */

    const ngo =
        appState.currentUser
            ?.location ||
        {};


    const donor =
        donation?.location ||
        {};


    const ngoCountry =
        normalizeText(
            ngo.countryCode ||
            ngo.countryName
        );


    const donorCountry =
        normalizeText(
            donor.countryCode ||
            donor.countryName
        );


    if (

        ngoCountry &&

        donorCountry &&

        ngoCountry ===
            donorCountry

    ) {

        const ngoCity =
            normalizeText(

                ngo.municipalityOrCity ||

                ngo.city ||

                ngo.locality

            );


        const donorCity =
            normalizeText(

                donor.municipalityOrCity ||

                donor.city ||

                donor.locality

            );


        if (

            ngoCity &&

            donorCity &&

            ngoCity ===
                donorCity

        ) {

            return {

                matched:
                    true,

                distance:
                    null

            };

        }

    }


    return {

        matched:
            false,

        distance:
            null

    };

}


/* ============================================================
   PROFILE
============================================================ */

function getVerificationLabel() {

    const status =
        normalizeText(

            appState
                .currentUser
                ?.verification
                ?.status

            ||

            appState
                .currentUser
                ?.verificationStatus

            ||

            appState
                .verificationStatus

        );


    if (

        status ===
            "verified" ||

        status ===
            "approved"

    ) {

        return "Verified Organization";

    }


    if (
        status ===
        "rejected"
    ) {

        return "Verification Rejected";

    }


    return "Verification Pending";

}


function updateProfile() {

    const user =
        appState.currentUser;


    if (!user) {

        return;

    }


    appState.ngoName =

        user.roleDetails?.ngoName ||

        user.roleData?.ngoName ||

        user.ngoName ||

        user.name ||

        user.identity?.name ||

        "NGO";


    appState.ngoRegistration =

        user.roleDetails?.ngoRegistration ||

        user.roleData?.ngoRegistration ||

        user.ngoRegistration ||

        "";


    appState.profileImage =

        user.profile?.profileImage ||

        user.profileImage ||

        "";


    appState.verificationStatus =

        user.verification?.status ||

        user.verificationStatus ||

        "unverified";


    appState.verificationLevel =

        user.verification?.level ||

        "basic";


    appState.ngoLocation =
        extractNGOLocation(
            user
        );


    if (
        ui.profileName
    ) {

        ui.profileName.textContent =
            appState.ngoName;

    }


    if (
        ui.profileStatus
    ) {

        ui.profileStatus.textContent =
            getVerificationLabel();

    }


    if (
        ui.profileAvatar
    ) {

        renderAvatarElement(
            ui.profileAvatar,
            appState.profileImage,
            "NGO"
        );

    }

}


/* ============================================================
   AVATAR
============================================================ */

function renderAvatarElement(
    element,
    imageURL,
    fallback
) {

    if (!element) {

        return;

    }


    if (imageURL) {

        element.innerHTML = `

            <img
                src="${escapeHTML(
                    imageURL
                )}"
                alt="Profile photo"
                style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    border-radius:inherit;
                    display:block;
                "
            >

        `;

        return;

    }


    element.textContent =
        fallback;

}


/* ============================================================
   PROFILE MODAL
============================================================ */

let pendingProfilePhoto =
    null;


function createProfileModal() {

    if (
        document.getElementById(
            "nutricycleNgoProfileModal"
        )
    ) {

        fillProfileModal();

        return;

    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "nutricycleNgoProfileModal";


    modal.style.cssText = `

        position:fixed;
        inset:0;
        z-index:99999;
        display:none;
        align-items:center;
        justify-content:center;
        padding:22px;
        background:rgba(5,25,15,.58);
        backdrop-filter:blur(8px);

    `;


    modal.innerHTML = `

        <div
            style="
                width:min(720px,100%);
                max-height:90vh;
                overflow:auto;
                background:#fff;
                border-radius:24px;
                padding:28px;
                box-shadow:0 30px 90px rgba(0,0,0,.24);
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:16px;
                    margin-bottom:24px;
                "
            >

                <div>

                    <h2
                        style="
                            margin:0;
                            color:#173024;
                        "
                    >
                        NGO Profile
                    </h2>

                    <p
                        style="
                            margin:6px 0 0;
                            color:#718078;
                            font-size:13px;
                        "
                    >
                        Manage your organization identity and profile photo.
                    </p>

                </div>


                <button
                    id="ngoProfileClose"
                    type="button"
                    style="
                        width:40px;
                        height:40px;
                        border:0;
                        border-radius:50%;
                        background:#edf4ef;
                        color:#173024;
                        font-size:22px;
                        cursor:pointer;
                    "
                >
                    ×
                </button>

            </div>


            <div
                style="
                    display:flex;
                    align-items:center;
                    gap:18px;
                    margin-bottom:24px;
                    padding:16px;
                    border-radius:18px;
                    background:#f5faf7;
                "
            >

                <div
                    id="ngoProfilePhotoPreview"
                    style="
                        width:92px;
                        height:92px;
                        flex:none;
                        border-radius:50%;
                        overflow:hidden;
                        background:#16b84e;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#fff;
                        font-weight:900;
                        font-size:20px;
                    "
                >
                    NGO
                </div>


                <div>

                    <label
                        for="ngoProfilePhotoInput"
                        style="
                            display:inline-block;
                            padding:10px 14px;
                            border-radius:11px;
                            background:#16b84e;
                            color:#fff;
                            cursor:pointer;
                            font-size:13px;
                            font-weight:800;
                        "
                    >
                        Change Profile Photo
                    </label>


                    <input
                        id="ngoProfilePhotoInput"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                    >


                    <p
                        style="
                            margin:8px 0 0;
                            color:#7a867e;
                            font-size:11px;
                        "
                    >
                        PNG, JPG or WebP • Maximum 5 MB
                    </p>

                </div>

            </div>


            <div
                style="
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:16px;
                "
            >

                <div>

                    <label
                        style="
                            display:block;
                            margin-bottom:6px;
                            color:#56645c;
                            font-size:12px;
                            font-weight:800;
                        "
                    >
                        NGO Name
                    </label>


                    <input
                        id="ngoProfileName"
                        type="text"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            padding:12px;
                            border:1px solid #d8e4dc;
                            border-radius:11px;
                            font:inherit;
                        "
                    >

                </div>


                <div>

                    <label
                        style="
                            display:block;
                            margin-bottom:6px;
                            color:#56645c;
                            font-size:12px;
                            font-weight:800;
                        "
                    >
                        Registration Number
                    </label>


                    <input
                        id="ngoProfileRegistration"
                        type="text"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            padding:12px;
                            border:1px solid #d8e4dc;
                            border-radius:11px;
                            font:inherit;
                        "
                    >

                </div>


                <div>

                    <label
                        style="
                            display:block;
                            margin-bottom:6px;
                            color:#56645c;
                            font-size:12px;
                            font-weight:800;
                        "
                    >
                        Verification
                    </label>


                    <input
                        id="ngoProfileVerification"
                        type="text"
                        readonly
                        style="
                            width:100%;
                            box-sizing:border-box;
                            padding:12px;
                            border:1px solid #d8e4dc;
                            border-radius:11px;
                            font:inherit;
                            background:#f7faf8;
                        "
                    >

                </div>


                <div>

                    <label
                        style="
                            display:block;
                            margin-bottom:6px;
                            color:#56645c;
                            font-size:12px;
                            font-weight:800;
                        "
                    >
                        Location
                    </label>


                    <input
                        id="ngoProfileLocation"
                        type="text"
                        readonly
                        style="
                            width:100%;
                            box-sizing:border-box;
                            padding:12px;
                            border:1px solid #d8e4dc;
                            border-radius:11px;
                            font:inherit;
                            background:#f7faf8;
                        "
                    >

                </div>

            </div>


            <div
                style="
                    display:flex;
                    justify-content:flex-end;
                    gap:10px;
                    margin-top:24px;
                "
            >

                <button
                    id="ngoProfileCancel"
                    type="button"
                    style="
                        border:0;
                        border-radius:11px;
                        padding:11px 16px;
                        background:#edf3ef;
                        color:#173024;
                        font-weight:800;
                        cursor:pointer;
                    "
                >
                    Cancel
                </button>


                <button
                    id="ngoProfileSave"
                    type="button"
                    style="
                        border:0;
                        border-radius:11px;
                        padding:11px 18px;
                        background:#16b84e;
                        color:#fff;
                        font-weight:800;
                        cursor:pointer;
                    "
                >
                    Save Changes
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    document
        .getElementById(
            "ngoProfileClose"
        )
        ?.addEventListener(
            "click",
            closeProfileModal
        );


    document
        .getElementById(
            "ngoProfileCancel"
        )
        ?.addEventListener(
            "click",
            closeProfileModal
        );


    document
        .getElementById(
            "ngoProfilePhotoInput"
        )
        ?.addEventListener(
            "change",
            handleProfilePhoto
        );


    document
        .getElementById(
            "ngoProfileSave"
        )
        ?.addEventListener(
            "click",
            saveNGOProfile
        );


    modal.addEventListener(

        "click",

        event => {

            if (
                event.target ===
                modal
            ) {

                closeProfileModal();

            }

        }

    );


    fillProfileModal();

}


function fillProfileModal() {

    const name =
        document.getElementById(
            "ngoProfileName"
        );


    const registration =
        document.getElementById(
            "ngoProfileRegistration"
        );


    const verification =
        document.getElementById(
            "ngoProfileVerification"
        );


    const location =
        document.getElementById(
            "ngoProfileLocation"
        );


    const preview =
        document.getElementById(
            "ngoProfilePhotoPreview"
        );


    if (name) {

        name.value =
            appState.ngoName;

    }


    if (registration) {

        registration.value =
            appState.ngoRegistration;

    }


    if (verification) {

        verification.value =
            getVerificationLabel();

    }


    if (location) {

        const profileLocation =
            appState.currentUser
                ?.location ||
            {};


        const locationParts = [

            profileLocation.locality,

            profileLocation.municipalityOrCity,

            profileLocation.administrativeArea,

            profileLocation.countryName

        ]
            .filter(Boolean);


        location.value =
            locationParts.length
                ? locationParts.join(
                    ", "
                )
                : "Location not available";

    }


    if (preview) {

        renderAvatarElement(

            preview,

            appState.profileImage,

            "NGO"

        );

    }

}


function openProfileModal() {

    createProfileModal();


    const modal =
        document.getElementById(
            "nutricycleNgoProfileModal"
        );


    if (modal) {

        modal.style.display =
            "flex";

    }

}


function closeProfileModal() {

    const modal =
        document.getElementById(
            "nutricycleNgoProfileModal"
        );


    if (modal) {

        modal.style.display =
            "none";

    }


    pendingProfilePhoto =
        null;

}


function handleProfilePhoto(
    event
) {

    const file =
        event.target?.files?.[0];


    if (!file) {

        return;

    }


    const supportedTypes = [

        "image/png",

        "image/jpeg",

        "image/webp"

    ];


    if (
        !supportedTypes.includes(
            file.type
        )
    ) {

        alert(
            "Please select a PNG, JPG or WebP image."
        );

        return;

    }


    if (
        file.size >
        5 * 1024 * 1024
    ) {

        alert(
            "Profile photo must be 5 MB or smaller."
        );

        return;

    }


    pendingProfilePhoto =
        file;


    const preview =
        document.getElementById(
            "ngoProfilePhotoPreview"
        );


    if (preview) {

        const temporaryURL =
            URL.createObjectURL(
                file
            );


        renderAvatarElement(

            preview,

            temporaryURL,

            "NGO"

        );

    }

}


async function saveNGOProfile() {

    const uid =
        appState.currentUser?.uid;


    if (!uid) {

        alert(
            "Your account session is unavailable."
        );

        return;

    }


    const button =
        document.getElementById(
            "ngoProfileSave"
        );


    try {

        if (button) {

            button.disabled =
                true;

            button.textContent =
                "Saving...";

        }


        const name =
            document
                .getElementById(
                    "ngoProfileName"
                )
                ?.value
                .trim() || "";


        const registration =
            document
                .getElementById(
                    "ngoProfileRegistration"
                )
                ?.value
                .trim() || "";


        if (!name) {

            alert(
                "NGO name cannot be empty."
            );

            return;

        }


        let photoURL =
            appState.profileImage;


        if (
            pendingProfilePhoto
        ) {

            const storageReference =
                ref(

                    storage,

                    `profilePhotos/ngo/${uid}/${Date.now()}-${pendingProfilePhoto.name}`

                );


            const uploadResult =
                await uploadBytes(

                    storageReference,

                    pendingProfilePhoto

                );


            photoURL =
                await getDownloadURL(
                    uploadResult.ref
                );

        }


        await updateDoc(

            doc(
                db,
                "users",
                uid
            ),

            {

                "roleDetails.ngoName":
                    name,

                "roleDetails.ngoRegistration":
                    registration,

                "profile.profileImage":
                    photoURL || "",

                updatedAt:
                    serverTimestamp()

            }

        );


        appState.ngoName =
            name;


        appState.ngoRegistration =
            registration;


        appState.profileImage =
            photoURL || "";


        appState.currentUser = {

            ...appState.currentUser,

            roleDetails: {

                ...(
                    appState.currentUser
                        ?.roleDetails ||
                    {}
                ),

                ngoName:
                    name,

                ngoRegistration:
                    registration

            },

            profile: {

                ...(
                    appState.currentUser
                        ?.profile ||
                    {}
                ),

                profileImage:
                    photoURL || ""

            }

        };


        updateProfile();


        closeProfileModal();


        alert(
            "NGO profile updated successfully."
        );

    }

    catch (error) {

        console.error(

            "NutriCycle AI — NGO profile update failed:",

            error

        );


        alert(

            "Profile update failed. Please check Firebase Storage and Firestore permissions."

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
   DONATION LISTENER
============================================================ */

function startDonationListener() {

    if (
        appState.donationUnsubscribe
    ) {

        appState
            .donationUnsubscribe();

        appState.donationUnsubscribe =
            null;

    }


    const donationsQuery =
        query(

            collection(
                db,
                "donations"
            ),

            orderBy(
                "createdAt",
                "desc"
            )

        );


    appState.donationUnsubscribe =

        onSnapshot(

            donationsQuery,

            snapshot => {

                appState.allDonations =

                    snapshot.docs.map(

                        donationDoc => ({

                            firestoreId:
                                donationDoc.id,

                            ...donationDoc.data()

                        })

                    );


                rebuildDashboard();

            },


            error => {

                console.error(

                    "NutriCycle AI — Donation listener error:",

                    error

                );


                showEmptyState(

                    ui.incomingContainer,

                    "fa-solid fa-triangle-exclamation",

                    "Donation Feed Unavailable",

                    "The live donation feed could not be loaded."

                );

            }

        );

}


/* ============================================================
   NEARBY DONATION DISCOVERY
============================================================ */

function buildNearbyDonations() {

    const candidates = [];


    for (
        const donation of
        appState.allDonations
    ) {

        if (
            isRejected(
                donation
            )
        ) {

            continue;

        }


        if (
            isCompleted(
                donation
            )
        ) {

            continue;

        }


        if (
            isAcceptedByAnyNGO(
                donation
            )
        ) {

            continue;

        }


        const match =
            donorMatchesNGOArea(
                donation
            );


        if (!match) {

            continue;

        }


        if (!match.matched) {

            continue;

        }


        candidates.push({

            ...donation,

            nearbyDistanceKm:
                match.distance

        });

    }


    candidates.sort(

        (a, b) => {

            const distanceA =
                Number.isFinite(
                    a.nearbyDistanceKm
                )
                    ? a.nearbyDistanceKm
                    : Number.POSITIVE_INFINITY;


            const distanceB =
                Number.isFinite(
                    b.nearbyDistanceKm
                )
                    ? b.nearbyDistanceKm
                    : Number.POSITIVE_INFINITY;


            if (
                distanceA !==
                distanceB
            ) {

                return (
                    distanceA -
                    distanceB
                );

            }


            const dateA =
                getDateObject(
                    a.createdAt
                )?.getTime() ||
                0;


            const dateB =
                getDateObject(
                    b.createdAt
                )?.getTime() ||
                0;


            return (
                dateB -
                dateA
            );

        }

    );


    appState.nearbyDonations =
        candidates.slice(

            0,

            CONFIG.maximumNearbyRequests

        );


    appState.incomingDonations =
        appState.nearbyDonations;

}


/* ============================================================
   PICKUPS
============================================================ */

function buildPickups() {

    appState.assignedPickups =

        appState.allDonations.filter(

            donation =>

                isAcceptedByThisNGO(
                    donation
                )

        );

}


/* ============================================================
   INVENTORY
============================================================ */

function buildInventory() {

    appState.inventory =

        appState.assignedPickups.filter(
            isCompleted
        );

}


/* ============================================================
   ACTIVITIES
============================================================ */

function buildActivities() {

    appState.activities =

        appState.assignedPickups

            .slice(
                0,
                20
            )

            .map(

                donation => ({

                    type:
                        isCompleted(
                            donation
                        )

                            ? "Donation Delivered"

                            : "Donation Accepted",

                    foodName:
                        donation.foodName ||
                        "Food Donation",

                    timestamp:
                        donation.updatedAt ||
                        donation.acceptedAt ||
                        donation.createdAt

                })

            );

}


/* ============================================================
   PERIOD HELPERS
============================================================ */

function startOfDay(
    date = new Date()
) {

    const result =
        new Date(
            date
        );


    result.setHours(
        0,
        0,
        0,
        0
    );


    return result;

}


function startOfMonth(
    date = new Date()
) {

    const result =
        new Date(
            date
        );


    result.setDate(
        1
    );


    result.setHours(
        0,
        0,
        0,
        0
    );


    return result;

}


function startOfYear(
    date = new Date()
) {

    const result =
        new Date(
            date
        );


    result.setMonth(
        0,
        1
    );


    result.setHours(
        0,
        0,
        0,
        0
    );


    return result;

}


function endOfCurrentPeriod(
    mode,
    date = new Date()
) {

    if (
        mode ===
        "daily"
    ) {

        const result =
            startOfDay(
                date
            );


        result.setDate(
            result.getDate() +
            1
        );


        return result;

    }


    if (
        mode ===
        "monthly"
    ) {

        const result =
            startOfMonth(
                date
            );


        result.setMonth(
            result.getMonth() +
            1
        );


        return result;

    }


    const result =
        startOfYear(
            date
        );


    result.setFullYear(
        result.getFullYear() +
        1
    );


    return result;

}


function donationInPeriod(
    donation,
    mode,
    referenceDate =
        new Date()
) {

    const date =
        getDateObject(
            donation.createdAt ||
            donation.updatedAt ||
            donation.acceptedAt
        );


    if (!date) {

        return false;

    }


    let start;


    if (
        mode ===
        "daily"
    ) {

        start =
            startOfDay(
                referenceDate
            );

    }


    else if (
        mode ===
        "monthly"
    ) {

        start =
            startOfMonth(
                referenceDate
            );

    }


    else {

        start =
            startOfYear(
                referenceDate
            );

    }


    const end =
        endOfCurrentPeriod(
            mode,
            referenceDate
        );


    return (

        date >=
            start &&

        date <
            end

    );

}


/* ============================================================
   ANALYTICS VALUES
============================================================ */

function getPeriodStatistics(
    mode,
    referenceDate =
        new Date()
) {

    const relevant =
        appState.assignedPickups
            .filter(
                donation =>
                    donationInPeriod(
                        donation,
                        mode,
                        referenceDate
                    )
            );


    const completed =
        relevant.filter(
            isCompleted
        );


    const totalDonations =
        relevant.length;


    const activePickups =
        relevant.filter(

            donation =>
                !isCompleted(
                    donation
                )

        ).length;


    const foodSaved =
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


    const mealsServed =
        completed.reduce(

            (
                total,
                donation
            ) => {

                const directMeals =
                    Number(

                        donation.mealsServed ??

                        donation.meals ??

                        0

                    );


                return (

                    Number.isFinite(
                        directMeals
                    )

                    &&

                    directMeals > 0

                )

                    ? total +
                        directMeals

                    :

                    total;

            },

            0

        );


    return {

        totalDonations,

        activePickups,

        foodSaved,

        mealsServed

    };

}


function shiftReferenceDate(
    mode,
    referenceDate,
    amount
) {

    const result =
        new Date(
            referenceDate
        );


    if (
        mode ===
        "daily"
    ) {

        result.setDate(
            result.getDate() +
            amount
        );

    }

    else if (
        mode ===
        "monthly"
    ) {

        result.setMonth(
            result.getMonth() +
            amount
        );

    }

    else {

        result.setFullYear(
            result.getFullYear() +
            amount
        );

    }


    return result;

}


function getComparableProgress(
    mode
) {

    const now =
        new Date();


    const current =
        getPeriodStatistics(
            mode,
            now
        );


    const historyLength =

        mode ===
        "daily"

            ? CONFIG.analyticsHistoryDays

            : mode ===
              "monthly"

                ? CONFIG.analyticsHistoryMonths

                : CONFIG.analyticsHistoryYears;


    const values =
        [];


    for (
        let index = 0;
        index < historyLength;
        index++
    ) {

        const reference =
            shiftReferenceDate(

                mode,

                now,

                -index

            );


        const statistics =
            getPeriodStatistics(

                mode,

                reference

            );


        values.push(
            statistics.totalDonations
        );

    }


    const maximum =
        Math.max(
            ...values,
            1
        );


    const magnitude =
        Math.min(

            100,

            Math.round(

                (
                    current.totalDonations /
                    maximum

                ) *

                100

            )

        );


    return {

        current,

        maximum,

        magnitude

    };

}


/* ============================================================
   DASHBOARD STATISTICS
============================================================ */

function updateDashboardStatistics() {

    const all =
        appState.allDonations
            .filter(
                donation =>
                    !isRejected(
                        donation
                    )
            );


    const accepted =
        appState.assignedPickups;


    const completed =
        accepted.filter(
            isCompleted
        );


    appState.statistics.totalDonations =
        all.length;


    appState.statistics.activePickups =
        accepted.filter(

            donation =>
                !isCompleted(
                    donation
                )

        ).length;


    appState.statistics.foodSaved =
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


    appState.statistics.mealsServed =
        completed.reduce(

            (
                total,
                donation
            ) => {

                const meals =
                    Number(

                        donation.mealsServed ??

                        donation.meals ??

                        0

                    );


                return (

                    Number.isFinite(
                        meals
                    )

                    &&

                    meals > 0

                )

                    ? total +
                        meals

                    :

                    total;

            },

            0

        );


    renderDashboardStatistics();

}


function renderDashboardStatistics() {

    setStatValue(

        ui.totalDonations,

        appState.statistics
            .totalDonations

    );


    setStatValue(

        ui.activePickups,

        appState.statistics
            .activePickups

    );


    setStatValue(

        ui.foodSaved,

        `${formatNumber(
            appState.statistics
                .foodSaved
        )} kg`

    );


    setStatValue(

        ui.mealsServed,

        appState.statistics
            .mealsServed

    );

}


function setStatValue(
    container,
    value
) {

    const element =
        container?.querySelector(
            "h2"
        );


    if (element) {

        element.textContent =
            String(
                value
            );

    }

}


/* ============================================================
   CIRCULAR ANALYTICS
============================================================ */

function injectAnalyticsStyles() {

    if (
        document.getElementById(
            "nutricycle-circular-analytics-style"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "nutricycle-circular-analytics-style";


    style.textContent = `

        .nutricycle-analytics-panel {

            margin-top:
                26px;

            padding:
                28px;

            border:
                1px solid #dce9e1;

            border-radius:
                24px;

            background:
                linear-gradient(
                    145deg,
                    #ffffff,
                    #f4faf6
                );

            box-shadow:
                0 18px 44px rgba(
                    20,
                    70,
                    40,
                    .08
                );

        }


        .nutricycle-analytics-header {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                flex-start;

            gap:
                18px;

            margin-bottom:
                24px;

        }


        .nutricycle-analytics-title {

            margin:
                0;

            color:
                #173024;

            font-size:
                25px;

            font-weight:
                900;

        }


        .nutricycle-analytics-description {

            margin:
                7px 0 0;

            color:
                #718078;

            font-size:
                13px;

            line-height:
                1.5;

        }


        .nutricycle-period-switch {

            display:
                inline-flex;

            padding:
                4px;

            border:
                1px solid #dce8df;

            border-radius:
                12px;

            background:
                #f3f7f4;

        }


        .nutricycle-period-button {

            border:
                0;

            background:
                transparent;

            color:
                #718078;

            padding:
                8px 13px;

            border-radius:
                9px;

            cursor:
                pointer;

            font:
                inherit;

            font-size:
                12px;

            font-weight:
                800;

        }


        .nutricycle-period-button.active {

            background:
                #16b84e;

            color:
                #ffffff;

            box-shadow:
                0 5px 13px rgba(
                    22,
                    184,
                    78,
                    .18
                );

        }


        .nutricycle-analytics-layout {

            display:
                grid;

            grid-template-columns:
                minmax(
                    280px,
                    1fr
                )

                minmax(
                    320px,
                    1.15fr
                );

            gap:
                34px;

            align-items:
                center;

        }


        .nutricycle-ring-zone {

            display:
                flex;

            justify-content:
                center;

            align-items:
                center;

        }


        .nutricycle-circular-ring {

            --progress:
                0%;

            width:
                255px;

            height:
                255px;

            border-radius:
                50%;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            position:
                relative;

            background:

                conic-gradient(
                    #16b84e
                    var(--progress),

                    #e5eee8
                    var(--progress)
                );

            box-shadow:
                0 18px 45px rgba(
                    22,
                    184,
                    78,
                    .14
                );

            transition:
                background 0.75s ease;

        }


        .nutricycle-circular-ring::before {

            content:
                "";

            position:
                absolute;

            inset:
                21px;

            border-radius:
                50%;

            background:
                #ffffff;

            box-shadow:
                inset 0 0 0 1px #edf3ef;

        }


        .nutricycle-ring-content {

            position:
                relative;

            z-index:
                2;

            text-align:
                center;

        }


        .nutricycle-ring-value {

            font-size:
                44px;

            line-height:
                1;

            font-weight:
                900;

            color:
                #173024;

        }


        .nutricycle-ring-label {

            margin-top:
                8px;

            font-size:
                13px;

            color:
                #5e6d64;

            font-weight:
                800;

        }


        .nutricycle-ring-period {

            margin-top:
                5px;

            color:
                #9aa69f;

            font-size:
                11px;

        }


        .nutricycle-analytics-metrics {

            display:
                grid;

            grid-template-columns:
                repeat(
                    2,
                    minmax(
                        0,
                        1fr
                    )
                );

            gap:
                14px;

        }


        .nutricycle-analytics-card {

            padding:
                17px;

            border:
                1px solid #e1ebe5;

            border-radius:
                17px;

            background:
                #ffffff;

            box-shadow:
                0 8px 21px rgba(
                    25,
                    70,
                    45,
                    .05
                );

        }


        .nutricycle-analytics-card-top {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;

            gap:
                10px;

        }


        .nutricycle-analytics-icon {

            width:
                38px;

            height:
                38px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            border-radius:
                11px;

            background:
                #eaf8ef;

            color:
                #16a34a;

        }


        .nutricycle-analytics-percent {

            color:
                #16a34a;

            font-size:
                11px;

            font-weight:
                900;

        }


        .nutricycle-analytics-value {

            margin-top:
                13px;

            font-size:
                25px;

            color:
                #173024;

            font-weight:
                900;

        }


        .nutricycle-analytics-label {

            margin-top:
                3px;

            color:
                #718078;

            font-size:
                12px;

            font-weight:
                700;

        }


        .nutricycle-analytics-track {

            height:
                7px;

            margin-top:
                11px;

            border-radius:
                999px;

            overflow:
                hidden;

            background:
                #edf3ef;

        }


        .nutricycle-analytics-progress {

            height:
                100%;

            width:
                0%;

            border-radius:
                inherit;

            background:
                linear-gradient(
                    90deg,
                    #16a34a,
                    #36ca6c
                );

            transition:
                width .75s ease;

        }


        .nutricycle-analytics-footer {

            margin-top:
                19px;

            padding:
                13px 15px;

            border-radius:
                13px;

            background:
                #f2f8f4;

            color:
                #617168;

            font-size:
                12px;

            line-height:
                1.5;

        }


        @media(max-width:850px){

            .nutricycle-analytics-header{

                flex-direction:
                    column;

            }


            .nutricycle-analytics-layout{

                grid-template-columns:
                    1fr;

            }

        }


        @media(max-width:620px){

            .nutricycle-analytics-metrics{

                grid-template-columns:
                    1fr;

            }


            .nutricycle-period-switch{

                width:
                    100%;

            }


            .nutricycle-period-button{

                flex:
                    1;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


function ensureAnalyticsPanel() {

    let panel =
        document.getElementById(
            "nutricycleAnalyticsPanel"
        );


    if (panel) {

        return panel;

    }


    injectAnalyticsStyles();


    panel =
        document.createElement(
            "section"
        );


    panel.id =
        "nutricycleAnalyticsPanel";


    panel.className =
        "nutricycle-analytics-panel";


    panel.innerHTML = `

        <div
            class="nutricycle-analytics-header"
        >

            <div>

                <h2
                    class="nutricycle-analytics-title"
                >
                    Impact Analytics
                </h2>

                <p
                    class="nutricycle-analytics-description"
                >
                    Track your NGO's donation progress by time period.
                </p>

            </div>


            <div
                class="nutricycle-period-switch"
                role="group"
                aria-label="Analytics period"
            >

                <button
                    type="button"
                    class="nutricycle-period-button"
                    data-period="daily"
                >
                    Daily
                </button>


                <button
                    type="button"
                    class="nutricycle-period-button"
                    data-period="monthly"
                >
                    Monthly
                </button>


                <button
                    type="button"
                    class="nutricycle-period-button"
                    data-period="annual"
                >
                    Annual
                </button>

            </div>

        </div>


        <div
            class="nutricycle-analytics-layout"
        >

            <div
                class="nutricycle-ring-zone"
            >

                <div
                    id="ngoCircularRing"
                    class="nutricycle-circular-ring"
                >

                    <div
                        class="nutricycle-ring-content"
                    >

                        <div
                            id="ngoCircularValue"
                            class="nutricycle-ring-value"
                        >
                            0
                        </div>

                        <div
                            class="nutricycle-ring-label"
                        >
                            Donations
                        </div>

                        <div
                            id="ngoCircularPeriod"
                            class="nutricycle-ring-period"
                        >
                            Monthly
                        </div>

                    </div>

                </div>

            </div>


            <div
                class="nutricycle-analytics-metrics"
            >

                <div
                    class="nutricycle-analytics-card"
                >

                    <div
                        class="nutricycle-analytics-card-top"
                    >

                        <div
                            class="nutricycle-analytics-icon"
                        >

                            <i
                                class="fa-solid fa-box-open"
                            ></i>

                        </div>


                        <span
                            id="ngoAnalyticsDonationPercent"
                            class="nutricycle-analytics-percent"
                        >
                            0%
                        </span>

                    </div>


                    <div
                        id="ngoAnalyticsDonationValue"
                        class="nutricycle-analytics-value"
                    >
                        0
                    </div>


                    <div
                        class="nutricycle-analytics-label"
                    >
                        Donations
                    </div>


                    <div
                        class="nutricycle-analytics-track"
                    >

                        <div
                            id="ngoAnalyticsDonationProgress"
                            class="nutricycle-analytics-progress"
                        ></div>

                    </div>

                </div>


                <div
                    class="nutricycle-analytics-card"
                >

                    <div
                        class="nutricycle-analytics-card-top"
                    >

                        <div
                            class="nutricycle-analytics-icon"
                        >

                            <i
                                class="fa-solid fa-leaf"
                            ></i>

                        </div>


                        <span
                            id="ngoAnalyticsFoodPercent"
                            class="nutricycle-analytics-percent"
                        >
                            0%
                        </span>

                    </div>


                    <div
                        id="ngoAnalyticsFoodValue"
                        class="nutricycle-analytics-value"
                    >
                        0 kg
                    </div>


                    <div
                        class="nutricycle-analytics-label"
                    >
                        Food Saved
                    </div>


                    <div
                        class="nutricycle-analytics-track"
                    >

                        <div
                            id="ngoAnalyticsFoodProgress"
                            class="nutricycle-analytics-progress"
                        ></div>

                    </div>

                </div>


                <div
                    class="nutricycle-analytics-card"
                >

                    <div
                        class="nutricycle-analytics-card-top"
                    >

                        <div
                            class="nutricycle-analytics-icon"
                        >

                            <i
                                class="fa-solid fa-utensils"
                            ></i>

                        </div>


                        <span
                            id="ngoAnalyticsMealPercent"
                            class="nutricycle-analytics-percent"
                        >
                            0%
                        </span>

                    </div>


                    <div
                        id="ngoAnalyticsMealValue"
                        class="nutricycle-analytics-value"
                    >
                        0
                    </div>


                    <div
                        class="nutricycle-analytics-label"
                    >
                        Meals Supported
                    </div>


                    <div
                        class="nutricycle-analytics-track"
                    >

                        <div
                            id="ngoAnalyticsMealProgress"
                            class="nutricycle-analytics-progress"
                        ></div>

                    </div>

                </div>


                <div
                    class="nutricycle-analytics-card"
                >

                    <div
                        class="nutricycle-analytics-card-top"
                    >

                        <div
                            class="nutricycle-analytics-icon"
                        >

                            <i
                                class="fa-solid fa-truck-fast"
                            ></i>

                        </div>


                        <span
                            id="ngoAnalyticsPickupPercent"
                            class="nutricycle-analytics-percent"
                        >
                            0%
                        </span>

                    </div>


                    <div
                        id="ngoAnalyticsPickupValue"
                        class="nutricycle-analytics-value"
                    >
                        0
                    </div>


                    <div
                        class="nutricycle-analytics-label"
                    >
                        Active Pickups
                    </div>


                    <div
                        class="nutricycle-analytics-track"
                    >

                        <div
                            id="ngoAnalyticsPickupProgress"
                            class="nutricycle-analytics-progress"
                        ></div>

                    </div>

                </div>

            </div>

        </div>


        <div
            id="ngoAnalyticsFooter"
            class="nutricycle-analytics-footer"
        >
            Monthly analytics are based on the NGO's live donation records.
        </div>

    `;


    const activitySection =
        document.getElementById(
            "activitySection"
        );


    if (
        activitySection?.parentElement
    ) {

        activitySection.before(
            panel
        );

    }

    else {

        document
            .querySelector(
                ".main-content"
            )
            ?.appendChild(
                panel
            );

    }


    panel
        .querySelectorAll(
            "[data-period]"
        )
        .forEach(

            button => {

                button.addEventListener(

                    "click",

                    () => {

                        appState.analyticsMode =
                            button.dataset.period;

                        updateAnalytics();

                    }

                );

            }

        );


    return panel;

}


function getModeLabel(
    mode
) {

    if (
        mode ===
        "daily"
    ) {

        return "Daily";

    }


    if (
        mode ===
        "monthly"
    ) {

        return "Monthly";

    }


    return "Annual";

}


function updateAnalytics() {

    const panel =
        ensureAnalyticsPanel();


    if (!panel) {

        return;

    }


    const mode =
        appState.analyticsMode;


    const progress =
        getComparableProgress(
            mode
        );


    const current =
        progress.current;


    const donationMagnitude =
        progress.magnitude;


    const currentFood =
        current.foodSaved;


    const currentMeals =
        current.mealsServed;


    const currentPickups =
        current.activePickups;


    const maxFood =
        Math.max(
            currentFood,
            1
        );


    const maxMeals =
        Math.max(
            currentMeals,
            1
        );


    const maxPickups =
        Math.max(
            currentPickups,
            1
        );


    const foodMagnitude =
        Math.min(

            100,

            Math.round(

                (
                    currentFood /
                    maxFood

                ) *

                100

            )

        );


    const mealMagnitude =
        Math.min(

            100,

            Math.round(

                (
                    currentMeals /
                    maxMeals

                ) *

                100

            )

        );


    const pickupMagnitude =
        Math.min(

            100,

            Math.round(

                (
                    currentPickups /
                    maxPickups

                ) *

                100

            )

        );


    const ring =
        document.getElementById(
            "ngoCircularRing"
        );


    if (ring) {

        ring.style.setProperty(

            "--progress",

            `${donationMagnitude}%`

        );

    }


    const circularValue =
        document.getElementById(
            "ngoCircularValue"
        );


    if (
        circularValue
    ) {

        circularValue.textContent =
            formatNumber(
                current.totalDonations
            );

    }


    const periodLabel =
        document.getElementById(
            "ngoCircularPeriod"
        );


    if (
        periodLabel
    ) {

        periodLabel.textContent =
            getModeLabel(
                mode
            );

    }


    updateAnalyticsMetric(

        "ngoAnalyticsDonationValue",

        "ngoAnalyticsDonationPercent",

        "ngoAnalyticsDonationProgress",

        current.totalDonations,

        donationMagnitude

    );


    updateAnalyticsMetric(

        "ngoAnalyticsFoodValue",

        "ngoAnalyticsFoodPercent",

        "ngoAnalyticsFoodProgress",

        `${formatNumber(
            currentFood
        )} kg`,

        foodMagnitude

    );


    updateAnalyticsMetric(

        "ngoAnalyticsMealValue",

        "ngoAnalyticsMealPercent",

        "ngoAnalyticsMealProgress",

        currentMeals,

        mealMagnitude

    );


    updateAnalyticsMetric(

        "ngoAnalyticsPickupValue",

        "ngoAnalyticsPickupPercent",

        "ngoAnalyticsPickupProgress",

        currentPickups,

        pickupMagnitude

    );


    panel
        .querySelectorAll(
            "[data-period]"
        )
        .forEach(

            button => {

                button.classList.toggle(

                    "active",

                    button.dataset.period ===
                        mode

                );

            }

        );


    const footer =
        document.getElementById(
            "ngoAnalyticsFooter"
        );


    if (footer) {

        footer.textContent =

            `${getModeLabel(
                mode
            )} analytics are calculated from the NGO's live donation records. The circular graph keeps the same structure and changes only according to the selected period's magnitude.`;

    }

}


function updateAnalyticsMetric(

    valueId,

    percentId,

    progressId,

    value,

    percentage

) {

    const valueElement =
        document.getElementById(
            valueId
        );


    const percentElement =
        document.getElementById(
            percentId
        );


    const progressElement =
        document.getElementById(
            progressId
        );


    if (
        valueElement
    ) {

        valueElement.textContent =
            formatNumber(
                value
            );

    }


    if (
        percentElement
    ) {

        percentElement.textContent =
            `${percentage}%`;

    }


    if (
        progressElement
    ) {

        progressElement.style.width =
            `${percentage}%`;

    }

}


/* ============================================================
   INCOMING DONATION UI
============================================================ */

function injectDonationStyles() {

    if (
        document.getElementById(
            "nutricycle-ngo-donation-style"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "nutricycle-ngo-donation-style";


    style.textContent = `

        .nutricycle-ngo-donation-card {

            display:
                flex;

            justify-content:
                space-between;

            align-items:
                center;

            gap:
                20px;

            padding:
                20px;

            margin-bottom:
                14px;

            border:
                1px solid #dbe7df;

            border-radius:
                18px;

            background:
                #ffffff;

            box-shadow:
                0 10px 28px rgba(
                    15,
                    60,
                    35,
                    .07
                );

            transition:
                transform .2s ease,
                box-shadow .2s ease;

        }


        .nutricycle-ngo-donation-card:hover {

            transform:
                translateY(-2px);

            box-shadow:
                0 15px 32px rgba(
                    15,
                    60,
                    35,
                    .11
                );

        }


        .nutricycle-ngo-donation-main {

            flex:
                1;

            min-width:
                0;

        }


        .nutricycle-ngo-donation-title {

            font-size:
                18px;

            font-weight:
                900;

            color:
                #173024;

        }


        .nutricycle-ngo-donation-meta {

            display:
                flex;

            flex-wrap:
                wrap;

            gap:
                7px;

            margin-top:
                10px;

        }


        .nutricycle-ngo-donation-pill {

            padding:
                6px 10px;

            border-radius:
                999px;

            background:
                #f0f6f2;

            color:
                #54645a;

            font-size:
                11px;

            font-weight:
                800;

        }


        .nutricycle-ngo-donation-distance {

            color:
                #16a34a;

            font-weight:
                900;

        }


        .nutricycle-ngo-donation-actions {

            display:
                flex;

            flex-direction:
                column;

            gap:
                8px;

            min-width:
                112px;

        }


        .nutricycle-ngo-donation-actions button {

            border:
                0;

            border-radius:
                11px;

            padding:
                10px 13px;

            cursor:
                pointer;

            font:
                inherit;

            font-weight:
                800;

        }


        .nutricycle-ngo-view-button {

            background:
                #edf4ef;

            color:
                #173024;

        }


        .nutricycle-ngo-accept-button {

            background:
                #16b84e;

            color:
                #ffffff;

        }


        .nutricycle-ngo-empty {

            padding:
                34px 22px;

            text-align:
                center;

            border:
                1px dashed #cbd9cf;

            border-radius:
                18px;

            background:
                #f8fbf9;

        }


        .nutricycle-ngo-empty i {

            display:
                block;

            margin-bottom:
                12px;

            color:
                #16a34a;

            font-size:
                30px;

        }


        .nutricycle-ngo-empty h3 {

            margin:
                0;

            color:
                #173024;

        }


        .nutricycle-ngo-empty p {

            margin:
                8px 0 0;

            color:
                #718078;

            line-height:
                1.5;

        }


        @media(max-width:650px){

            .nutricycle-ngo-donation-card{

                flex-direction:
                    column;

                align-items:
                    stretch;

            }


            .nutricycle-ngo-donation-actions{

                flex-direction:
                    row;

                min-width:
                    auto;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


function renderIncomingDonations(
    donations =
        appState.incomingDonations
) {

    injectDonationStyles();


    const container =
        ui.incomingContainer;


    if (!container) {

        return;

    }


    if (
        !donations.length
    ) {

        container.className =
            "nutricycle-ngo-empty";


        const locationMessage =
            appState.ngoLocation

                ? `No unassigned donation requests were found within ${CONFIG.nearbyRadiusKm} km of your NGO location.`

                : "Nearby matching requires a verified NGO location with coordinates.";

        container.innerHTML = `

            <i
                class="fa-solid fa-location-dot"
            ></i>

            <h3>
                No Nearby Donation Requests
            </h3>

            <p>
                ${escapeHTML(
                    locationMessage
                )}
            </p>

        `;

        return;

    }


    container.className =
        "";


    container.innerHTML =
        "";


    donations
        .forEach(

            donation => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "nutricycle-ngo-donation-card";


                const distanceText =

                    Number.isFinite(
                        donation.nearbyDistanceKm
                    )

                        ? formatDistance(
                            donation.nearbyDistanceKm
                        )

                        : "Nearby";



                card.innerHTML = `

                    <div
                        class="nutricycle-ngo-donation-main"
                    >

                        <div
                            class="nutricycle-ngo-donation-title"
                        >
                            ${escapeHTML(
                                donation.foodName ||
                                "Food Donation"
                            )}
                        </div>


                        <div
                            style="
                                margin-top:5px;
                                color:#718078;
                                font-size:13px;
                            "
                        >
                            From
                            <strong>
                                ${escapeHTML(
                                    donation.donorName ||
                                    "Food Donor"
                                )}
                            </strong>
                        </div>


                        <div
                            class="nutricycle-ngo-donation-meta"
                        >

                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                📦
                                ${escapeHTML(
                                    `${donation.quantity ?? "—"} ${
                                        donation.unit || ""
                                    }`
                                )}
                            </span>


                            <span
                                class="nutricycle-ngo-donation-pill nutricycle-ngo-donation-distance"
                            >
                                📍
                                ${escapeHTML(
                                    distanceText
                                )}
                            </span>


                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                📅
                                ${escapeHTML(
                                    formatDate(
                                        donation.createdAt
                                    )
                                )}
                            </span>


                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                🕒
                                ${escapeHTML(
                                    donation.freshness ||
                                    "Freshness unavailable"
                                )}
                            </span>

                        </div>

                    </div>


                    <div
                        class="nutricycle-ngo-donation-actions"
                    >

                        <button
                            type="button"
                            class="nutricycle-ngo-view-button"
                            data-view-donation
                        >
                            View
                        </button>


                        <button
                            type="button"
                            class="nutricycle-ngo-accept-button"
                            data-accept-donation
                        >
                            Accept
                        </button>

                    </div>

                `;


                card
                    .querySelector(
                        "[data-view-donation]"
                    )
                    ?.addEventListener(

                        "click",

                        () =>
                            showDonationDetails(
                                donation
                            )

                    );


                card
                    .querySelector(
                        "[data-accept-donation]"
                    )
                    ?.addEventListener(

                        "click",

                        () =>
                            acceptDonation(
                                donation
                            )

                    );


                container.appendChild(
                    card
                );

            }

        );

}


/* ============================================================
   DONATION DETAILS
============================================================ */

function showDonationDetails(
    donation
) {

    const location =
        extractDonationLocation(
            donation
        );


    const details = [

        `Food: ${
            donation.foodName ||
            "Unknown"
        }`,

        `Quantity: ${
            donation.quantity ??
            "—"
        } ${
            donation.unit ||
            ""
        }`,

        `Donor: ${
            donation.donorName ||
            "Food Donor"
        }`,

        `Freshness: ${
            donation.freshness ||
            "Not available"
        }`,

        `Shelf life: ${
            donation.shelfLife ||
            "Not available"
        }`,

        `Created: ${
            formatDate(
                donation.createdAt
            )
        }`,

        location

            ? `Coordinates: ${
                location.latitude.toFixed(5)
            }, ${
                location.longitude.toFixed(5)
            }`

            : "Location: Not available"

    ];


    alert(
        details.join(
            "\n"
        )
    );

}


/* ============================================================
   ACCEPT DONATION
============================================================ */

async function acceptDonation(
    donation
) {

    if (
        !donation?.firestoreId
    ) {

        alert(
            "Invalid donation record."
        );

        return;

    }


    const confirmed =
        window.confirm(

            `Accept ${
                donation.foodName ||
                "this donation"
            } for ${
                appState.ngoName
            }?`

        );


    if (!confirmed) {

        return;

    }


    try {

        await updateDoc(

            doc(

                db,

                "donations",

                donation.firestoreId

            ),

            {

                status:
                    "NGO Accepted",

                acceptedBy:
                    appState.currentUser.uid,

                acceptedByNGO:
                    appState.ngoName,

                acceptedAt:
                    serverTimestamp(),

                updatedAt:
                    serverTimestamp()

            }

        );


        console.log(

            "NutriCycle AI — Nearby donation accepted:",

            donation.firestoreId

        );

    }


    catch (error) {

        console.error(

            "NutriCycle AI — Donation acceptance failed:",

            error

        );


        alert(

            "The donation could not be accepted. Check Firebase permissions."

        );

    }

}


/* ============================================================
   PICKUPS
============================================================ */

function renderPickups() {

    if (
        !ui.pickupContainer
    ) {

        return;

    }


    if (
        !appState.assignedPickups.length
    ) {

        showEmptyState(

            ui.pickupContainer,

            "fa-solid fa-truck",

            "No Active Pickups",

            "Donations accepted by your NGO will appear here."

        );

        return;

    }


    ui.pickupContainer.className =
        "";


    ui.pickupContainer.innerHTML =
        "";


    appState.assignedPickups
        .forEach(

            pickup => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "nutricycle-ngo-donation-card";


                card.innerHTML = `

                    <div
                        class="nutricycle-ngo-donation-main"
                    >

                        <div
                            class="nutricycle-ngo-donation-title"
                        >
                            ${escapeHTML(
                                pickup.foodName ||
                                "Food Donation"
                            )}
                        </div>


                        <div
                            class="nutricycle-ngo-donation-meta"
                        >

                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                📦
                                ${escapeHTML(
                                    `${pickup.quantity ?? 0} ${
                                        pickup.unit || ""
                                    }`
                                )}
                            </span>


                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                👤
                                ${escapeHTML(
                                    pickup.donorName ||
                                    "Food Donor"
                                )}
                            </span>


                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                🚚
                                ${escapeHTML(
                                    pickup.status ||
                                    "NGO Accepted"
                                )}
                            </span>

                        </div>

                    </div>

                `;


                ui.pickupContainer
                    .appendChild(
                        card
                    );

            }

        );

}


/* ============================================================
   INVENTORY
============================================================ */

function renderInventory() {

    if (
        !ui.inventoryContainer
    ) {

        return;

    }


    if (
        !appState.inventory.length
    ) {

        showEmptyState(

            ui.inventoryContainer,

            "fa-solid fa-warehouse",

            "Inventory Empty",

            "Successfully delivered donations will appear here."

        );

        return;

    }


    ui.inventoryContainer.className =
        "";


    ui.inventoryContainer.innerHTML =
        "";


    appState.inventory
        .forEach(

            donation => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "nutricycle-ngo-donation-card";


                card.innerHTML = `

                    <div
                        class="nutricycle-ngo-donation-main"
                    >

                        <div
                            class="nutricycle-ngo-donation-title"
                        >
                            ${escapeHTML(
                                donation.foodName ||
                                "Food"
                            )}
                        </div>


                        <div
                            class="nutricycle-ngo-donation-meta"
                        >

                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                📦
                                ${escapeHTML(
                                    `${donation.quantity ?? 0} ${
                                        donation.unit || ""
                                    }`
                                )}
                            </span>


                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                ✅ Delivered
                            </span>

                        </div>

                    </div>

                `;


                ui.inventoryContainer
                    .appendChild(
                        card
                    );

            }

        );

}


/* ============================================================
   ACTIVITY
============================================================ */

function renderActivity() {

    if (
        !ui.activityContainer
    ) {

        return;

    }


    if (
        !appState.activities.length
    ) {

        showEmptyState(

            ui.activityContainer,

            "fa-solid fa-clock-rotate-left",

            "No Recent Activity",

            "Accepted donations and deliveries will appear here."

        );

        return;

    }


    ui.activityContainer.className =
        "";


    ui.activityContainer.innerHTML =
        "";


    appState.activities
        .forEach(

            activity => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "nutricycle-ngo-donation-card";


                card.innerHTML = `

                    <div
                        class="nutricycle-ngo-donation-main"
                    >

                        <div
                            class="nutricycle-ngo-donation-title"
                        >
                            ${escapeHTML(
                                activity.type
                            )}
                        </div>


                        <div
                            style="
                                margin-top:5px;
                                color:#718078;
                                font-size:13px;
                            "
                        >
                            ${escapeHTML(
                                activity.foodName
                            )}
                        </div>


                        <div
                            class="nutricycle-ngo-donation-meta"
                        >

                            <span
                                class="nutricycle-ngo-donation-pill"
                            >
                                📅
                                ${escapeHTML(
                                    formatDate(
                                        activity.timestamp
                                    )
                                )}
                            </span>

                        </div>

                    </div>

                `;


                ui.activityContainer
                    .appendChild(
                        card
                    );

            }

        );

}


/* ============================================================
   EMPTY STATE
============================================================ */

function showEmptyState(

    container,

    icon,
    title,
    message

) {

    if (!container) {

        return;

    }


    injectDonationStyles();


    container.className =
        "nutricycle-ngo-empty";


    container.innerHTML = `

        <i
            class="${escapeHTML(
                icon
            )}"
        ></i>

        <h3>
            ${escapeHTML(
                title
            )}
        </h3>

        <p>
            ${escapeHTML(
                message
            )}
        </p>

    `;

}


/* ============================================================
   SEARCH
============================================================ */

function initializeSearch() {

    ui.searchBar?.addEventListener(

        "input",

        event => {

            const text =
                normalizeText(
                    event.target.value
                );


            if (!text) {

                renderIncomingDonations();

                return;

            }


            const filtered =

                appState.incomingDonations
                    .filter(

                        donation => {

                            const searchable = [

                                donation.foodName,

                                donation.donorName,

                                donation.status,

                                donation.firestoreId,

                                donation.id

                            ]
                                .join(
                                    " "
                                );


                            return normalizeText(
                                searchable
                            )
                                .includes(
                                    text
                                );

                        }

                    );


            renderIncomingDonations(
                filtered
            );

        }

    );

}


/* ============================================================
   NOTIFICATIONS
============================================================ */

function initializeNotifications() {

    ui.notificationBell?.addEventListener(

        "click",

        () => {

            const active =
                appState.assignedPickups
                    .filter(

                        donation =>
                            !isCompleted(
                                donation
                            )

                    );


            if (
                active.length
            ) {

                alert(

                    `You have ${
                        active.length
                    } active pickup${
                        active.length === 1
                            ? ""
                            : "s"
                    }.`

                );

            }

            else {

                alert(
                    "No new notifications."
                );

            }

        }

    );

}


/* ============================================================
   NAVIGATION
============================================================ */

const navigationButtons = [

    ui.dashboardButton,

    ui.incomingButton,

    ui.pickupButton,

    ui.inventoryButton,

    ui.analyticsButton,

    ui.notificationButton,

    ui.profileButton

];


function clearNavigation() {

    navigationButtons
        .forEach(

            button => {

                button?.classList
                    .remove(
                        "active"
                    );

            }

        );

}


function activateNavigation(
    button
) {

    clearNavigation();

    button?.classList.add(
        "active"
    );

}


function initializeNavigation() {

    ui.dashboardButton?.addEventListener(

        "click",

        () => {

            activateNavigation(
                ui.dashboardButton
            );


            window.scrollTo({

                top:
                    0,

                behavior:
                    "smooth"

            });

        }

    );


    ui.incomingButton?.addEventListener(

        "click",

        () => {

            activateNavigation(
                ui.incomingButton
            );


            document
                .getElementById(
                    "incomingSection"
                )
                ?.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

        }

    );


    ui.pickupButton?.addEventListener(

        "click",

        () => {

            activateNavigation(
                ui.pickupButton
            );


            document
                .getElementById(
                    "pickupSection"
                )
                ?.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

        }

    );


    ui.inventoryButton?.addEventListener(

        "click",

        () => {

            activateNavigation(
                ui.inventoryButton
            );


            document
                .getElementById(
                    "inventorySection"
                )
                ?.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

        }

    );


    ui.analyticsButton?.addEventListener(

        "click",

        () => {

            activateNavigation(
                ui.analyticsButton
            );


            openAnalytics();

        }

    );


    ui.notificationButton?.addEventListener(

        "click",

        () => {

            activateNavigation(
                ui.notificationButton
            );


            document
                .getElementById(
                    "activitySection"
                )
                ?.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

        }

    );


    ui.profileButton?.addEventListener(

        "click",

        event => {

            event.preventDefault();

            openProfileModal();

        }

    );

}


/* ============================================================
   ANALYTICS NAVIGATION
============================================================ */

function openAnalytics() {

    const panel =
        ensureAnalyticsPanel();


    updateAnalytics();


    panel?.scrollIntoView({

        behavior:
            "smooth",

        block:
            "start"

    });

}


/* ============================================================
   LOGOUT
============================================================ */

async function logout() {

    const confirmed =
        window.confirm(

            "Are you sure you want to logout?"

        );


    if (!confirmed) {

        return;

    }


    try {

        await Auth.logout();

    }


    catch (error) {

        console.error(

            "NutriCycle AI — Logout failed:",

            error

        );


        window.location.href =
            "login.html";

    }

}


/* ============================================================
   AUTHENTICATION
============================================================ */

function initializeAuthentication() {

    Auth.onUserChanged(

        user => {

            if (!user) {

                window.location.href =
                    "login.html";

                return;

            }


            if (

                normalizeText(
                    user.role
                )

                !==

                "ngo"

            ) {

                alert(

                    "This dashboard is restricted to NGO accounts."

                );


                window.location.href =
                    "login.html";

                return;

            }


            appState.currentUser =
                user;


            updateProfile();


            ensureAnalyticsPanel();


            startDonationListener();


            console.log(

                "NutriCycle AI — NGO session restored:",

                {

                    uid:
                        user.uid,

                    ngo:
                        appState.ngoName,

                    location:
                        appState.ngoLocation

                }

            );

        }

    );

}


/* ============================================================
   REBUILD DASHBOARD
============================================================ */

function rebuildDashboard() {

    buildNearbyDonations();

    buildPickups();

    buildInventory();

    buildActivities();

    updateDashboardStatistics();

    renderIncomingDonations();

    renderPickups();

    renderInventory();

    renderActivity();

    updateAnalytics();

}


/* ============================================================
   EVENT INITIALIZATION
============================================================ */

function initializeEvents() {

    initializeNavigation();

    initializeSearch();

    initializeNotifications();


    ui.logoutButton?.addEventListener(

        "click",

        logout

    );

}


/* ============================================================
   STARTUP
============================================================ */

function initialize() {

    injectAnalyticsStyles();

    injectDonationStyles();

    ensureAnalyticsPanel();

    initializeEvents();

    initializeAuthentication();


    console.log(
        "NutriCycle AI — Enhanced NGO dashboard initialized."
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