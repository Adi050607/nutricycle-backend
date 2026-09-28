/*
============================================================
NutriCycle AI
UNIFIED LIVE TRACKING ENGINE
============================================================

Single source of truth for map.html.

Reads the most recent donation from:
    localStorage["nutricycle_donations"]

Expected assignment fields:
    donation.assignment.ngo
    donation.assignment.agent
    donation.assignment.vehicle
    donation.assignment.phone

Coordinates are resolved in this order:
1. donation.pickupLocation / donation.donorLocation
2. localStorage["userLocation"]
3. browser geolocation

NGO coordinates:
1. donation.assignment.ngoLocation / donation.ngoLocation
2. localStorage["ngoLocation"]
3. Nominatim geocoding of the NGO name

No fake Pune coordinates are used.
============================================================
*/

"use strict";


const Tracking = {

    map: null,

    donorMarker: null,

    ngoMarker: null,

    vehicleMarker: null,

    routeLine: null,

    routePoints: [],

    routeIndex: 0,

    animationTimer: null,

    lastPosition: null,

    donorLocation: null,

    ngoLocation: null,

    donation: null,

    assignment: null,

    vehicle: {
        type: "Car",
        driver: "Delivery Partner",
        phone: "",
        number: ""
    },

    initialized: false

};


const $ = id =>
    document.getElementById(id);


/* ============================================================
   JSON / STORAGE HELPERS
============================================================ */

function readJSON(key) {

    try {

        const raw =
            localStorage.getItem(key);

        if (!raw) {

            return null;

        }

        return JSON.parse(raw);

    }

    catch (error) {

        console.warn(
            "NutriCycle Tracking: invalid JSON:",
            key,
            error
        );

        return null;

    }

}


/* ============================================================
   GET ACTIVE DONATION
============================================================ */

function getLatestDonation() {

    const direct =
        readJSON("nutricycle_current_donation");

    if (
        direct &&
        typeof direct === "object"
    ) {

        return direct;

    }


    const donations =
        readJSON("nutricycle_donations");


    if (
        !Array.isArray(donations) ||
        !donations.length
    ) {

        return null;

    }


    const nonDelivered =
        donations.filter(

            donation =>
                donation &&
                donation.status !== "Delivered"

        );


    return (

        nonDelivered[
            nonDelivered.length - 1
        ] ||

        donations[
            donations.length - 1
        ]

    );

}


/* ============================================================
   COORDINATE NORMALIZATION
============================================================ */

function normalizeCoordinate(value) {

    if (
        Array.isArray(value) &&
        value.length >= 2
    ) {

        const lat =
            Number(value[0]);

        const lng =
            Number(value[1]);


        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
        ) {

            return [
                lat,
                lng
            ];

        }

    }


    if (
        value &&
        typeof value === "object"
    ) {

        const lat =
            Number(
                value.lat ??
                value.latitude
            );

        const lng =
            Number(
                value.lng ??
                value.longitude
            );


        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
        ) {

            return [
                lat,
                lng
            ];

        }

    }


    return null;

}


function findLocation(...candidates) {

    for (
        const candidate
        of candidates
    ) {

        const normalized =
            normalizeCoordinate(
                candidate
            );


        if (normalized) {

            return normalized;

        }

    }

    return null;

}


/* ============================================================
   STORED LOCATIONS
============================================================ */

function getStoredUserLocation() {

    return findLocation(

        readJSON(
            "userLocation"
        )

    );

}


function getStoredNGOLocation() {

    return findLocation(

        readJSON(
            "ngoLocation"
        )

    );

}


/* ============================================================
   DONOR LOCATION
============================================================ */

function getDonationLocation(
    donation
) {

    return findLocation(

        donation?.pickupLocation,

        donation?.donorLocation,

        donation?.location,

        donation?.coordinates,

        donation?.pickupCoordinates,

        donation?.tracking?.donorLocation

    );

}


/* ============================================================
   NGO LOCATION
============================================================ */

function getNGOLocation(
    donation
) {

    return findLocation(

        donation?.assignment?.ngoLocation,

        donation?.assignment?.ngoCoordinates,

        donation?.ngoLocation,

        donation?.ngoCoordinates,

        donation?.tracking?.ngoLocation,

        getStoredNGOLocation()

    );

}


/* ============================================================
   NGO NAME
============================================================ */

function getNGOName(
    donation
) {

    return (

        donation?.assignment?.ngo ||

        donation?.ngo ||

        donation?.tracking?.ngo ||

        localStorage.getItem(
            "ngoName"
        ) ||

        "Assigned NGO"

    );

}


/* ============================================================
   DISTANCE
============================================================ */

function haversineKm(
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


    const value =
        Math.sin(
            dLat / 2
        ) ** 2 +

        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(
            dLng / 2
        ) ** 2;


    return (

        2 *
        R *
        Math.atan2(
            Math.sqrt(value),
            Math.sqrt(1 - value)
        )

    );

}


function formatDistance(
    km
) {

    if (
        !Number.isFinite(km)
    ) {

        return "—";

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
   VEHICLE IMAGE
============================================================ */

function getVehicleImage(
    vehicleType
) {

    const images = {

        Bike:
            "screenshot/bike.png",

        Car:
            "screenshot/car.png",

        Tempo:
            "screenshot/tempo.png",

        Truck:
            "screenshot/truck.png",

        Auto:
            "screenshot/auto.png"

    };


    return (

        images[vehicleType] ||

        images.Car

    );

}


/* ============================================================
   VEHICLE ICON
============================================================ */

function createVehicleIcon() {

    const emoji = {

        Bike:
            "🏍️",

        Car:
            "🚗",

        Tempo:
            "🚚",

        Truck:
            "🚛",

        Auto:
            "🛺"

    };


    const type =
        Tracking.vehicle.type;


    return L.divIcon({

        className:
            "nutricycle-vehicle-marker",


        html: `

            <div
                style="
                    width:58px;
                    height:58px;
                    border-radius:50%;
                    background:white;
                    border:3px solid #16a34a;
                    box-shadow:0 8px 22px rgba(0,0,0,.25);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:30px;
                "
            >

                ${emoji[type] || "🚗"}

            </div>

        `,


        iconSize:
            [58, 58],


        iconAnchor:
            [29, 29]

    });

}


/* ============================================================
   GET CURRENT POSITION
============================================================ */

async function getCurrentPosition() {

    const stored =
        getStoredUserLocation();


    if (stored) {

        return stored;

    }


    if (
        !navigator.geolocation
    ) {

        throw new Error(

            "This browser does not support live location."

        );

    }


    return new Promise(

        (
            resolve,
            reject
        ) => {

            navigator.geolocation.getCurrentPosition(

                position => {

                    resolve([

                        position.coords.latitude,

                        position.coords.longitude

                    ]);

                },

                error => {

                    reject(

                        new Error(

                            "Location permission is required to build the donor pickup route."

                        )

                    );

                },

                {

                    enableHighAccuracy:
                        true,

                    timeout:
                        15000,

                    maximumAge:
                        0

                }

            );

        }

    );

}


/* ============================================================
   GEOCODE NGO
============================================================ */

async function geocodeNGO(
    name
) {

    if (!name) {

        return null;

    }


    try {

        const url =

            "https://nominatim.openstreetmap.org/search" +

            "?format=jsonv2" +

            "&limit=1" +

            "&countrycodes=in" +

            "&q=" +

            encodeURIComponent(
                name
            );


        const response =
            await fetch(

                url,

                {

                    headers: {

                        "Accept":
                            "application/json"

                    }

                }

            );


        if (
            !response.ok
        ) {

            return null;

        }


        const results =
            await response.json();


        if (
            !Array.isArray(results) ||
            !results.length
        ) {

            return null;

        }


        const result =
            results[0];


        const lat =
            Number(
                result.lat
            );


        const lon =
            Number(
                result.lon
            );


        if (
            Number.isFinite(lat) &&
            Number.isFinite(lon)
        ) {

            const coordinates =
                [
                    lat,
                    lon
                ];


            localStorage.setItem(

                "ngoLocation",

                JSON.stringify(
                    coordinates
                )

            );


            return coordinates;

        }

    }

    catch (error) {

        console.warn(

            "NutriCycle Tracking: NGO geocoding failed.",

            error

        );

    }


    return null;

}


/* ============================================================
   INITIALIZE MAP
============================================================ */

function initializeMap(
    center
) {

    Tracking.map =

        L.map(

            "trackingMap",

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

    ).addTo(

        Tracking.map

    );


    Tracking.map.setView(

        center,

        13

    );

}


/* ============================================================
   CREATE MAP MARKERS
============================================================ */

function createMarkers() {

    const donorIcon =

        L.divIcon({

            className:
                "nutricycle-donor-marker",


            html: `

                <div
                    style="
                        width:36px;
                        height:36px;
                        border-radius:50%;
                        background:#2563eb;
                        border:4px solid white;
                        box-shadow:0 5px 16px rgba(0,0,0,.25);
                    "
                ></div>

            `,


            iconSize:
                [36, 36],


            iconAnchor:
                [18, 18]

        });


    const ngoIcon =

        L.divIcon({

            className:
                "nutricycle-ngo-marker",


            html: `

                <div
                    style="
                        width:38px;
                        height:38px;
                        border-radius:12px;
                        background:#16a34a;
                        border:4px solid white;
                        box-shadow:0 5px 16px rgba(0,0,0,.25);
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:white;
                        font-size:18px;
                    "
                >
                    🏢
                </div>

            `,


            iconSize:
                [38, 38],


            iconAnchor:
                [19, 19]

        });


    Tracking.donorMarker =

        L.marker(

            Tracking.donorLocation,

            {

                icon:
                    donorIcon

            }

        )

        .addTo(

            Tracking.map

        )

        .bindPopup(

            "📍 Donor Pickup Location"

        );


    Tracking.ngoMarker =

        L.marker(

            Tracking.ngoLocation,

            {

                icon:
                    ngoIcon

            }

        )

        .addTo(

            Tracking.map

        )

        .bindPopup(

            "🏢 " +

            getNGOName(
                Tracking.donation
            )

        );


    Tracking.vehicleMarker =

        L.marker(

            Tracking.donorLocation,

            {

                icon:
                    createVehicleIcon(),

                zIndexOffset:
                    1000

            }

        )

        .addTo(

            Tracking.map

        )

        .bindPopup(

            "🚚 " +

            Tracking.vehicle.driver

        );

}


/* ============================================================
   FETCH REAL ROAD ROUTE
============================================================ */

async function fetchRoadRoute() {

    const [
        fromLat,
        fromLng
    ] = Tracking.donorLocation;


    const [
        toLat,
        toLng
    ] = Tracking.ngoLocation;


    const url =

        `https://router.project-osrm.org/route/v1/driving/` +

        `${fromLng},${fromLat};` +

        `${toLng},${toLat}` +

        `?overview=full&geometries=geojson&steps=false`;


    const response =
        await fetch(url);


    if (
        !response.ok
    ) {

        throw new Error(

            "The road routing service could not be reached."

        );

    }


    const data =
        await response.json();


    if (
        data.code !== "Ok" ||
        !data.routes?.length
    ) {

        throw new Error(

            "No drivable road route was found between the donor and NGO."

        );

    }


    const route =
        data.routes[0];


    Tracking.routePoints =

        route.geometry.coordinates.map(

            point => [

                point[1],

                point[0]

            ]

        );


    Tracking.routeLine =

        L.polyline(

            Tracking.routePoints,

            {

                color:
                    "#16a34a",

                weight:
                    6,

                opacity:
                    .9,

                lineJoin:
                    "round"

            }

        )

        .addTo(

            Tracking.map

        );


    Tracking.map.fitBounds(

        Tracking.routeLine.getBounds(),

        {

            padding:
                [70, 70]

        }

    );


    return {

        distanceKm:
            route.distance / 1000,

        durationMinutes:

            Math.max(

                1,

                Math.round(
                    route.duration / 60
                )

            )

    };

}


/* ============================================================
   VEHICLE ANIMATION
============================================================ */

function startVehicleAnimation(
    routeInfo
) {

    if (
        !Tracking.routePoints.length
    ) {

        return;

    }


    if (
        Tracking.animationTimer
    ) {

        clearInterval(
            Tracking.animationTimer
        );

    }


    Tracking.routeIndex =
        0;


    const totalPoints =
        Tracking.routePoints.length;


    const totalDurationMs =

        Math.max(

            30000,

            routeInfo.durationMinutes *
            60000

        );


    const intervalMs =

        Math.max(

            35,

            totalDurationMs /
            totalPoints

        );


    Tracking.animationTimer =

        setInterval(

            () => {

                if (

                    Tracking.routeIndex >=

                    totalPoints - 1

                ) {

                    clearInterval(

                        Tracking.animationTimer

                    );


                    Tracking.vehicleMarker?.setLatLng(

                        Tracking.ngoLocation

                    );


                    setText(

                        "trackingStatus",

                        "Delivered"

                    );


                    setText(

                        "etaText",

                        "Arrived"

                    );


                    setText(

                        "distanceText",

                        "0 m"

                    );


                    setText(

                        "donationStatus",

                        "Delivered to NGO"

                    );


                    return;

                }


                const current =

                    Tracking.routePoints[

                        Tracking.routeIndex

                    ];


                const next =

                    Tracking.routePoints[

                        Tracking.routeIndex + 1

                    ];


                Tracking.vehicleMarker
                    ?.setLatLng(

                        current

                    );


                Tracking.lastPosition =
                    current;


                const remainingRatio =

                    (

                        totalPoints -
                        Tracking.routeIndex

                    ) /

                    totalPoints;


                const remainingKm =

                    routeInfo.distanceKm *
                    remainingRatio;


                const remainingMinutes =

                    Math.max(

                        1,

                        Math.ceil(

                            routeInfo.durationMinutes *
                            remainingRatio

                        )

                    );


                setText(

                    "etaText",

                    remainingMinutes +
                    " min"

                );


                setText(

                    "distanceText",

                    formatDistance(
                        remainingKm
                    )

                );


                if (

                    Tracking.routeIndex ===
                    0

                ) {

                    setText(

                        "trackingStatus",

                        "Driver heading to pickup"

                    );

                }

                else if (

                    remainingRatio >
                    .55

                ) {

                    setText(

                        "trackingStatus",

                        "Heading to pickup"

                    );

                }

                else if (

                    remainingRatio >
                    .10

                ) {

                    setText(

                        "trackingStatus",

                        "Food picked up — en route to NGO"

                    );

                }

                else {

                    setText(

                        "trackingStatus",

                        "Approaching NGO"

                    );

                }


                Tracking.routeLine?.setLatLngs(

                    Tracking.routePoints.slice(
                        Tracking.routeIndex
                    )

                );


                if (next) {

                    const angle =

                        Math.atan2(

                            next[1] -
                            current[1],

                            next[0] -
                            current[0]

                        ) *

                        180 /
                        Math.PI;


                    const iconElement =

                        document.querySelector(

                            ".nutricycle-vehicle-marker > div"

                        );


                    if (
                        iconElement
                    ) {

                        iconElement.style.transform =
                            `rotate(${angle}deg)`;

                    }

                }


                Tracking.routeIndex++;

            },

            intervalMs

        );

}


/* ============================================================
   UI
============================================================ */

function setText(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            value ?? "—";

    }

}


function populateUI() {

    const donation =
        Tracking.donation;


    const assignment =
        Tracking.assignment;


    setText(

        "foodTitle",

        donation?.foodName ||
        "Live Donation Tracking"

    );


    const quantity =
        donation?.quantity ??
        "—";


    const unit =
        donation?.unit ||
        "kg";


    setText(

        "quantityText",

        `Quantity ${quantity} ${unit}`

    );


    const driver =

        assignment?.agent ||

        donation?.tracking?.driverName ||

        "Delivery Partner";


    const phone =

        assignment?.phone ||

        assignment?.agentPhone ||

        donation?.tracking?.driverPhone ||

        "";


    setText(

        "driverName",

        driver

    );


    setText(

        "driverPhone",

        phone ||
        "Contact unavailable"

    );


    const vehicleType =

        assignment?.vehicle ||

        donation?.tracking?.vehicle ||

        "Car";


    Tracking.vehicle = {

        type:
            vehicleType,

        driver:
            driver,

        phone:
            phone,

        number:

            assignment?.vehicleNumber ||

            donation?.tracking?.vehicleNumber ||

            "Assigned"

    };


    setText(

        "vehicleType",

        Tracking.vehicle.type

    );


    setText(

        "vehicleNumber",

        "Vehicle No. " +
        Tracking.vehicle.number

    );


    setText(

        "pickupLocation",

        "Your current live location"

    );


    setText(

        "ngoLocationText",

        getNGOName(
            donation
        )

    );


    setText(

        "donationStatus",

        donation?.status ||
        "Tracking"

    );


    const callButton =
        $("callButton");


    if (callButton) {

        callButton.onclick =
            () => {

                if (
                    Tracking.vehicle.phone
                ) {

                    window.location.href =
                        "tel:" +
                        Tracking.vehicle.phone;

                }

                else {

                    alert(

                        "Driver phone number is not available."

                    );

                }

            };

    }


    const dashboardButton =
        $("dashboardButton");


    if (dashboardButton) {

        dashboardButton.onclick =
            () => {

                window.location.href =
                    "user.html";

            };

    }


    const errorDashboardButton =
        $("errorDashboardButton");


    if (errorDashboardButton) {

        errorDashboardButton.onclick =
            () => {

                window.location.href =
                    "user.html";

            };

    }

}


/* ============================================================
   ERROR UI
============================================================ */

function showError(
    message
) {

    const errorBox =
        $("errorBox");


    const errorMessage =
        $("errorMessage");


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }


    if (errorBox) {

        errorBox.hidden =
            false;

    }


    setText(

        "trackingStatus",

        "Route unavailable"

    );

}


/* ============================================================
   MAIN INITIALIZATION
============================================================ */

async function initialize() {

    if (
        typeof L ===
        "undefined"
    ) {

        showError(
            "Leaflet could not be loaded."
        );

        return;

    }


    Tracking.donation =
        getLatestDonation();


    if (
        !Tracking.donation
    ) {

        showError(

            "There is no active donation available for tracking. Create a donation first."

        );

        return;

    }


    Tracking.assignment =

        Tracking.donation.assignment ||

        {};


    populateUI();


    try {

        /*
         * Donor location
         */
        Tracking.donorLocation =

            getDonationLocation(
                Tracking.donation
            ) ||

            await getCurrentPosition();


        /*
         * Persist real donor position.
         */
        localStorage.setItem(

            "userLocation",

            JSON.stringify(

                Tracking.donorLocation

            )

        );


        /*
         * NGO location
         */
        Tracking.ngoLocation =

            getNGOLocation(
                Tracking.donation
            );


        /*
         * If NGO coordinates don't already
         * exist, geocode the assigned NGO.
         */
        if (
            !Tracking.ngoLocation
        ) {

            Tracking.ngoLocation =

                await geocodeNGO(

                    getNGOName(
                        Tracking.donation
                    )

                );

        }


        /*
         * Never invent a fake NGO position.
         */
        if (
            !Tracking.ngoLocation
        ) {

            throw new Error(

                "The assigned NGO does not have coordinates yet. Select/save the NGO location first; the tracker will not invent a location."

            );

        }


        /*
         * Create map.
         */
        initializeMap(

            Tracking.donorLocation

        );


        /*
         * Create exactly three meaningful map entities:
         *
         * 1. Donor pickup
         * 2. Assigned NGO
         * 3. Moving delivery vehicle
         */
        createMarkers();


        /*
         * Calculate actual road route.
         */
        const routeInfo =

            await fetchRoadRoute();


        /*
         * Initial metrics.
         */
        setText(

            "etaText",

            routeInfo.durationMinutes +
            " min"

        );


        setText(

            "distanceText",

            formatDistance(

                routeInfo.distanceKm

            )

        );


        setText(

            "trackingStatus",

            "Driver heading to pickup"

        );


        setText(

            "donationStatus",

            "Vehicle assigned"

        );


        /*
         * Start vehicle animation.
         */
        startVehicleAnimation(

            routeInfo

        );


        Tracking.initialized =
            true;


        console.log(

            "NutriCycle AI — Unified tracking ready",

            {

                donor:
                    Tracking.donorLocation,

                ngo:
                    Tracking.ngoLocation,

                routeDistanceKm:
                    routeInfo.distanceKm,

                vehicle:
                    Tracking.vehicle.type,

                driver:
                    Tracking.vehicle.driver

            }

        );

    }

    catch (error) {

        console.error(

            "NutriCycle AI — Tracking initialization failed:",

            error

        );


        showError(

            error.message ||

            "The live tracking route could not be initialized."

        );

    }

}


/* ============================================================
   START
============================================================ */

document.addEventListener(

    "DOMContentLoaded",

    initialize,

    {
        once: true
    }

);