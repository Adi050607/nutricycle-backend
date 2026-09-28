"use strict";

/* ============================================================
   NUTRICYCLE AI
   DONATION MODULE
   FINAL REBUILD
   PART 1 — FOUNDATION + CAMERA
============================================================ */

(() => {

    /* ========================================================
       GLOBAL APPLICATION OBJECT
    ======================================================== */

    const app =
        window.NutriCycleAI ||
        (window.NutriCycleAI = {});


    /* ========================================================
       STATIC CONFIGURATION
    ======================================================== */

    app.CONFIG = {

        SCREEN_IDS: [

            "cameraScreen",
            "aiScreen",
            "detailsScreen",
            "foodCardScreen",
            "paymentScreen",
            "rewardScreen",
            "assignmentScreen",
            "trackingScreen"

        ],

        CAMERA: {

            width: 1280,
            height: 720,

            facingMode: "environment"

        }

    };


    /* ========================================================
       APPLICATION STATE
    ======================================================== */

    app.state = {

        initialized: false,

        currentScreen: 0,

        camera: {

            stream: null,

            active: false,

            captured: false,

            imageData: "",

            width: 0,

            height: 0

        },

        donation: {

            id: "",

            image: "",

            foodName: "",

            freshness: "",

            shelfLife: "",

            confidence: "",

            quantity: null,

            unit: "",

            quantityKg: null,

            preparedTime: "",

            expiryTime: "",

            notes: "",

            paymentMethod: "",

            paymentAmount: 100,

            reward: {

                revealed: false,

                title: "₹100 OFF",

                brand: "Partner Brand Reward",

                offer: "🎉 ₹100 Donation Coupon 🎉"

            },

            assignment: {

                vehicle: "",

                capacityKg: null,

                reason: "",

                ngo: "",

                agent: "",

                etaMinutes: null

            },

            tracking: {

                driverName: "",

                driverPhone: "",

                vehicle: "",

                vehicleNumber: "",

                status: "Waiting for Pickup",

                eta: "",

                distanceKm: null,

                ngo: "",

                route: [],

                routeIndex: 0

            }

        }

    };


    /* ========================================================
       DOM REFERENCES
    ======================================================== */

    app.ui = {

        screens: {},

        progress: {

            fill: null,

            steps: []

        },

        camera: {

            video: null,

            image: null,

            overlay: null,

            dot: null,

            status: null,

            resolution: null,

            canvas: null,

            error: null

        },

        buttons: {

            back: null,

            startCamera: null,

            capture: null,

            retake: null,

            stopCamera: null,

            cameraNext: null

        }

    };


    /* ========================================================
       DOM CACHE
    ======================================================== */

    function cacheFoundationDOM() {

        const ui =
            app.ui;


        /* ----------------------------------------------------
           SCREENS
        ---------------------------------------------------- */

        app.CONFIG.SCREEN_IDS.forEach(
            id => {

                ui.screens[id] =
                    document.getElementById(id);

            }
        );


        /* ----------------------------------------------------
           PROGRESS
        ---------------------------------------------------- */

        ui.progress.fill =
            document.getElementById(
                "progressFill"
            );

        ui.progress.steps =
            Array.from(
                document.querySelectorAll(
                    ".step"
                )
            );


        /* ----------------------------------------------------
           CAMERA
        ---------------------------------------------------- */

        ui.camera.video =
            document.getElementById(
                "cameraVideo"
            );

        ui.camera.image =
            document.getElementById(
                "capturedImage"
            );

        ui.camera.overlay =
            document.getElementById(
                "cameraOverlay"
            );

        ui.camera.dot =
            document.getElementById(
                "cameraDot"
            );

        ui.camera.status =
            document.getElementById(
                "cameraStatus"
            );

        ui.camera.resolution =
            document.getElementById(
                "cameraResolution"
            );

        ui.camera.canvas =
            document.getElementById(
                "captureCanvas"
            );

        ui.camera.error =
            document.getElementById(
                "cameraError"
            );


        /* ----------------------------------------------------
           BUTTONS
        ---------------------------------------------------- */

        ui.buttons.back =
            document.getElementById(
                "backButton"
            );

        ui.buttons.startCamera =
            document.getElementById(
                "startCameraButton"
            );

        ui.buttons.capture =
            document.getElementById(
                "captureButton"
            );

        ui.buttons.retake =
            document.getElementById(
                "retakeButton"
            );

        ui.buttons.stopCamera =
            document.getElementById(
                "stopCameraButton"
            );

        ui.buttons.cameraNext =
            document.getElementById(
                "cameraNextButton"
            );

    }


    /* ========================================================
       DOM VALIDATION
    ======================================================== */

    function validateFoundation() {

        const required = {

            cameraScreen:
                app.ui.screens.cameraScreen,

            aiScreen:
                app.ui.screens.aiScreen,

            detailsScreen:
                app.ui.screens.detailsScreen,

            foodCardScreen:
                app.ui.screens.foodCardScreen,

            paymentScreen:
                app.ui.screens.paymentScreen,

            rewardScreen:
                app.ui.screens.rewardScreen,

            assignmentScreen:
                app.ui.screens.assignmentScreen,

            trackingScreen:
                app.ui.screens.trackingScreen,

            progressFill:
                app.ui.progress.fill,

            cameraVideo:
                app.ui.camera.video,

            capturedImage:
                app.ui.camera.image,

            cameraOverlay:
                app.ui.camera.overlay,

            captureCanvas:
                app.ui.camera.canvas,

            startCameraButton:
                app.ui.buttons.startCamera,

            captureButton:
                app.ui.buttons.capture,

            retakeButton:
                app.ui.buttons.retake,

            stopCameraButton:
                app.ui.buttons.stopCamera,

            cameraNextButton:
                app.ui.buttons.cameraNext

        };


        const missing =
            Object.entries(required)
                .filter(
                    ([, element]) =>
                        !element
                )
                .map(
                    ([name]) =>
                        name
                );


        if (
            missing.length > 0
        ) {

            console.error(
                "NutriCycle AI — DOM validation failed:",
                missing
            );

            return false;

        }


        return true;

    }


    /* ========================================================
       BUTTON HELPER
    ======================================================== */

    function setButtonEnabled(
        button,
        enabled
    ) {

        if (!button) {

            return;

        }


        button.disabled =
            !enabled;

    }


    /* ========================================================
       SCREEN CONTROLLER
    ======================================================== */

    function showScreen(
        index
    ) {

        const screens =
            app.CONFIG.SCREEN_IDS;


        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= screens.length
        ) {

            console.error(
                "NutriCycle AI — Invalid screen index:",
                index
            );

            return false;

        }


        screens.forEach(
            id => {

                const screen =
                    app.ui.screens[id];


                if (!screen) {

                    return;

                }


                screen.classList.remove(
                    "active"
                );

            }
        );


        const target =
            app.ui.screens[
                screens[index]
            ];


        if (!target) {

            console.error(
                "NutriCycle AI — Target screen not found:",
                screens[index]
            );

            return false;

        }


        target.classList.add(
            "active"
        );


        app.state.currentScreen =
            index;


        updateProgress(
            index
        );


        window.scrollTo(
            {
                top: 0,
                behavior: "smooth"
            }
        );


        return true;

    }


    /* ========================================================
       PROGRESS CONTROLLER
    ======================================================== */

    function updateProgress(
        screenIndex
    ) {

        const total =
            app.CONFIG.SCREEN_IDS.length;

        const steps =
            app.ui.progress.steps;


        steps.forEach(
            (
                step,
                index
            ) => {

                step.classList.toggle(
                    "active",
                    index === screenIndex
                );

                step.classList.toggle(
                    "completed",
                    index < screenIndex
                );

            }
        );


        if (
            !app.ui.progress.fill
        ) {

            return;

        }


        /*
           Eight screens exist, while the original
           progress indicator visually represents
           seven workflow stages. We therefore cap
           the visible progress at 100%.
        */

        const workflowProgress =
            Math.min(
                screenIndex /
                    Math.max(
                        total - 1,
                        1
                    ),
                1
            );


        app.ui.progress.fill.style.width =
            `${workflowProgress * 100}%`;

    }


    /* ========================================================
       ERROR DISPLAY
    ======================================================== */

    function cameraError(
        message
    ) {

        const element =
            app.ui.camera.error;


        if (!element) {

            return;

        }


        element.textContent =
            message;

    }


    function clearCameraError() {

        cameraError("");

    }


    /* ========================================================
       CAMERA UI RESET
    ======================================================== */

    function resetCameraUI() {

        const camera =
            app.ui.camera;

        const buttons =
            app.ui.buttons;


        cameraError("");


        camera.video.style.display =
            "none";


        camera.image.style.display =
            "none";


        camera.image.removeAttribute(
            "src"
        );


        camera.overlay.style.display =
            "flex";


        camera.dot.classList.remove(
            "online-dot"
        );

        camera.dot.classList.add(
            "offline-dot"
        );


        camera.status.textContent =
            "Camera Offline";


        camera.resolution.textContent =
            "--";


        setButtonEnabled(
            buttons.startCamera,
            true
        );


        setButtonEnabled(
            buttons.capture,
            false
        );


        setButtonEnabled(
            buttons.retake,
            false
        );


        setButtonEnabled(
            buttons.stopCamera,
            false
        );


        setButtonEnabled(
            buttons.cameraNext,
            false
        );


        app.state.camera.active =
            false;

        app.state.camera.captured =
            false;

        app.state.camera.imageData =
            "";

    }


    /* ========================================================
       STOP CAMERA STREAM
    ======================================================== */

    function stopCameraStream() {

        const stream =
            app.state.camera.stream;


        if (!stream) {

            return;

        }


        stream.getTracks().forEach(
            track => {

                try {

                    track.stop();

                }
                catch (error) {

                    console.warn(
                        "NutriCycle AI — Could not stop camera track:",
                        error
                    );

                }

            }
        );


        app.state.camera.stream =
            null;


        app.state.camera.active =
            false;


        if (
            app.ui.camera.video
        ) {

            app.ui.camera.video.pause();

            app.ui.camera.video.srcObject =
                null;

        }

    }


    /* ========================================================
       START CAMERA
    ======================================================== */

    async function startCamera() {

        clearCameraError();


        const video =
            app.ui.camera.video;


        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            cameraError(
                "Camera access is not supported by this browser."
            );

            return;

        }


        /*
           If an old stream still exists, stop it first.
           This prevents multiple camera streams.
        */

        stopCameraStream();


        try {

            const stream =
                await navigator.mediaDevices.getUserMedia(
                    {

                        video: {

                            facingMode:
                                {
                                    ideal:
                                        app.CONFIG.CAMERA.facingMode
                                },

                            width:
                                {
                                    ideal:
                                        app.CONFIG.CAMERA.width
                                },

                            height:
                                {
                                    ideal:
                                        app.CONFIG.CAMERA.height
                                }

                        },

                        audio:
                            false

                    }
                );


            app.state.camera.stream =
                stream;


            video.srcObject =
                stream;


            video.style.display =
                "block";


            app.ui.camera.overlay.style.display =
                "none";


            app.ui.camera.image.style.display =
                "none";


            /*
               play() can reject in some browsers.
               The video element will still attempt autoplay,
               so rejection here should not destroy the stream.
            */

            try {

                await video.play();

            }
            catch (playError) {

                console.warn(
                    "NutriCycle AI — Camera play() warning:",
                    playError
                );

            }


            app.state.camera.active =
                true;


            const track =
                stream.getVideoTracks()[0];


            const settings =
                track?.getSettings?.() || {};


            app.state.camera.width =
                settings.width ||
                app.CONFIG.CAMERA.width;


            app.state.camera.height =
                settings.height ||
                app.CONFIG.CAMERA.height;


            app.ui.camera.dot.classList.remove(
                "offline-dot"
            );

            app.ui.camera.dot.classList.add(
                "online-dot"
            );


            app.ui.camera.status.textContent =
                "Camera Ready";


            app.ui.camera.resolution.textContent =
                `${app.state.camera.width} × ${app.state.camera.height}`;


            setButtonEnabled(
                app.ui.buttons.startCamera,
                false
            );


            setButtonEnabled(
                app.ui.buttons.capture,
                true
            );


            setButtonEnabled(
                app.ui.buttons.stopCamera,
                true
            );


            setButtonEnabled(
                app.ui.buttons.retake,
                false
            );


            setButtonEnabled(
                app.ui.buttons.cameraNext,
                false
            );


            console.log(
                "NutriCycle AI — Camera started."
            );

        }
        catch (error) {

            console.error(
                "NutriCycle AI — Camera access failed:",
                error
            );


            let message =
                "Unable to access the camera.";


            if (
                error?.name ===
                "NotAllowedError"
            ) {

                message =
                    "Camera permission was denied. Allow camera access and try again.";

            }

            else if (
                error?.name ===
                "NotFoundError"
            ) {

                message =
                    "No camera was found on this device.";

            }

            else if (
                error?.name ===
                "NotReadableError"
            ) {

                message =
                    "The camera is already being used by another application.";

            }

            else if (
                error?.name ===
                "SecurityError"
            ) {

                message =
                    "Camera access is blocked by the browser security policy.";

            }


            cameraError(
                message
            );


            resetCameraUI();

            cameraError(
                message
            );

        }

    }


    /* ========================================================
       CAPTURE IMAGE
    ======================================================== */

    function captureImage() {

        clearCameraError();


        const video =
            app.ui.camera.video;

        const canvas =
            app.ui.camera.canvas;


        if (
            !app.state.camera.active ||
            !video.srcObject
        ) {

            cameraError(
                "Start the camera before capturing an image."
            );

            return;

        }


        if (
            video.readyState <
            HTMLMediaElement.HAVE_CURRENT_DATA
        ) {

            cameraError(
                "Camera is still preparing. Please wait a moment and try again."
            );

            return;

        }


        const width =
            video.videoWidth ||
            app.state.camera.width ||
            1280;


        const height =
            video.videoHeight ||
            app.state.camera.height ||
            720;


        if (
            width <= 0 ||
            height <= 0
        ) {

            cameraError(
                "The camera frame is not available yet."
            );

            return;

        }


        canvas.width =
            width;

        canvas.height =
            height;


        const context =
            canvas.getContext(
                "2d",
                {
                    alpha:
                        false
                }
            );


        if (!context) {

            cameraError(
                "Your browser could not prepare the image canvas."
            );

            return;

        }


        context.drawImage(
            video,
            0,
            0,
            width,
            height
        );


        const imageData =
            canvas.toDataURL(
                "image/jpeg",
                0.88
            );


        if (
            !imageData ||
            imageData.length <
                100
        ) {

            cameraError(
                "The captured image is empty. Please try again."
            );

            return;

        }


        app.state.camera.imageData =
            imageData;

        app.state.camera.captured =
            true;


        app.state.donation.image =
            imageData;


        app.ui.camera.image.src =
            imageData;


        app.ui.camera.video.style.display =
            "none";


        app.ui.camera.image.style.display =
            "block";


        app.ui.camera.overlay.style.display =
            "none";


        setButtonEnabled(
            app.ui.buttons.capture,
            false
        );


        setButtonEnabled(
            app.ui.buttons.retake,
            true
        );


        setButtonEnabled(
            app.ui.buttons.stopCamera,
            true
        );


        setButtonEnabled(
            app.ui.buttons.cameraNext,
            true
        );


        app.ui.camera.status.textContent =
            "Image Captured";


        console.log(
            "NutriCycle AI — Food image captured."
        );

    }


    /* ========================================================
       RETAKE
    ======================================================== */

    function retakeImage() {

        clearCameraError();


        if (
            !app.state.camera.active
        ) {

            startCamera();

            return;

        }


        app.state.camera.captured =
            false;

        app.state.camera.imageData =
            "";


        app.state.donation.image =
            "";


        app.ui.camera.image.removeAttribute(
            "src"
        );


        app.ui.camera.image.style.display =
            "none";


        app.ui.camera.video.style.display =
            "block";


        app.ui.camera.overlay.style.display =
            "none";


        setButtonEnabled(
            app.ui.buttons.capture,
            true
        );


        setButtonEnabled(
            app.ui.buttons.retake,
            false
        );


        setButtonEnabled(
            app.ui.buttons.cameraNext,
            false
        );


        app.ui.camera.status.textContent =
            "Camera Ready";


        console.log(
            "NutriCycle AI — Retake mode."
        );

    }


    /* ========================================================
       STOP CAMERA
    ======================================================== */

    function handleStopCamera() {

        stopCameraStream();


        app.ui.camera.video.style.display =
            "none";


        if (
            !app.state.camera.captured
        ) {

            app.ui.camera.overlay.style.display =
                "flex";

        }


        app.ui.camera.dot.classList.remove(
            "online-dot"
        );

        app.ui.camera.dot.classList.add(
            "offline-dot"
        );


        app.ui.camera.status.textContent =
            app.state.camera.captured
                ? "Camera Offline — Image Saved"
                : "Camera Offline";


        setButtonEnabled(
            app.ui.buttons.startCamera,
            true
        );


        setButtonEnabled(
            app.ui.buttons.capture,
            false
        );


        setButtonEnabled(
            app.ui.buttons.stopCamera,
            false
        );


        setButtonEnabled(
            app.ui.buttons.retake,
            app.state.camera.captured
        );


        setButtonEnabled(
            app.ui.buttons.cameraNext,
            app.state.camera.captured
        );


        console.log(
            "NutriCycle AI — Camera stopped."
        );

    }


    /* ========================================================
       CAMERA → AI
    ======================================================== */

    function continueFromCamera() {

        clearCameraError();


        if (
            !app.state.camera.captured ||
            !app.state.donation.image
        ) {

            cameraError(
                "Capture a food image before continuing."
            );

            return;

        }


        /*
           Camera is no longer required once the image
           has been captured.
        */

        stopCameraStream();


        console.log(
            "NutriCycle AI — Camera → AI"
        );


        showScreen(
            1
        );


        /*
           Part 2 will define runAIAnalysis().
           We intentionally check for it here instead
           of assuming that Part 2 has already been loaded.
        */

        if (
            typeof app.runAIAnalysis ===
            "function"
        ) {

            app.runAIAnalysis();

        }

    }


    /* ========================================================
       EVENT BINDING
    ======================================================== */

    function bindCameraEvents() {

        const buttons =
            app.ui.buttons;


        buttons.back?.addEventListener(
            "click",
            () => {

                stopCameraStream();

                window.location.href =
                    "user.html";

            }
        );


        buttons.startCamera?.addEventListener(
            "click",
            startCamera
        );


        buttons.capture?.addEventListener(
            "click",
            captureImage
        );


        buttons.retake?.addEventListener(
            "click",
            retakeImage
        );


        buttons.stopCamera?.addEventListener(
            "click",
            handleStopCamera
        );


        buttons.cameraNext?.addEventListener(
            "click",
            continueFromCamera
        );

    }


    /* ========================================================
       INITIALIZATION
    ======================================================== */

    function initializePart1() {

        if (
            app.state.initialized
        ) {

            return;

        }


        cacheFoundationDOM();


        if (
            !validateFoundation()
        ) {

            console.error(
                "NutriCycle AI — Part 1 stopped. Fix the HTML/DOM mismatch before continuing."
            );

            return;

        }


        resetCameraUI();


        showScreen(
            0
        );


        bindCameraEvents();


        app.state.initialized =
            true;


        console.log(
            "NutriCycle AI — PART 1 READY"
        );

    }


    /* ========================================================
       PAGE LIFECYCLE CLEANUP
    ======================================================== */

    window.addEventListener(
        "pagehide",
        () => {

            stopCameraStream();

        },
        {
            once: true
        }
    );


    window.addEventListener(
        "beforeunload",
        () => {

            stopCameraStream();

        },
        {
            once: true
        }
    );

app.setButtonEnabled =
    setButtonEnabled;

app.showScreen =
    showScreen;
    /* ========================================================
       START PART 1
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializePart1,
            {
                once: true
            }
        );

    }

    else {

        initializePart1();

    }


})();
const app = window.NutriCycleAI;
const setButtonEnabled =
    app.setButtonEnabled;

const showScreen =
    app.showScreen;



/* ============================================================
   NUTRICYCLE AI
   DONATION MODULE
   PART 2 — AI ANALYSIS ENGINE
============================================================ */


/* ============================================================
   AI DOM REFERENCES
============================================================ */

app.ui = app.ui || {};

app.state = app.state || {};

app.ui.ai = {

    preview:
        document.getElementById(
            "aiPreviewImage"
        ),

    detectProgress:
        document.getElementById(
            "detectProgress"
        ),

    freshnessProgress:
        document.getElementById(
            "freshnessProgress"
        ),

    shelfProgress:
        document.getElementById(
            "shelfProgress"
        ),

    confidenceProgress:
        document.getElementById(
            "confidenceProgress"
        ),

    status:
        document.getElementById(
            "aiStatusMessage"
        ),

    loader:
        document.querySelector(
            "#aiScreen .ai-loader"
        ),

    headline:
        document.querySelector(
            "#aiScreen .ai-loader h3"
        ),

    continueButton:
        document.getElementById(
            "aiNextButton"
        )

};


/* ============================================================
   AI BACKEND CONFIGURATION
============================================================ */

/*
   Development:
   - localhost
   - 127.0.0.1
   - ::1

   Production:
   - Firebase hosted website
   - any normal deployed hostname

   IMPORTANT:
   The OpenAI API key never belongs in this file.
   The browser talks to your backend only.
*/

const AI_ENDPOINTS = {

    local:
        "http://localhost:10000/scan",

    production:
        "https://food-rescue-app-4jnl.onrender.com/scan"

};


/* ============================================================
   SELECT AI BACKEND
============================================================ */

function getAIEndpoint() {

    const hostname =
        window.location.hostname;

    const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1";

    return isLocal
        ? AI_ENDPOINTS.local
        : AI_ENDPOINTS.production;

}


/* ============================================================
   AI RESULT CONFIGURATION
============================================================ */

/*
   No fake/demo result is stored here.

   These values are filled only after the backend
   returns the real Food Analysis Agent result.
*/

app.AI_RESULT = {

    foodName:
        "",

    freshness:
        "",

    shelfLife:
        "",

    confidence:
        "",

    confidenceNumber:
        0,

    valid:
        false,

    visuallyContainsFood:
        false,

    riskFlags:
        [],

    requiresHumanReview:
        false

};


/* ============================================================
   NORMALIZE CONFIDENCE
============================================================ */

function normalizeConfidence(
    value
) {

    let number =
        Number(
            value
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return 0;

    }


    /*
       Some APIs return:

       0.91

       while others return:

       91

       Convert both forms into 0–100.
    */

    if (
        number > 0 &&
        number <= 1
    ) {

        number =
            number *
            100;

    }


    number =
        Math.max(
            0,
            Math.min(
                100,
                number
            )
        );


    return Math.round(
        number
    );

}


/* ============================================================
   NORMALIZE RESULT
============================================================ */

function normalizeAIResult(
    data
) {

    const response =
        data &&
        typeof data === "object"
            ? data
            : {};


    const confidenceNumber =
        normalizeConfidence(
            response.confidencePercent ??
            response.confidence ??
            0
        );


    const foodName =
        String(
            response.detectedName ??
            response.name ??
            ""
        )
        .trim();


    const freshness =
        String(
            response.visualCondition ??
            response.freshness ??
            ""
        )
        .trim();


    let shelfLife =
        response.shelfLife;


    if (
        shelfLife ===
        null ||
        shelfLife ===
        undefined ||
        String(
            shelfLife
        ).trim() === ""
    ) {

        shelfLife =
            response.shelfLifeStatus ??
            "Not determined from image alone.";

    }


    shelfLife =
        String(
            shelfLife
        ).trim();


    const riskFlags =
        Array.isArray(
            response.riskFlags
        )
            ? response.riskFlags
                .map(
                    flag =>
                        String(
                            flag
                        ).trim()
                )
                .filter(
                    Boolean
                )
            : [];


    /*
       For compatibility with the older backend shape:

       { valid: true, name: "Apple" }

       valid:true is enough unless the backend
       explicitly says that the image is not food.
    */

    const visuallyContainsFood =
        response.visuallyContainsFood !== false;


    const valid =
        response.valid === true &&
        visuallyContainsFood;


    return {

        foodName:
            foodName ||
            "Unknown food",

        freshness:
            freshness ||
            "Not determined",

        shelfLife:
            shelfLife,

        confidence:
            `${confidenceNumber}%`,

        confidenceNumber:
            confidenceNumber,

        valid:
            valid,

        visuallyContainsFood:
            visuallyContainsFood,

        riskFlags:
            riskFlags,

        requiresHumanReview:
            response.requiresHumanReview === true,

        reason:
            String(
                response.reason ||
                ""
            ).trim(),

        raw:
            response

    };

}


/* ============================================================
   CREATE AI PROGRESS FILL
============================================================ */

function createAIProgressFill(
    container
) {

    if (
        !container
    ) {

        return null;

    }


    /*
       Remove anything left over
       from a previous run.
    */

    container.innerHTML =
        "";


    const fill =
        document.createElement(
            "div"
        );


    fill.className =
        "ai-progress-fill";


    fill.style.width =
        "0%";


    fill.style.height =
        "100%";


    fill.style.borderRadius =
        "999px";


    fill.style.background =
        "linear-gradient(90deg,#16d85f,#12b34d)";


    fill.style.transition =
        "width 0.035s linear";


    container.appendChild(
        fill
    );


    return fill;

}


/* ============================================================
   RESET AI UI
============================================================ */

function resetAIUI() {

    const ai =
        app.ui.ai;


    [
        ai.detectProgress,
        ai.freshnessProgress,
        ai.shelfProgress,
        ai.confidenceProgress

    ]
    .forEach(
        container => {

            if (
                !container
            ) {

                return;

            }


            container.innerHTML =
                "";

        }
    );


    if (
        ai.headline
    ) {

        ai.headline.textContent =
            "Analyzing Food...";

    }


    if (
        ai.status
    ) {

        ai.status.textContent =
            "Preparing Food Analysis Agent...";


        ai.status.classList.remove(
            "ai-complete"
        );

        ai.status.classList.remove(
            "ai-error"
        );

        ai.status.classList.remove(
            "ai-warning"
        );

    }


    if (
        ai.loader
    ) {

        ai.loader.classList.remove(
            "complete"
        );

    }


    if (
        ai.preview
    ) {

        ai.preview.removeAttribute(
            "src"
        );

    }


    setButtonEnabled(
        ai.continueButton,
        false
    );


    app.state.ai = {

        completed:
            false,

        running:
            false,

        stagesCompleted:
            0,

        result:
            null,

        riskFlags:
            [],

        requiresHumanReview:
            false

    };

}


/* ============================================================
   ANIMATE ONE AI STAGE
============================================================ */

function runAIStage(
    container,
    stageName,
    duration,
    targetPercent = 100
) {

    return new Promise(
        resolve => {

            const fill =
                createAIProgressFill(
                    container
                );


            if (
                !fill
            ) {

                console.error(
                    `NutriCycle AI — Missing progress bar for ${stageName}.`
                );

                resolve();

                return;

            }


            let progress =
                0;


            const safeTarget =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            targetPercent
                        ) || 0
                    )
                );


            /*
               Use requestAnimationFrame rather
               than many unrelated timers.
            */

            const startTime =
                performance.now();


            function animate(
                currentTime
            ) {

                const elapsed =
                    currentTime -
                    startTime;


                progress =
                    Math.min(
                        elapsed /
                            duration *
                            safeTarget,
                        safeTarget
                    );


                fill.style.width =
                    `${progress}%`;


                if (
                    progress >=
                    safeTarget
                ) {

                    console.log(
                        `NutriCycle AI — ${stageName}: ${Math.round(progress)}%`
                    );


                    resolve();

                    return;

                }


                requestAnimationFrame(
                    animate
                );

            }


            requestAnimationFrame(
                animate
            );

        }
    );

}


/* ============================================================
   COPY IMAGE TO AI SCREEN
============================================================ */

function loadImageIntoAI() {

    const source =
        app.state.camera.imageData ||
        app.state.donation.image;


    if (
        !source
    ) {

        console.error(
            "NutriCycle AI — No captured image available for AI analysis."
        );

        return false;

    }


    if (
        !app.ui.ai.preview
    ) {

        console.error(
            "NutriCycle AI — aiPreviewImage not found."
        );

        return false;

    }


    app.ui.ai.preview.src =
        source;


    return true;

}


/* ============================================================
   STORE AI RESULT
============================================================ */

function storeAIResult() {

    const result =
        app.AI_RESULT;


    if (
        !result
    ) {

        return;

    }


    app.state.donation.foodName =
        result.foodName;


    app.state.donation.freshness =
        result.freshness;


    app.state.donation.shelfLife =
        result.shelfLife;


    app.state.donation.confidence =
        result.confidence;


    /*
       Preserve the image that caused
       the analysis.
    */

    app.state.donation.image =
        app.state.camera.imageData ||
        app.state.donation.image;


    /*
       Keep the complete AI result in memory
       for later modules.
    */

    app.state.ai.result =
        result;


    app.state.ai.riskFlags =
        Array.isArray(
            result.riskFlags
        )
            ? [
                ...result.riskFlags
            ]
            : [];


    app.state.ai.requiresHumanReview =
        result.requiresHumanReview === true;


    console.log(
        "NutriCycle AI — Real AI result stored:",
        {

            foodName:
                app.state.donation.foodName,

            freshness:
                app.state.donation.freshness,

            shelfLife:
                app.state.donation.shelfLife,

            confidence:
                app.state.donation.confidence,

            riskFlags:
                app.state.ai.riskFlags,

            requiresHumanReview:
                app.state.ai.requiresHumanReview

        }
    );

}


/* ============================================================
   FORMAT REJECTION MESSAGE
============================================================ */

function getAIRejectionMessage(
    result
) {

    const reason =
        String(
            result?.reason ||
            ""
        )
        .toLowerCase();


    if (
        reason ===
        "face"
    ) {

        return (
            "Human image detected. " +
            "Only food images can be submitted."
        );

    }


    if (
        reason ===
        "not_food"
    ) {

        return (
            "The image does not contain a valid food item."
        );

    }


    if (
        result?.visuallyContainsFood === false
    ) {

        return (
            "No valid food item was detected in the image."
        );

    }


    return (
        "The Food Analysis Agent could not approve this image."
    );

}


/* ============================================================
   SHOW AI ERROR
============================================================ */

function showAIError(
    message
) {

    const ai =
        app.ui.ai;


    app.state.ai.running =
        false;


    app.state.ai.completed =
        false;


    setButtonEnabled(
        ai.continueButton,
        false
    );


    if (
        ai.headline
    ) {

        ai.headline.textContent =
            "Analysis Failed";

    }


    if (
        ai.status
    ) {

        ai.status.textContent =
            message;

        ai.status.classList.remove(
            "ai-complete"
        );

        ai.status.classList.remove(
            "ai-warning"
        );

        ai.status.classList.add(
            "ai-error"
        );

    }


    if (
        ai.loader
    ) {

        ai.loader.classList.remove(
            "complete"
        );

    }

}


/* ============================================================
   SHOW AI BLOCKED RESULT
============================================================ */

function showAIBlockedResult(
    result
) {

    const ai =
        app.ui.ai;


    app.state.ai.running =
        false;


    app.state.ai.completed =
        false;


    app.state.ai.stagesCompleted =
        1;


    setButtonEnabled(
        ai.continueButton,
        false
    );


    if (
        ai.headline
    ) {

        ai.headline.textContent =
            "Food Submission Blocked";

    }


    let message =
        getAIRejectionMessage(
            result
        );


    if (
        result.requiresHumanReview
    ) {

        message =
            "This submission requires human review before it can continue.";

    }


    if (
        result.riskFlags &&
        result.riskFlags.length > 0
    ) {

        message +=
            ` Risk flags: ${result.riskFlags.join(", ")}.`;

    }


    if (
        ai.status
    ) {

        ai.status.textContent =
            message;

        ai.status.classList.remove(
            "ai-complete"
        );

        ai.status.classList.remove(
            "ai-error"
        );

        ai.status.classList.add(
            "ai-warning"
        );

    }


    if (
        ai.loader
    ) {

        ai.loader.classList.remove(
            "complete"
        );

    }


    console.warn(
        "NutriCycle AI — Submission blocked:",
        result
    );

}


/* ============================================================
   COMPLETE AI UI
============================================================ */

function completeAIAnalysis() {

    const ai =
        app.ui.ai;


    /*
       Never allow completion when the backend
       explicitly requests human review.
    */

    if (
        app.state.ai.requiresHumanReview === true
    ) {

        showAIBlockedResult(
            app.AI_RESULT
        );

        return;

    }


    if (
        !app.AI_RESULT.valid
    ) {

        showAIBlockedResult(
            app.AI_RESULT
        );

        return;

    }


    /*
       IMPORTANT:
       This function is the only place where AI
       becomes officially completed.
    */

    app.state.ai.completed =
        true;


    app.state.ai.running =
        false;


    app.state.ai.stagesCompleted =
        4;


    storeAIResult();


    if (
        ai.headline
    ) {

        ai.headline.textContent =
            "Analysis Complete ✓";

    }


    if (
        ai.status
    ) {

        const confidenceText =
            app.AI_RESULT.confidence ||
            "Unknown";


        ai.status.textContent =
            `Food analysis completed successfully. Confidence: ${confidenceText}`;


        ai.status.classList.remove(
            "ai-error"
        );

        ai.status.classList.remove(
            "ai-warning"
        );

        ai.status.classList.add(
            "ai-complete"
        );

    }


    if (
        ai.loader
    ) {

        ai.loader.classList.add(
            "complete"
        );

    }


    setButtonEnabled(
        ai.continueButton,
        true
    );


    console.log(
        "NutriCycle AI — REAL ANALYSIS COMPLETE"
    );

}


/* ============================================================
   CALL FOOD ANALYSIS BACKEND
============================================================ */

async function requestFoodAnalysis(
    image
) {

    const endpoint =
        getAIEndpoint();


    console.log(
        "NutriCycle AI — Sending image to:",
        endpoint
    );


    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => {

                controller.abort();

            },
            45000
        );


    try {

        const response =
            await fetch(
                endpoint,
                {

                    method:
                        "POST",

                    headers:
                        {
                            "Content-Type":
                                "application/json"
                        },

                    body:
                        JSON.stringify(
                            {
                                image:
                                    image
                            }
                        ),

                    signal:
                        controller.signal

                }
            );


        const responseText =
            await response.text();


        let data =
            null;


        try {

            data =
                JSON.parse(
                    responseText
                );

        }
        catch (
            parseError
        ) {

            console.error(
                "NutriCycle AI — Backend returned invalid JSON:",
                responseText
            );


            throw new Error(
                "The AI backend returned an invalid response."
            );

        }


        if (
            !response.ok
        ) {

            const backendMessage =
                data?.message ||
                data?.error ||
                `AI backend returned HTTP ${response.status}.`;


            throw new Error(
                backendMessage
            );

        }


        return data;

    }
    catch (
        error
    ) {

        if (
            error?.name ===
            "AbortError"
        ) {

            throw new Error(
                "AI analysis timed out. Check the Render backend and try again."
            );

        }


        throw error;

    }
    finally {

        clearTimeout(
            timeout
        );

    }

}


/* ============================================================
   RUN FULL AI ANALYSIS
============================================================ */

async function runAIAnalysis() {

    /*
       Prevent accidental double execution.
    */

    if (
        app.state.ai?.running
    ) {

        return;

    }


    resetAIUI();


    if (
        !loadImageIntoAI()
    ) {

        if (
            app.ui.ai.status
        ) {

            app.ui.ai.status.textContent =
                "No captured image was found. Return to Capture and try again.";

        }

        return;

    }


    const image =
        app.state.camera.imageData ||
        app.state.donation.image;


    if (
        !image
    ) {

        if (
            app.ui.ai.status
        ) {

            app.ui.ai.status.textContent =
                "No captured image is available for AI analysis.";

        }

        return;

    }


    app.state.ai = {

        completed:
            false,

        running:
            true,

        stagesCompleted:
            0,

        result:
            null,

        riskFlags:
            [],

        requiresHumanReview:
            false

    };


    if (
        app.ui.ai.headline
    ) {

        app.ui.ai.headline.textContent =
            "Analyzing Food...";

    }


    if (
        app.ui.ai.status
    ) {

        app.ui.ai.status.textContent =
            "Connecting to the Food Analysis Agent...";

    }


    setButtonEnabled(
        app.ui.ai.continueButton,
        false
    );


    try {

        /* ----------------------------------------------------
           REAL BACKEND REQUEST THROUGH CENTRAL API GATEWAY
        ---------------------------------------------------- */

        if (
            !window.NutriCycleAIApi ||
            typeof window.NutriCycleAIApi.scanFood !==
                "function"
        ) {

            throw new Error(
                "NutriCycle AI API Gateway is not available."
            );

        }


        const rawResult =
            await window.NutriCycleAIApi.scanFood(
                image
            );


        console.log(
            "NutriCycle AI — API Gateway response:",
            rawResult
        );


        const result =
            normalizeAIResult(
                rawResult
            );


        app.AI_RESULT =
            result;


        app.state.ai.result =
            result;


        app.state.ai.riskFlags =
            [
                ...result.riskFlags
            ];


        app.state.ai.requiresHumanReview =
            result.requiresHumanReview;


        /* ----------------------------------------------------
           STAGE 1 — FOOD DETECTION
        ---------------------------------------------------- */

        if (
            app.ui.ai.status
        ) {

            app.ui.ai.status.textContent =
                "Food detection completed.";

        }


        await runAIStage(
            app.ui.ai.detectProgress,
            "Food Detection",
            500,
            100
        );


        app.state.ai.stagesCompleted =
            1;


        /*
           Stop immediately if the backend rejected
           the image as non-food.
        */

        if (
            !result.valid ||
            !result.visuallyContainsFood
        ) {

            showAIBlockedResult(
                result
            );

            return;

        }


        /* ----------------------------------------------------
           STAGE 2 — VISUAL CONDITION
        ---------------------------------------------------- */

        if (
            app.ui.ai.status
        ) {

            app.ui.ai.status.textContent =
                "Assessing visible food condition...";

        }


        await runAIStage(
            app.ui.ai.freshnessProgress,
            "Freshness Analysis",
            600,
            100
        );


        app.state.ai.stagesCompleted =
            2;


        /* ----------------------------------------------------
           STAGE 3 — FOOD INFORMATION
        ---------------------------------------------------- */

        if (
            app.ui.ai.status
        ) {

            app.ui.ai.status.textContent =
                "Preparing food information. Shelf life is not determined from the image alone.";

        }


        await runAIStage(
            app.ui.ai.shelfProgress,
            "Food Information",
            600,
            100
        );


        app.state.ai.stagesCompleted =
            3;


        /* ----------------------------------------------------
           STAGE 4 — CONFIDENCE
        ---------------------------------------------------- */

        const confidenceTarget =
            result.confidenceNumber > 0
                ? result.confidenceNumber
                : 100;


        if (
            app.ui.ai.status
        ) {

            app.ui.ai.status.textContent =
                "Finalizing AI confidence result.";

        }


        await runAIStage(
            app.ui.ai.confidenceProgress,
            "Confidence Score",
            700,
            confidenceTarget
        );


        app.state.ai.stagesCompleted =
            4;


        /* ----------------------------------------------------
           HUMAN REVIEW CHECK
        ---------------------------------------------------- */

        if (
            result.requiresHumanReview
        ) {

            showAIBlockedResult(
                result
            );

            return;

        }


        /* ----------------------------------------------------
           FINAL COMPLETION
        ---------------------------------------------------- */

        completeAIAnalysis();

    }
    catch (
        error
    ) {

        console.error(
            "NutriCycle AI — Analysis failed:",
            {
                endpoint:
                    typeof window.NutriCycleAIApi?.getConfig ===
                        "function"
                        ? window.NutriCycleAIApi.getConfig()
                              .apiBaseUrl
                        : "AI API Gateway unavailable",

                error
            }
        );


        showAIError(
            error?.message ||
            "AI analysis could not be completed. Please try again."
        );

    }

}


/* ============================================================
   AI → DETAILS
============================================================ */

function continueFromAI() {

    if (
        !app.state.ai?.completed
    ) {

        console.warn(
            "NutriCycle AI — Continue blocked: AI analysis is not complete."
        );

        return;

    }


    if (
        app.state.ai?.requiresHumanReview
    ) {

        console.warn(
            "NutriCycle AI — Continue blocked: human review required."
        );

        return;

    }


    /*
       Copy the verified AI image to
       the Details screen.
    */

    const detailsImage =
        document.getElementById(
            "detailsFoodImage"
        );


    if (
        detailsImage &&
        app.state.donation.image
    ) {

        detailsImage.src =
            app.state.donation.image;

    }


    console.log(
        "NutriCycle AI — AI → Details"
    );


    showScreen(
        2
    );


    /*
       Part 3 populates the Details form
       using the AI result stored in state.
    */

    if (
        typeof app.initializeDetails ===
        "function"
    ) {

        app.initializeDetails();

    }

}


/* ============================================================
   AI EVENT BINDING
============================================================ */

function bindAIEvents() {

    const button =
        app.ui.ai.continueButton;


    if (
        !button
    ) {

        console.error(
            "NutriCycle AI — aiNextButton not found."
        );

        return;

    }


    /*
       Prevent duplicate event listeners when
       initializeAI() is called more than once.
    */

    if (
        button.dataset.aiBound ===
        "true"
    ) {

        return;

    }


    button.addEventListener(
        "click",
        continueFromAI
    );


    button.dataset.aiBound =
        "true";


    console.log(
        "NutriCycle AI — AI Module Ready"
    );

}


/* ============================================================
   REGISTER AI MODULE
============================================================ */

app.runAIAnalysis =
    runAIAnalysis;


app.initializeAI =
    function initializeAI() {

        /*
           Refresh DOM references.
           This keeps the module safe even if
           the DOM was replaced or re-rendered.
        */

        app.ui.ai.preview =
            document.getElementById(
                "aiPreviewImage"
            );


        app.ui.ai.detectProgress =
            document.getElementById(
                "detectProgress"
            );


        app.ui.ai.freshnessProgress =
            document.getElementById(
                "freshnessProgress"
            );


        app.ui.ai.shelfProgress =
            document.getElementById(
                "shelfProgress"
            );


        app.ui.ai.confidenceProgress =
            document.getElementById(
                "confidenceProgress"
            );


        app.ui.ai.status =
            document.getElementById(
                "aiStatusMessage"
            );


        app.ui.ai.loader =
            document.querySelector(
                "#aiScreen .ai-loader"
            );


        app.ui.ai.headline =
            document.querySelector(
                "#aiScreen .ai-loader h3"
            );


        app.ui.ai.continueButton =
            document.getElementById(
                "aiNextButton"
            );


        resetAIUI();


        bindAIEvents();

    };


/* ============================================================
   WAIT FOR DOM
============================================================ */

function initializeAIModule() {

    app.initializeAI();

}


/*
   Because Parts 1–10 are contained in the
   same donation.js file, the AI module can
   safely initialize after DOMContentLoaded.
*/

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAIModule,
        {
            once:
                true
        }
    );

}

else {

    initializeAIModule();

}
/* ============================================================
   NUTRICYCLE AI
   DONATION MODULE
   PART 3 — DETAILS + VALIDATION
============================================================ */


/* ============================================================
   SHARED REFERENCES
============================================================ */

const appDetails =
    window.NutriCycleAI;

const setButtonEnabledDetails =
    appDetails.setButtonEnabled;

const showScreenDetails =
    appDetails.showScreen;


/* ============================================================
   DETAILS DOM
============================================================ */

appDetails.ui.details = {

    image:
        document.getElementById(
            "detailsFoodImage"
        ),

    foodName:
        document.getElementById(
            "foodName"
        ),

    freshness:
        document.getElementById(
            "freshness"
        ),

    shelfLife:
        document.getElementById(
            "shelfLife"
        ),

    confidence:
        document.getElementById(
            "confidence"
        ),

    quantity:
        document.getElementById(
            "foodQuantity"
        ),

    unit:
        document.getElementById(
            "foodUnit"
        ),

    preparedTime:
        document.getElementById(
            "preparedTime"
        ),

    expiryTime:
        document.getElementById(
            "expiryTime"
        ),

    notes:
        document.getElementById(
            "foodNotes"
        ),

    error:
        document.getElementById(
            "detailsError"
        ),

    backButton:
        document.getElementById(
            "detailsBackButton"
        ),

    nextButton:
        document.getElementById(
            "detailsNextButton"
        )

};


/* ============================================================
   DETAILS INITIAL STATE
============================================================ */

appDetails.state.details = {

    initialized:
        false,

    valid:
        false

};


/* ============================================================
   ERROR MESSAGE
============================================================ */

function setDetailsError(
    message
) {

    const element =
        appDetails.ui.details.error;


    if (!element) {

        return;

    }


    element.textContent =
        message;

}


/* ============================================================
   CLEAR ERROR
============================================================ */

function clearDetailsError() {

    setDetailsError(
        ""
    );

}


/* ============================================================
   DATE FORMATTER FOR DATETIME-LOCAL
============================================================ */

function toDatetimeLocalValue(
    date
) {

    if (
        !(date instanceof Date) ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const pad =
        value =>
            String(
                value
            ).padStart(
                2,
                "0"
            );


    return [

        date.getFullYear(),

        "-",

        pad(
            date.getMonth() + 1
        ),

        "-",

        pad(
            date.getDate()
        ),

        "T",

        pad(
            date.getHours()
        ),

        ":",

        pad(
            date.getMinutes()
        )

    ].join("");

}


/* ============================================================
   SET DEFAULT PREPARATION + EXPIRY
============================================================ */

function setDefaultFoodTimes() {

    const preparedInput =
        appDetails.ui.details.preparedTime;

    const expiryInput =
        appDetails.ui.details.expiryTime;


    if (
        !preparedInput ||
        !expiryInput
    ) {

        return;

    }


    /*
       We use the current local date/time as the default
       preparation time and six hours later as expiry.
       The user can change both values afterwards.
    */

    const now =
        new Date();


    const expiry =
        new Date(
            now.getTime() +
            (
                6 *
                60 *
                60 *
                1000
            )
        );


    preparedInput.value =
        toDatetimeLocalValue(
            now
        );


    expiryInput.value =
        toDatetimeLocalValue(
            expiry
        );

}


/* ============================================================
   POPULATE AI DATA
============================================================ */

function populateAIDataIntoDetails() {

    const donation =
        appDetails.state.donation;


    const details =
        appDetails.ui.details;


    if (details.image) {

        details.image.src =
            donation.image || "";

    }


    if (details.foodName) {

        details.foodName.value =
            donation.foodName || "";

    }


    if (details.freshness) {

        details.freshness.value =
            donation.freshness || "";

    }


    if (details.shelfLife) {

        details.shelfLife.value =
            donation.shelfLife || "";

    }


    if (details.confidence) {

        details.confidence.value =
            donation.confidence || "";

    }


    /*
       Notes, quantity and unit are intentionally NOT
       populated by AI because these are donor-entered
       values.
    */

}


/* ============================================================
   CONVERT QUANTITY TO KG
============================================================ */

function convertQuantityToKg(
    quantity,
    unit
) {

    const value =
        Number(
            quantity
        );


    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {

        return null;

    }


    const normalizedUnit =
        String(
            unit || ""
        )
        .trim()
        .toLowerCase();


    switch (
        normalizedUnit
    ) {

        case "kg":

            return value;


        case "g":

            return value / 1000;


        case "lb":

            return value * 0.453592;


        case "l":

            /*
               For food logistics we cannot universally
               equate litres to kilograms without food
               density. Preserve the entered amount for now.
            */

            return value;


        case "ml":

            return value / 1000;


        case "pieces":

        case "plates":

        case "packets":

        case "boxes":

            /*
               These units do not have a universal weight.
               Keep the value as a logistics quantity for
               now; the assignment module can apply its
               controlled prototype mapping.
            */

            return value;


        default:

            return null;

    }

}


/* ============================================================
   VALIDATE QUANTITY
============================================================ */

function validateQuantity() {

    const quantity =
        Number(
            appDetails.ui.details.quantity?.value
        );


    if (
        !Number.isFinite(quantity) ||
        quantity <= 0
    ) {

        return {
            valid:
                false,

            message:
                "Enter a quantity greater than 0."

        };

    }


    if (
        !appDetails.ui.details.unit?.value
    ) {

        return {
            valid:
                false,

            message:
                "Select a unit for the food quantity."

        };

    }


    return {

        valid:
            true,

        message:
            ""

    };

}


/* ============================================================
   VALIDATE PREPARATION / EXPIRY
============================================================ */

function validateFoodTimes() {

    const preparedValue =
        appDetails.ui.details.preparedTime?.value;


    const expiryValue =
        appDetails.ui.details.expiryTime?.value;


    if (!preparedValue) {

        return {

            valid:
                false,

            message:
                "Enter the preparation time."

        };

    }


    if (!expiryValue) {

        return {

            valid:
                false,

            message:
                "Enter the expected expiry time."

        };

    }


    const prepared =
        new Date(
            preparedValue
        );


    const expiry =
        new Date(
            expiryValue
        );


    if (
        Number.isNaN(
            prepared.getTime()
        )
    ) {

        return {

            valid:
                false,

            message:
                "The preparation time is invalid."

        };

    }


    if (
        Number.isNaN(
            expiry.getTime()
        )
    ) {

        return {

            valid:
                false,

            message:
                "The expiry time is invalid."

        };

    }


    if (
        expiry <= prepared
    ) {

        return {

            valid:
                false,

            message:
                "Expiry time must be later than preparation time."

        };

    }


    return {

        valid:
            true,

        message:
            ""

    };

}


/* ============================================================
   VALIDATE ALL DETAILS
============================================================ */

function validateDetails(
    showMessage = true
) {

    const details =
        appDetails.ui.details;


    clearDetailsError();


    /*
       FOOD NAME
    */

    if (
        !details.foodName ||
        !details.foodName.value.trim()
    ) {

        if (showMessage) {

            setDetailsError(
                "Food name is missing. Return to AI analysis and try again."
            );

        }


        return false;

    }


    /*
       QUANTITY
    */

    const quantityResult =
        validateQuantity();


    if (
        !quantityResult.valid
    ) {

        if (showMessage) {

            setDetailsError(
                quantityResult.message
            );

        }


        return false;

    }


    /*
       PREPARATION / EXPIRY
    */

    const timeResult =
        validateFoodTimes();


    if (
        !timeResult.valid
    ) {

        if (showMessage) {

            setDetailsError(
                timeResult.message
            );

        }


        return false;

    }


    return true;

}


/* ============================================================
   UPDATE DETAILS BUTTON
============================================================ */

function updateDetailsButton() {

    const valid =
        validateDetails(
            false
        );


    appDetails.state.details.valid =
        valid;


    setButtonEnabledDetails(
        appDetails.ui.details.nextButton,
        valid
    );

}


/* ============================================================
   STORE DETAILS
============================================================ */

function storeDetails() {

    const details =
        appDetails.ui.details;

    const donation =
        appDetails.state.donation;


    donation.foodName =
        details.foodName.value.trim();


    donation.freshness =
        details.freshness.value.trim();


    donation.shelfLife =
        details.shelfLife.value.trim();


    donation.confidence =
        details.confidence.value.trim();


    donation.quantity =
        Number(
            details.quantity.value
        );


    donation.unit =
        details.unit.value;


    donation.quantityKg =
        convertQuantityToKg(
            donation.quantity,
            donation.unit
        );


    donation.preparedTime =
        details.preparedTime.value;


    donation.expiryTime =
        details.expiryTime.value;


    donation.notes =
        details.notes?.value.trim() || "";


    console.log(
        "NutriCycle AI — Details stored:",
        {
            foodName:
                donation.foodName,

            quantity:
                donation.quantity,

            unit:
                donation.unit,

            quantityKg:
                donation.quantityKg,

            preparedTime:
                donation.preparedTime,

            expiryTime:
                donation.expiryTime

        }
    );

}


/* ============================================================
   UPDATE FIELD VISUAL STATE
============================================================ */

function refreshFieldState(
    input
) {

    if (!input) {

        return;

    }


    const group =
        input.closest(
            ".input-group"
        );


    if (!group) {

        return;

    }


    group.classList.remove(
        "invalid"
    );


    /*
       Only validate fields that the donor can change.
    */

    if (
        input ===
            appDetails.ui.details.quantity
    ) {

        const result =
            validateQuantity();


        if (
            !result.valid
        ) {

            group.classList.add(
                "invalid"
            );

        }

    }


    if (
        input ===
            appDetails.ui.details.preparedTime ||
        input ===
            appDetails.ui.details.expiryTime
    ) {

        const result =
            validateFoodTimes();


        if (
            !result.valid
        ) {

            group.classList.add(
                "invalid"
            );

        }

    }

}


/* ============================================================
   DETAILS INPUT HANDLER
============================================================ */

function handleDetailsInput(
    event
) {

    clearDetailsError();


    refreshFieldState(
        event.target
    );


    updateDetailsButton();

}


/* ============================================================
   DETAILS → FOOD CARD
============================================================ */

function continueFromDetails() {

    if (
        !validateDetails(
            true
        )
    ) {

        updateDetailsButton();

        return;

    }


    storeDetails();


    console.log(
        "NutriCycle AI — Details → Food Card"
    );


    showScreenDetails(
        3
    );


    /*
       Part 4 will build the Food Card from
       app.state.donation.
    */

    if (
        typeof appDetails.initializeFoodCard ===
        "function"
    ) {

        appDetails.initializeFoodCard();

    }

}


/* ============================================================
   DETAILS BACK
============================================================ */

function goBackFromDetails() {

    /*
       Do not erase the captured image or AI result.
       The donor can return and make corrections.
    */

    showScreenDetails(
        1
    );


    /*
       When returning to AI, do NOT rerun the analysis
       automatically.
    */

}


/* ============================================================
   DETAILS EVENT BINDING
============================================================ */

function bindDetailsEvents() {

    const details =
        appDetails.ui.details;


    if (
        details.backButton
    ) {

        details.backButton.addEventListener(
            "click",
            goBackFromDetails
        );

    }


    if (
        details.nextButton
    ) {

        details.nextButton.addEventListener(
            "click",
            continueFromDetails
        );

    }


    [
        details.foodName,
        details.quantity,
        details.unit,
        details.preparedTime,
        details.expiryTime,
        details.notes
    ]
    .forEach(
        element => {

            if (!element) {

                return;

            }


            element.addEventListener(
                "input",
                handleDetailsInput
            );


            element.addEventListener(
                "change",
                handleDetailsInput
            );

        }
    );


    console.log(
        "NutriCycle AI — Details Module Ready"
    );

}


/* ============================================================
   INITIALIZE DETAILS
============================================================ */

function initializeDetails() {

    populateAIDataIntoDetails();


    /*
       Only set default times if they haven't already
       been entered. This prevents returning to Details
       from destroying the donor's input.
    */

    if (
        !appDetails.ui.details.preparedTime.value ||
        !appDetails.ui.details.expiryTime.value
    ) {

        setDefaultFoodTimes();

    }


    updateDetailsButton();


    appDetails.state.details.initialized =
        true;

}


/* ============================================================
   REGISTER DETAILS MODULE
============================================================ */

appDetails.initializeDetails =
    initializeDetails;


appDetails.convertQuantityToKg =
    convertQuantityToKg;


/* ============================================================
   SAFE INITIALIZATION
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            /*
               The actual population happens when AI
               finishes and calls initializeDetails().
            */

            bindDetailsEvents();

        },
        {
            once:
                true
        }
    );

}

else {

    bindDetailsEvents();

}
/* ============================================================
   NUTRICYCLE AI
   DONATION MODULE
   PART 4 — FOOD CARD
============================================================ */


/* ============================================================
   SHARED APPLICATION REFERENCE
============================================================ */

const appFoodCard =
    window.NutriCycleAI;

const setButtonEnabledFoodCard =
    appFoodCard.setButtonEnabled;

const showScreenFoodCard =
    appFoodCard.showScreen;


/* ============================================================
   FOOD CARD DOM
============================================================ */

appFoodCard.ui.foodCard = {

    screen:
        document.getElementById(
            "foodCardScreen"
        ),

    image:
        document.getElementById(
            "foodCardImage"
        ),

    foodID:
        document.getElementById(
            "foodID"
        ),

    foodName:
        document.getElementById(
            "cardFoodName"
        ),

    quantity:
        document.getElementById(
            "cardQuantity"
        ),

    freshness:
        document.getElementById(
            "cardFreshness"
        ),

    shelfLife:
        document.getElementById(
            "cardShelfLife"
        ),

    confidence:
        document.getElementById(
            "cardConfidence"
        ),

    backButton:
        document.getElementById(
            "foodCardBackButton"
        ),

    nextButton:
        document.getElementById(
            "foodCardNextButton"
        )

};


/* ============================================================
   FOOD CARD STATE
============================================================ */

appFoodCard.state.foodCard = {

    generated:
        false

};


/* ============================================================
   GENERATE UNIQUE DONATION ID
============================================================ */

function generateDonationID() {

    const timestamp =
        Date.now()
            .toString(36)
            .toUpperCase();


    const random =
        Math.random()
            .toString(36)
            .slice(
                2,
                7
            )
            .toUpperCase();


    return `NCA-${timestamp}-${random}`;

}


/* ============================================================
   FORMAT QUANTITY FOR DISPLAY
============================================================ */

function formatQuantityForDisplay(
    quantity,
    unit
) {

    if (
        !Number.isFinite(
            Number(quantity)
        )
    ) {

        return "--";

    }


    const value =
        Number(
            quantity
        );


    let formatted;


    if (
        Number.isInteger(
            value
        )
    ) {

        formatted =
            String(
                value
            );

    }

    else {

        formatted =
            value.toFixed(
                2
            )
            .replace(
                /\.?0+$/,
                ""
            );

    }


    return `${formatted} ${unit || ""}`.trim();

}


/* ============================================================
   GENERATE FOOD CARD
============================================================ */

function generateFoodCard() {

    const donation =
        appFoodCard.state.donation;

    const card =
        appFoodCard.ui.foodCard;


    /*
       A Food Card is generated only after Details
       have passed validation.
    */

    if (
        !donation.foodName ||
        !donation.quantity ||
        !donation.unit ||
        !donation.preparedTime ||
        !donation.expiryTime
    ) {

        console.error(
            "NutriCycle AI — Food Card generation blocked: incomplete donation data."
        );

        return false;

    }


    /*
       Generate the ID only once.
       Going back to Details should not create
       a new donation ID.
    */

    if (
        !donation.id
    ) {

        donation.id =
            generateDonationID();

    }


    /* --------------------------------------------------------
       IMAGE
    -------------------------------------------------------- */

    if (
        card.image
    ) {

        card.image.src =
            donation.image || "";

    }


    /* --------------------------------------------------------
       ID
    -------------------------------------------------------- */

    if (
        card.foodID
    ) {

        card.foodID.textContent =
            donation.id;

    }


    /* --------------------------------------------------------
       FOOD NAME
    -------------------------------------------------------- */

    if (
        card.foodName
    ) {

        card.foodName.textContent =
            donation.foodName;

    }


    /* --------------------------------------------------------
       QUANTITY
    -------------------------------------------------------- */

    if (
        card.quantity
    ) {

        card.quantity.textContent =
            formatQuantityForDisplay(
                donation.quantity,
                donation.unit
            );

    }


    /* --------------------------------------------------------
       FRESHNESS
    -------------------------------------------------------- */

    if (
        card.freshness
    ) {

        card.freshness.textContent =
            donation.freshness || "--";

    }


    /* --------------------------------------------------------
       SHELF LIFE
    -------------------------------------------------------- */

    if (
        card.shelfLife
    ) {

        card.shelfLife.textContent =
            donation.shelfLife || "--";

    }


    /* --------------------------------------------------------
       AI CONFIDENCE
    -------------------------------------------------------- */

    if (
        card.confidence
    ) {

        card.confidence.textContent =
            donation.confidence || "--";

    }


    donation.status =
        "Food Card Generated";


    appFoodCard.state.foodCard.generated =
        true;


    /*
       Continue is enabled only after the card is
       completely populated.
    */

    setButtonEnabledFoodCard(
        card.nextButton,
        true
    );


    console.log(
        "NutriCycle AI — Food Card generated:",
        {
            id:
                donation.id,

            foodName:
                donation.foodName,

            quantity:
                donation.quantity,

            unit:
                donation.unit,

            quantityKg:
                donation.quantityKg
        }
    );


    return true;

}


/* ============================================================
   OPEN FOOD CARD
============================================================ */

function openFoodCard() {

    if (
        !appFoodCard.state.details.valid
    ) {

        console.warn(
            "NutriCycle AI — Cannot open Food Card: Details are not valid."
        );

        return;

    }


    if (
        !generateFoodCard()
    ) {

        return;

    }


    showScreenFoodCard(
        3
    );


    console.log(
        "NutriCycle AI — Details → Food Card"
    );

}


/* ============================================================
   FOOD CARD BACK
============================================================ */

function goBackFromFoodCard() {

    showScreenFoodCard(
        2
    );


    /*
       Preserve all entered data.
       The donor can correct the Details without
       losing the captured image or AI result.
    */

}


/* ============================================================
   FOOD CARD → PAYMENT
============================================================ */

function continueFromFoodCard() {

    if (
        !appFoodCard.state.foodCard.generated
    ) {

        console.warn(
            "NutriCycle AI — Food Card is not ready."
        );

        return;

    }


    /*
       Payment is initialized by Part 5.
       We only hand over control to it here.
    */

    showScreenFoodCard(
        4
    );


    console.log(
        "NutriCycle AI — Food Card → Payment"
    );


    if (
        typeof appFoodCard.initializePaymentScreen ===
        "function"
    ) {

        appFoodCard.initializePaymentScreen();

    }

}


/* ============================================================
   FOOD CARD EVENT BINDING
============================================================ */

function bindFoodCardEvents() {

    const card =
        appFoodCard.ui.foodCard;


    if (
        card.backButton
    ) {

        card.backButton.addEventListener(
            "click",
            goBackFromFoodCard
        );

    }


    if (
        card.nextButton
    ) {

        card.nextButton.addEventListener(
            "click",
            continueFromFoodCard
        );

    }


    console.log(
        "NutriCycle AI — Food Card Module Ready"
    );

}


/* ============================================================
   REGISTER FOOD CARD MODULE
============================================================ */

appFoodCard.initializeFoodCard =
    openFoodCard;


/* ============================================================
   INITIALIZE FOOD CARD EVENTS
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        bindFoodCardEvents,
        {
            once:
                true
        }
    );

}

else {

    bindFoodCardEvents();

}
/* ============================================================
   NUTRICYCLE AI
   DONATION MODULE
   PART 5 — PAYMENT + SUCCESS FLOW
============================================================ */


/* ============================================================
   SHARED APPLICATION REFERENCE
============================================================ */

const appPayment =
    window.NutriCycleAI;

const setButtonEnabledPayment =
    appPayment.setButtonEnabled;

const showScreenPayment =
    appPayment.showScreen;


/* ============================================================
   PAYMENT CONFIGURATION
============================================================ */

appPayment.PAYMENT_CONFIG = {

    minimumAmount:
        50,

    processingTime:
        1500

};


/* ============================================================
   PAYMENT DOM
============================================================ */

appPayment.ui.payment = {

    screen:
        document.getElementById(
            "paymentScreen"
        ),

            amountInput:
        document.getElementById(
            "donationAmount"
        ),

    options:
        Array.from(
            document.querySelectorAll(
                ".payment-option"
            )
        ),

    error:
        document.getElementById(
            "paymentError"
        ),

    backButton:
        document.getElementById(
            "paymentBackButton"
        ),

    nextButton:
        document.getElementById(
            "paymentNextButton"
        )

};


/* ============================================================
   SUCCESS / LOADING DOM
============================================================ */

appPayment.ui.payment.loadingOverlay =
    document.getElementById(
        "loadingOverlay"
    );


appPayment.ui.payment.loadingMessage =
    document.getElementById(
        "loadingMessage"
    );


appPayment.ui.payment.successModal =
    document.getElementById(
        "successModal"
    );


appPayment.ui.payment.successMessage =
    document.getElementById(
        "successMessage"
    );


appPayment.ui.payment.closeSuccessButton =
    document.getElementById(
        "closeSuccessButton"
    );


/* ============================================================
   PAYMENT STATE
============================================================ */

appPayment.state.payment = {

    selectedMethod:
        "",

    processing:
        false,

    completed:
        false,

    successModalOpen:
        false,

    eventsBound:
        false

};


/* ============================================================
   PAYMENT ERROR
============================================================ */

function showPaymentError(
    message
) {

    const error =
        appPayment.ui.payment.error;


    if (!error) {

        return;

    }


    error.textContent =
        message;


}


/* ============================================================
   CLEAR PAYMENT ERROR
============================================================ */

function clearPaymentError() {

    showPaymentError(
        ""
    );

}


/* ============================================================
   LOADING
============================================================ */

function showPaymentLoading(
    message
) {

    const overlay =
        appPayment.ui.payment.loadingOverlay;

    const messageElement =
        appPayment.ui.payment.loadingMessage;


    if (
        messageElement
    ) {

        messageElement.textContent =
            message;

    }


    if (
        overlay
    ) {

        overlay.classList.add(
            "active"
        );

    }

}


function hidePaymentLoading() {

    const overlay =
        appPayment.ui.payment.loadingOverlay;


    if (
        overlay
    ) {

        overlay.classList.remove(
            "active"
        );

    }

}


/* ============================================================
   SUCCESS MODAL
============================================================ */

function showPaymentSuccess() {

    const modal =
        appPayment.ui.payment.successModal;

    const message =
        appPayment.ui.payment.successMessage;


    if (
        message
    ) {

      const amount =
    appPayment.state.donation.paymentAmount;

message.textContent =
    `Your ₹${amount} donation service payment was successful.`;

    }


    if (
        modal
    ) {

        modal.classList.add(
            "active"
        );

    }


    appPayment.state.payment.successModalOpen =
        true;

}


/* ============================================================
   HIDE SUCCESS MODAL
============================================================ */

function hidePaymentSuccess() {

    const modal =
        appPayment.ui.payment.successModal;


    if (
        modal
    ) {

        modal.classList.remove(
            "active"
        );

    }


    appPayment.state.payment.successModalOpen =
        false;

}


/* ============================================================
   RESET PAYMENT
============================================================ */

function resetPayment() {

    const payment =
        appPayment.state.payment;

    const ui =
        appPayment.ui.payment;


    payment.selectedMethod =
        "";

    payment.processing =
        false;

    payment.completed =
        false;

    payment.successModalOpen =
        false;


    clearPaymentError();


    /*
       Remove selection from all options.
    */

    ui.options.forEach(
        option => {

            option.classList.remove(
                "selected"
            );

            option.setAttribute(
                "aria-pressed",
                "false"
            );

        }
    );


    setButtonEnabledPayment(
        ui.nextButton,
        false
    );


    hidePaymentLoading();


    if (
        ui.successModal
    ) {

        ui.successModal.classList.remove(
            "active"
        );

    }

}


/* ============================================================
   SELECT PAYMENT METHOD
============================================================ */

function selectPaymentMethod(
    option
) {

    if (
        !option
    ) {

        return;

    }


    const method =
        option.dataset.method;


    if (
        !method
    ) {

        showPaymentError(
            "This payment method is unavailable."
        );

        return;

    }


    /*
       Do nothing while a payment is already processing.
    */

    if (
        appPayment.state.payment.processing
    ) {

        return;

    }


    /*
       Clear previous selection.
    */

    appPayment.ui.payment.options
        .forEach(
            item => {

                item.classList.remove(
                    "selected"
                );

                item.setAttribute(
                    "aria-pressed",
                    "false"
                );

            }
        );


    /*
       Select current method.
    */

    option.classList.add(
        "selected"
    );


    option.setAttribute(
        "aria-pressed",
        "true"
    );


    appPayment.state.payment.selectedMethod =
        method;


    clearPaymentError();


    setButtonEnabledPayment(
        appPayment.ui.payment.nextButton,
        true
    );


    console.log(
        "NutriCycle AI — Payment method selected:",
        method
    );

}


/* ============================================================
   START PAYMENT
============================================================ */

function processPayment() {

    const payment =
        appPayment.state.payment;


    if (
        payment.processing
    ) {

        return;

    }


    if (
        !payment.selectedMethod
    ) {

        showPaymentError(
            "Please select a payment method."
        );

        return;

    }


    /*
       Validate donation information one last time.
       This prevents payment being processed for an
       incomplete donation.
    */

    if (
        !appPayment.state.donation.id ||
        !appPayment.state.donation.foodName ||
        !appPayment.state.donation.quantity ||
        !appPayment.state.donation.unit
    ) {

        showPaymentError(
            "Donation information is incomplete. Return to Food Card and try again."
        );

        return;

    }


    payment.processing =
        true;


    clearPaymentError();


    setButtonEnabledPayment(
        appPayment.ui.payment.nextButton,
        false
    );


    appPayment.state.donation.paymentMethod =
        payment.selectedMethod;


    const amount =
    Number(
        appPayment.ui.payment.amountInput?.value
    );


if (
    !Number.isFinite(amount) ||
    amount < appPayment.PAYMENT_CONFIG.minimumAmount
) {

    showPaymentError(
        `Minimum contribution is ₹${appPayment.PAYMENT_CONFIG.minimumAmount}.`
    );

    appPayment.ui.payment.amountInput?.focus();

    payment.processing = false;

    setButtonEnabledPayment(
        appPayment.ui.payment.nextButton,
        true
    );

    return;

}


if (!Number.isInteger(amount)) {

    showPaymentError(
        "Please enter a whole-number amount."
    );

    appPayment.ui.payment.amountInput?.focus();

    payment.processing = false;

    setButtonEnabledPayment(
        appPayment.ui.payment.nextButton,
        true
    );

    return;

}


appPayment.state.donation.paymentAmount =
    amount;


    showPaymentLoading(
        "Processing Payment..."
    );


    console.log(
        "NutriCycle AI — Processing payment:",
        payment.selectedMethod
    );


    window.setTimeout(
        completePayment,
        appPayment.PAYMENT_CONFIG.processingTime
    );

}


/* ============================================================
   COMPLETE PAYMENT
============================================================ */

function completePayment() {

    const payment =
        appPayment.state.payment;


    payment.processing =
        false;


    payment.completed =
        true;


    appPayment.state.donation.status =
        "Payment Completed";


    /*
       IMPORTANT:
       Payment completion is recorded BEFORE
       the success modal appears.
    */

    hidePaymentLoading();


    showPaymentSuccess();


    console.log(
        "NutriCycle AI — Payment Successful"
    );

}


/* ============================================================
   SUCCESS → REWARD
============================================================ */

function continueFromPaymentSuccess() {

    const payment =
        appPayment.state.payment;


    if (
        !payment.completed
    ) {

        hidePaymentSuccess();

        return;

    }


    /*
       Close the success modal first.
    */

    hidePaymentSuccess();


    console.log(
        "NutriCycle AI — Payment → Reward"
    );


    /*
       Part 6/7 will initialize the actual reward
       scratch engine. If it is already available,
       let it prepare the reward immediately.
    */

    showScreenPayment(
        5
    );


    if (
        typeof appPayment.initializeReward ===
        "function"
    ) {

        appPayment.initializeReward();

    }

}


/* ============================================================
   PAYMENT BACK
============================================================ */

function handlePaymentBack() {

    if (
        appPayment.state.payment.processing
    ) {

        return;

    }


    showScreenPayment(
        3
    );

}


/* ============================================================
   OPEN PAYMENT SCREEN
============================================================ */

function openPaymentScreen() {

    /*
       Don't reset a payment that has already been
       successfully completed.
    */

    if (
        !appPayment.state.payment.completed
    ) {

        resetPayment();

    }


    showScreenPayment(
        4
    );


    console.log(
        "NutriCycle AI — Payment Screen Ready"
    );

}


/* ============================================================
   PAYMENT EVENTS
============================================================ */

function bindPaymentEvents() {

    const payment =
        appPayment.ui.payment;


    if (
        appPayment.state.payment.eventsBound
    ) {

        return;

    }


    /* --------------------------------------------------------
       PAYMENT OPTIONS
    -------------------------------------------------------- */

    payment.options.forEach(
        option => {

            option.addEventListener(
                "click",
                () => {

                    selectPaymentMethod(
                        option
                    );

                }
            );

        }
    );


    /* --------------------------------------------------------
       BACK
    -------------------------------------------------------- */

    payment.backButton?.addEventListener(
        "click",
        handlePaymentBack
    );


    /* --------------------------------------------------------
       PROCEED
    -------------------------------------------------------- */

    payment.nextButton?.addEventListener(
        "click",
        processPayment
    );


    /* --------------------------------------------------------
       SUCCESS MODAL
       Continue = Reward
    -------------------------------------------------------- */

    payment.closeSuccessButton?.addEventListener(
        "click",
        continueFromPaymentSuccess
    );


    appPayment.state.payment.eventsBound =
        true;


    console.log(
        "NutriCycle AI — Payment Module Ready"
    );

}

/* ============================================================
   QUICK DONATION AMOUNT BUTTONS
============================================================ */

function bindDonationAmountEvents() {

    const input =
        appPayment.ui.payment.amountInput;


    if (!input) {

        console.error(
            "NutriCycle AI — donationAmount input not found."
        );

        return;

    }


    const buttons =
        Array.from(
            document.querySelectorAll(
                ".quick-amounts button"
            )
        );


    buttons.forEach(

        button => {

            button.addEventListener(

                "click",

                () => {

                    const amount =
                        Number(
                            button.dataset.amount
                        );


                    if (
                        !Number.isFinite(amount)
                    ) {

                        return;

                    }


                    input.value =
                        amount;


                    clearPaymentError();


                    input.dispatchEvent(
                        new Event(
                            "input",
                            {
                                bubbles:
                                    true
                            }
                        )
                    );

                }

            );

        }

    );

}

/* ============================================================
   REGISTER PAYMENT MODULE
============================================================ */

appPayment.initializePaymentScreen =
    openPaymentScreen;

appPayment.resetPayment =
    resetPayment;

appPayment.processPayment =
    processPayment;


/* ============================================================
   INITIALIZE PAYMENT EVENTS
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(

        "DOMContentLoaded",

        () => {

            bindPaymentEvents();

            bindDonationAmountEvents();

        },

        {
            once:
                true
        }

    );

}

else {

    bindPaymentEvents();

    bindDonationAmountEvents();

}
/* ============================================================
   NUTRICYCLE AI
   DONATION MODULE
   PART 6 — ROBUST SCRATCH REWARD ENGINE
============================================================ */

const rewardApp =
    window.NutriCycleAI;

const appReward =
    rewardApp;

const setButtonEnabledReward =
    rewardApp.setButtonEnabled;

const showScreenReward =
    rewardApp.showScreen;

/* ============================================================
   REWARD DOM
============================================================ */

rewardApp.ui.reward = {

    screen:
        document.getElementById("rewardScreen"),

    card:
        document.getElementById("scratchCard"),

    title:
        document.getElementById("rewardTitle"),

    brand:
        document.getElementById("rewardBrand"),

    surface:
        document.getElementById("scratchSurface"),

    canvas:
        document.getElementById("scratchCanvas"),

    nextButton:
        document.getElementById("rewardNextButton")

};


/* ============================================================
   REWARD CONFIG
============================================================ */

rewardApp.REWARD_CONFIG = {

    title:
        "₹100 OFF",

    offer:
        "🎉 ₹100 Donation Coupon 🎉",

    brand:
        "Partner Brand Reward",

    revealAt:
        45,

    brushSize:
        32

};


/* ============================================================
   REWARD STATE
============================================================ */

rewardApp.state.reward = {

    ready:
        false,

    scratching:
        false,

    revealed:
        false,

    percent:
        0,

    ctx:
        null,

    width:
        0,

    height:
        0,

    lastX:
        null,

    lastY:
        null

};


/* ============================================================
   SET REWARD CONTENT
============================================================ */

function setupRewardContent() {

    const reward =
        rewardApp.ui.reward;

    const config =
        rewardApp.REWARD_CONFIG;


    if (reward.title) {

        reward.title.textContent =
            config.title;

    }


    if (reward.brand) {

        reward.brand.textContent =
            config.brand;

    }


    /*
       Ensure the offer actually exists.
    */

    let offer =
        document.getElementById(
            "rewardOffer"
        );


    if (!offer) {

        offer =
            document.createElement(
                "p"
            );

        offer.id =
            "rewardOffer";


        reward.brand?.before(
            offer
        );

    }


    if (offer) {

        offer.textContent =
            config.offer;

        offer.style.margin =
            "8px 0";

        offer.style.fontSize =
            "18px";

        offer.style.fontWeight =
            "700";

        offer.style.color =
            "inherit";

    }

}


/* ============================================================
   PREPARE CANVAS
============================================================ */

function prepareScratchCanvas() {

    const reward =
        rewardApp.ui.reward;

    const card =
        reward.card;

    const canvas =
        reward.canvas;


    if (
        !card ||
        !canvas
    ) {

        console.error(
            "NutriCycle AI — Scratch card elements missing."
        );

        return false;

    }


    const rect =
        card.getBoundingClientRect();


    if (
        rect.width === 0 ||
        rect.height === 0
    ) {

        console.error(
            "NutriCycle AI — Scratch card has zero dimensions."
        );

        return false;

    }


    const dpr =
        Math.max(
            1,
            Math.min(
                window.devicePixelRatio || 1,
                2
            )
        );


    canvas.width =
        Math.round(
            rect.width * dpr
        );


    canvas.height =
        Math.round(
            rect.height * dpr
        );


    canvas.style.width =
        `${rect.width}px`;

    canvas.style.height =
        `${rect.height}px`;


    const ctx =
        canvas.getContext(
            "2d",
            {
                willReadFrequently:
                    true
            }
        );


    if (!ctx) {

        console.error(
            "NutriCycle AI — Cannot create scratch canvas context."
        );

        return false;

    }


    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    rewardApp.state.reward.ctx =
        ctx;

    rewardApp.state.reward.width =
        rect.width;

    rewardApp.state.reward.height =
        rect.height;


    drawScratchCover();


    return true;

}


/* ============================================================
   DRAW GREY SCRATCH COVER
============================================================ */

function drawScratchCover() {

    const state =
        rewardApp.state.reward;

    const ctx =
        state.ctx;


    if (!ctx) {

        return;

    }


    const width =
        state.width;

    const height =
        state.height;


    ctx.globalCompositeOperation =
        "source-over";


    /*
       Metallic grey cover.
    */

    const gradient =
        ctx.createLinearGradient(
            0,
            0,
            width,
            height
        );


    gradient.addColorStop(
        0,
        "#d5d5d5"
    );

    gradient.addColorStop(
        0.45,
        "#9d9d9d"
    );

    gradient.addColorStop(
        0.55,
        "#eeeeee"
    );

    gradient.addColorStop(
        1,
        "#b5b5b5"
    );


    ctx.fillStyle =
        gradient;


    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    /*
       Scratch instruction.
    */

    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "800 26px Inter, Arial, sans-serif";


    ctx.textAlign =
        "center";


    ctx.textBaseline =
        "middle";


    ctx.fillText(
        "SCRATCH HERE",
        width / 2,
        height / 2 - 12
    );


    ctx.font =
        "600 13px Inter, Arial, sans-serif";


    ctx.fillText(
        "Reveal your reward",
        width / 2,
        height / 2 + 24
    );


    ctx.globalCompositeOperation =
        "destination-out";

}


/* ============================================================
   POINTER POSITION
============================================================ */

function getRewardPointerPosition(
    event
) {

    const canvas =
        rewardApp.ui.reward.canvas;


    if (!canvas) {

        return null;

    }


    const rect =
        canvas.getBoundingClientRect();


    return {

        x:
            event.clientX -
            rect.left,

        y:
            event.clientY -
            rect.top

    };

}


/* ============================================================
   SCRATCH CIRCLE
============================================================ */

function eraseScratchCircle(
    x,
    y
) {

    const state =
        rewardApp.state.reward;

    const ctx =
        state.ctx;


    if (!ctx) {

        return;

    }


    ctx.globalCompositeOperation =
        "destination-out";


    ctx.beginPath();


    ctx.arc(
        x,
        y,
        rewardApp.REWARD_CONFIG.brushSize,
        0,
        Math.PI * 2
    );


    ctx.fill();

}


/* ============================================================
   SCRATCH LINE
============================================================ */

function eraseScratchLine(
    x1,
    y1,
    x2,
    y2
) {

    const state =
        rewardApp.state.reward;

    const ctx =
        state.ctx;


    if (!ctx) {

        return;

    }


    ctx.globalCompositeOperation =
        "destination-out";


    ctx.lineWidth =
        rewardApp.REWARD_CONFIG.brushSize * 2;


    ctx.lineCap =
        "round";


    ctx.lineJoin =
        "round";


    ctx.beginPath();


    ctx.moveTo(
        x1,
        y1
    );


    ctx.lineTo(
        x2,
        y2
    );


    ctx.stroke();

}


/* ============================================================
   SCRATCH
============================================================ */

function scratchReward(
    event
) {

    const state =
        rewardApp.state.reward;


    if (
        !state.scratching ||
        state.revealed
    ) {

        return;

    }


    const position =
        getRewardPointerPosition(
            event
        );


    if (!position) {

        return;

    }


    if (
        state.lastX !== null &&
        state.lastY !== null
    ) {

        eraseScratchLine(
            state.lastX,
            state.lastY,
            position.x,
            position.y
        );

    }


    eraseScratchCircle(
        position.x,
        position.y
    );


    state.lastX =
        position.x;

    state.lastY =
        position.y;


    /*
       Check progress periodically instead of
       running image analysis for every pixel move.
    */

    if (
        !state.checkTimer
    ) {

        state.checkTimer =
            setTimeout(
                () => {

                    state.checkTimer =
                        null;

                    checkScratchPercentage();

                },
                80
            );

    }


    event.preventDefault();

}


/* ============================================================
   CHECK TRANSPARENCY
============================================================ */

function checkScratchPercentage() {

    const state =
        rewardApp.state.reward;

    const canvas =
        rewardApp.ui.reward.canvas;


    if (
        !state.ctx ||
        !canvas ||
        state.revealed
    ) {

        return;

    }


    /*
       Read the actual backing canvas.
    */

    state.ctx.setTransform(
        1,
        0,
        0,
        1,
        0,
        0
    );


    let pixels;


    try {

        pixels =
            state.ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

    }
    catch (error) {

        console.error(
            "NutriCycle AI — Scratch pixel check failed:",
            error
        );

        /*
           Restore the scale before returning.
        */

        const dpr =
            canvas.width /
            state.width;


        state.ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );


        return;

    }


    const data =
        pixels.data;


    let transparent =
        0;

    let total =
        0;


    /*
       Sample every 12 pixels.
       This keeps the scratch card responsive.
    */

    const step =
        12;


    for (
        let y = 0;
        y < canvas.height;
        y += step
    ) {

        for (
            let x = 0;
            x < canvas.width;
            x += step
        ) {

            const alphaIndex =
                (
                    (
                        y *
                        canvas.width
                    ) +
                    x
                ) *
                4 +
                3;


            total++;


            if (
                data[
                    alphaIndex
                ] < 80
            ) {

                transparent++;

            }

        }

    }


    state.percent =
        total > 0
            ? (
                transparent /
                total
            ) *
            100
            : 0;


    /*
       Restore drawing transform.
    */

    const dpr =
        canvas.width /
        state.width;


    state.ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    if (
        state.percent >=
        rewardApp.REWARD_CONFIG.revealAt
    ) {

        revealRewardCard();

    }

}


/* ============================================================
   REVEAL
============================================================ */

function revealRewardCard() {

    const state =
        rewardApp.state.reward;

    const reward =
        rewardApp.ui.reward;


    if (
        state.revealed
    ) {

        return;

    }


    state.revealed =
        true;

    state.scratching =
        false;


    rewardApp.state.donation.reward.revealed =
        true;


    /*
       Completely remove interaction from
       the scratch layer.
    */

    if (
        reward.canvas
    ) {

        reward.canvas.style.pointerEvents =
            "none";


        reward.canvas.style.opacity =
            "0";

    }


    if (
        reward.surface
    ) {

        reward.surface.style.opacity =
            "0";

        reward.surface.style.visibility =
            "hidden";

        reward.surface.style.pointerEvents =
            "none";

    }


    if (
        reward.card
    ) {

        reward.card.classList.add(
            "revealed"
        );

    }


    setButtonEnabledReward(
        reward.nextButton,
        true
    );


    console.log(
        "NutriCycle AI — Scratch reward revealed."
    );

}


/* ============================================================
   POINTER DOWN
============================================================ */

function rewardPointerDown(
    event
) {

    const state =
        rewardApp.state.reward;

    const canvas =
        rewardApp.ui.reward.canvas;


    if (
        state.revealed
    ) {

        return;

    }


    state.scratching =
        true;


    state.lastX =
        null;


    state.lastY =
        null;


    /*
       Critical fix:
       capture the pointer so dragging continues even
       if the pointer moves quickly.
    */

    try {

        canvas.setPointerCapture(
            event.pointerId
        );

    }
    catch (_) {

        /* Browser may not support pointer capture. */

    }


    scratchReward(
        event
    );


    event.preventDefault();

}


/* ============================================================
   POINTER UP
============================================================ */

function rewardPointerUp(
    event
) {

    const state =
        rewardApp.state.reward;


    state.scratching =
        false;


    state.lastX =
        null;

    state.lastY =
        null;


    if (
        state.checkTimer
    ) {

        clearTimeout(
            state.checkTimer
        );

        state.checkTimer =
            null;

    }


    checkScratchPercentage();


    event.preventDefault();

}


/* ============================================================
   INITIALIZE SCRATCH EVENTS
============================================================ */

function initializeScratchEvents() {

    const canvas =
        rewardApp.ui.reward.canvas;


    if (
        !canvas
    ) {

        console.error(
            "NutriCycle AI — scratchCanvas does not exist."
        );

        return false;

    }


    /*
       Prevent browser gestures over the card.
    */

    canvas.style.touchAction =
        "none";


    /*
       Pointer events work for:
       mouse
       touch
       stylus
    */

    canvas.addEventListener(
        "pointerdown",
        rewardPointerDown,
        {
            passive:
                false
        }
    );


    canvas.addEventListener(
        "pointermove",
        scratchReward,
        {
            passive:
                false
        }
    );


    canvas.addEventListener(
        "pointerup",
        rewardPointerUp,
        {
            passive:
                false
        }
    );


    canvas.addEventListener(
        "pointercancel",
        rewardPointerUp,
        {
            passive:
                false
        }
    );


    canvas.addEventListener(
        "contextmenu",
        event => {

            event.preventDefault();

        }
    );


    return true;

}


/* ============================================================
   OPEN REWARD
============================================================ */

function openRewardScreen() {

    /*
       Payment must be complete.
    */

    if (
        appReward.state.donation.status !==
        "Payment Completed"
    ) {

        console.warn(
            "NutriCycle AI — Reward cannot open before payment."
        );

        return;

    }


    const reward =
        rewardApp.ui.reward;

    const state =
        rewardApp.state.reward;


    /*
       Reset state.
    */

    state.ready =
        false;

    state.revealed =
        false;

    state.scratching =
        false;

    state.percent =
        0;

    state.lastX =
        null;

    state.lastY =
        null;


    /*
       Populate actual offer.
    */

    setupRewardContent();


    /*
       Make original scratch surface irrelevant.
       The canvas itself is the visible scratch layer.
    */

    if (
        reward.surface
    ) {

        reward.surface.style.display =
            "none";

    }


    if (
        reward.card
    ) {

        reward.card.classList.remove(
            "revealed"
        );

    }


    /*
       Show reward BEFORE measuring canvas.
    */

    showScreenReward(
        5
    );


    requestAnimationFrame(
        () => {

            if (
                prepareScratchCanvas()
            ) {

                if (
                    !state.eventsInitialized
                ) {

                    initializeScratchEvents();

                    state.eventsInitialized =
                        true;

                }


                state.ready =
                    true;


                setButtonEnabledReward(
                    reward.nextButton,
                    false
                );


                console.log(
                    "NutriCycle AI — Scratch card ready."
                );

            }

        }
    );

}


/* ============================================================
   REWARD → ASSIGNMENT
============================================================ */

function continueFromRewardScreen() {

    const state =
        rewardApp.state.reward;


    if (
        !state.revealed
    ) {

        return;

    }


    showScreenReward(
        6
    );


    if (
        typeof rewardApp.initializeAssignment ===
        "function"
    ) {

        rewardApp.initializeAssignment();

    }

}


/* ============================================================
   REGISTER
============================================================ */

rewardApp.initializeReward =
    openRewardScreen;

rewardApp.openReward =
    openRewardScreen;


/* ============================================================
   ONE-TIME REWARD BUTTON BINDING
============================================================ */

if (
    rewardApp.ui.reward.nextButton
) {

    rewardApp.ui.reward.nextButton.addEventListener(
        "click",
        continueFromRewardScreen
    );

}


/* ============================================================
   RESIZE
============================================================ */

window.addEventListener(
    "resize",
    () => {

        if (
            rewardApp.state.currentScreen !==
            5
        ) {

            return;

        }


        if (
            rewardApp.state.reward.revealed
        ) {

            return;

        }


        prepareScratchCanvas();

    }
);
/* ============================================================
   NUTRICYCLE AI
   DONATION MODULE
   PART 7 — LOGISTICS / VEHICLE ASSIGNMENT
============================================================ */


/* ============================================================
   SHARED APPLICATION
============================================================ */

const appAssignment =
    window.NutriCycleAI;

const setButtonEnabledAssignment =
    appAssignment.setButtonEnabled;

const showScreenAssignment =
    appAssignment.showScreen;


/* ============================================================
   LOGISTICS CONFIGURATION
============================================================ */

appAssignment.LOGISTICS_CONFIG = {

    vehicles: {

        Bike: {

            maxKg:
                5,

            reason:
                "Suitable for small donations up to 5 kg."

        },

        Car: {

            maxKg:
                20,

            reason:
                "Suitable for medium donations above 5 kg and up to 20 kg."

        },

        Tempo: {

            maxKg:
                50,

            reason:
                "Suitable for larger donations above 20 kg and up to 50 kg."

        },

        Truck: {

            maxKg:
                Infinity,

            reason:
                "Required for high-volume donations above 50 kg."

        }

    },


    partners: [

        {
            ngo:
                "NutriCare Foundation",

            agent:
                "Rahul Patil",

            phone:
                "+91 90000 00000",

            distanceKm:
                2.4
        },

        {
            ngo:
                "Asha Food Relief",

            agent:
                "Sneha Kulkarni",

            phone:
                "+91 91111 11111",

            distanceKm:
                3.1
        },

        {
            ngo:
                "Seva Kitchen Network",

            agent:
                "Amit Deshmukh",

            phone:
                "+91 92222 22222",

            distanceKm:
                4.2
        }

    ]

};


/* ============================================================
   ASSIGNMENT DOM
============================================================ */

appAssignment.ui.assignment = {

    screen:
        document.getElementById(
            "assignmentScreen"
        ),

    status:
        document.getElementById(
            "assignmentStatus"
        ),

    ngo:
        document.getElementById(
            "assignedNGO"
        ),

    agent:
        document.getElementById(
            "assignedAgent"
        ),

    quantity:
        document.getElementById(
            "assignmentQuantity"
        ),

    vehicle:
        document.getElementById(
            "assignedVehicle"
        ),

    vehicleReason:
        document.getElementById(
            "vehicleReason"
        ),

    vehicleRule:
        document.getElementById(
            "vehicleRule"
        ),

    eta:
        document.getElementById(
            "pickupETA"
        ),

    nextButton:
        document.getElementById(
            "assignmentNextButton"
        )

};


/* ============================================================
   ASSIGNMENT STATE
============================================================ */

appAssignment.state.assignment = {

    ready:
        false,

    processing:
        false,

    vehicle:
        "",

    quantityKg:
        null,

    vehicleReason:
        "",

    ngo:
        "",

    agent:
        "",

    phone:
        "",

    etaMinutes:
        null

};


/* ============================================================
   FORMAT KG
============================================================ */

function formatKg(
    value
) {

    const numeric =
        Number(
            value
        );


    if (
        !Number.isFinite(
            numeric
        )
    ) {

        return "--";

    }


    if (
        Number.isInteger(
            numeric
        )
    ) {

        return `${numeric} kg`;

    }


    return `${numeric
        .toFixed(2)
        .replace(
            /\.?0+$/,
            ""
        )} kg`;

}


/* ============================================================
   DETERMINE VEHICLE
============================================================ */

function determineVehicle(
    quantityKg
) {

    const kg =
        Number(
            quantityKg
        );


    if (
        !Number.isFinite(kg) ||
        kg <= 0
    ) {

        return null;

    }


    if (
        kg <= 5
    ) {

        return "Bike";

    }


    if (
        kg <= 20
    ) {

        return "Car";

    }


    if (
        kg <= 50
    ) {

        return "Tempo";

    }


    return "Truck";

}


/* ============================================================
   GET VEHICLE DETAILS
============================================================ */

function getVehicleDetails(
    vehicle
) {

    const config =
        appAssignment.LOGISTICS_CONFIG
            .vehicles[vehicle];


    if (
        !config
    ) {

        return {

            maxKg:
                null,

            reason:
                "Vehicle rule unavailable."

        };

    }


    return config;

}


/* ============================================================
   CALCULATE ETA
============================================================ */

function calculatePickupETA(
    distanceKm,
    vehicle
) {

    const distance =
        Number(
            distanceKm
        );


    if (
        !Number.isFinite(distance)
    ) {

        return 15;

    }


    /*
       Prototype average travel assumptions.
       This is not real-time traffic data.
    */

    const speedByVehicle = {

        Bike:
            18,

        Car:
            25,

        Tempo:
            22,

        Truck:
            20

    };


    const speed =
        speedByVehicle[
            vehicle
        ] || 22;


    const travelMinutes =
        (
            distance /
            speed
        ) *
        60;


    /*
       Add fixed handling/dispatch time.
    */

    return Math.max(
        8,
        Math.ceil(
            travelMinutes +
            8
        )
    );

}


/* ============================================================
   SELECT PARTNER
============================================================ */

function selectDeliveryPartner() {

    const partners =
        appAssignment.LOGISTICS_CONFIG
            .partners;


    if (
        !partners.length
    ) {

        return null;

    }


    /*
       Prototype:
       choose the nearest available partner.
    */

    return partners.reduce(
        (
            nearest,
            current
        ) => {

            if (
                !nearest
            ) {

                return current;

            }


            return current.distanceKm <
                nearest.distanceKm
                ? current
                : nearest;

        },
        null
    );

}


/* ============================================================
   UPDATE ASSIGNMENT UI
============================================================ */

function updateAssignmentUI() {

    const ui =
        appAssignment.ui.assignment;

    const state =
        appAssignment.state.assignment;


    if (
        ui.quantity
    ) {

        ui.quantity.textContent =
            formatKg(
                state.quantityKg
            );

    }


    if (
        ui.vehicle
    ) {

        ui.vehicle.textContent =
            state.vehicle || "—";

    }


    if (
        ui.vehicleReason
    ) {

        ui.vehicleReason.textContent =
            state.vehicleReason || "—";

    }


    if (
        ui.vehicleRule
    ) {

        const details =
            getVehicleDetails(
                state.vehicle
            );


        if (
            state.vehicle &&
            Number.isFinite(
                details.maxKg
            )
        ) {

            ui.vehicleRule.textContent =
                `Capacity rule: up to ${details.maxKg} kg`;

        }

        else if (
            state.vehicle === "Truck"
        ) {

            ui.vehicleRule.textContent =
                "Capacity rule: above 50 kg";

        }

        else {

            ui.vehicleRule.textContent =
                "Based on donation quantity";

        }

    }


    if (
        ui.ngo
    ) {

        ui.ngo.textContent =
            state.ngo || "—";

    }


    if (
        ui.agent
    ) {

        ui.agent.textContent =
            state.agent || "—";

    }


    if (
        ui.eta
    ) {

        ui.eta.textContent =
            state.etaMinutes
                ? `${state.etaMinutes} mins`
                : "—";

    }

}


/* ============================================================
   SET ASSIGNMENT STATUS
============================================================ */

function setAssignmentStatus(
    message,
    loading = false
) {

    const element =
        appAssignment.ui.assignment.status;


    if (
        !element
    ) {

        return;

    }


    if (
        loading
    ) {

        element.innerHTML = `

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            <span>
                ${message}
            </span>

        `;

    }

    else {

        element.innerHTML = `

            <i
                class="fa-solid fa-circle-check"
            ></i>

            <span>
                ${message}
            </span>

        `;

    }

}


/* ============================================================
   RUN ASSIGNMENT
============================================================ */

async function runAssignment() {

    const state =
        appAssignment.state.assignment;

    const donation =
        appAssignment.state.donation;


    if (
        state.processing
    ) {

        return;

    }


    state.ready =
        false;

    state.processing =
        true;


    setButtonEnabledAssignment(
        appAssignment.ui.assignment.nextButton,
        false
    );


    /*
       Donation quantity has already been normalized
       by Part 3.
    */

    const quantityKg =
        Number(
            donation.quantityKg
        );


    if (
        !Number.isFinite(quantityKg) ||
        quantityKg <= 0
    ) {

        state.processing =
            false;


        setAssignmentStatus(
            "Invalid donation quantity.",
            false
        );


        console.error(
            "NutriCycle AI — Assignment blocked: invalid quantityKg.",
            donation.quantityKg
        );


        return;

    }


    state.quantityKg =
        quantityKg;


    /* --------------------------------------------------------
       STAGE 1 — VEHICLE
    -------------------------------------------------------- */

    setAssignmentStatus(
        "Selecting the correct vehicle from donation quantity...",
        true
    );


    await delay(
        600
    );


    const vehicle =
        determineVehicle(
            quantityKg
        );


    if (
        !vehicle
    ) {

        state.processing =
            false;

        return;

    }


    const vehicleDetails =
        getVehicleDetails(
            vehicle
        );


    state.vehicle =
        vehicle;

    state.vehicleReason =
        vehicleDetails.reason;


    donation.assignment.vehicle =
        vehicle;

    donation.assignment.capacityKg =
        Number.isFinite(
            vehicleDetails.maxKg
        )
            ? vehicleDetails.maxKg
            : null;

    donation.assignment.reason =
        vehicleDetails.reason;


    updateAssignmentUI();


    console.log(
        "NutriCycle AI — Vehicle Assignment:",
        {
            quantityKg,
            vehicle,
            capacityKg:
                donation.assignment.capacityKg,

            reason:
                vehicleDetails.reason

        }
    );


    /* --------------------------------------------------------
       STAGE 2 — NGO / AGENT
    -------------------------------------------------------- */

    setAssignmentStatus(
        "Finding the nearest available NGO and delivery partner...",
        true
    );


    await delay(
        700
    );


    const partner =
        selectDeliveryPartner();


    if (
        !partner
    ) {

        state.processing =
            false;


        setAssignmentStatus(
            "No delivery partner is currently available.",
            false
        );


        return;

    }


    const etaMinutes =
        calculatePickupETA(
            partner.distanceKm,
            vehicle
        );


    state.ngo =
        partner.ngo;

    state.agent =
        partner.agent;

    state.phone =
        partner.phone;

    state.etaMinutes =
        etaMinutes;


    donation.assignment.ngo =
        partner.ngo;

    donation.assignment.agent =
        partner.agent;

    donation.assignment.agentPhone =
        partner.phone;

    donation.assignment.distanceKm =
        partner.distanceKm;

    donation.assignment.etaMinutes =
        etaMinutes;


    donation.tracking.driverName =
        partner.agent;

    donation.tracking.driverPhone =
        partner.phone;

    donation.tracking.vehicle =
        vehicle;

    donation.tracking.eta =
        `${etaMinutes} mins`;

    donation.tracking.ngo =
        partner.ngo;


    updateAssignmentUI();


    /* --------------------------------------------------------
       FINALIZE
    -------------------------------------------------------- */

    state.processing =
        false;

    state.ready =
        true;


    donation.status =
        "Delivery Assigned";


    setAssignmentStatus(
        "Delivery network assigned successfully.",
        false
    );


    setButtonEnabledAssignment(
        appAssignment.ui.assignment.nextButton,
        true
    );


    console.log(
        "NutriCycle AI — Assignment Complete:",
        {
            quantityKg,
            vehicle,
            ngo:
                partner.ngo,

            agent:
                partner.agent,

            etaMinutes

        }
    );

}


/* ============================================================
   DELAY HELPER
============================================================ */

function delay(
    milliseconds
) {

    return new Promise(
        resolve => {

            window.setTimeout(
                resolve,
                milliseconds
            );

        }
    );

}


/* ============================================================
   OPEN ASSIGNMENT
============================================================ */

function openAssignment() {

    /*
       Reward must already be revealed.
    */

    if (
        !appAssignment.state.donation.reward.revealed
    ) {

        console.warn(
            "NutriCycle AI — Assignment blocked: reward not revealed."
        );

        return;

    }


    showScreenAssignment(
        6
    );


    runAssignment();

}


/* ============================================================
   ASSIGNMENT → TRACKING
============================================================ */

function continueFromAssignment() {

    if (
        !appAssignment.state.assignment.ready
    ) {

        console.warn(
            "NutriCycle AI — Tracking blocked: assignment incomplete."
        );

        return;

    }


    showScreenAssignment(
        7
    );


    console.log(
        "NutriCycle AI — Assignment → Tracking"
    );


    if (
        typeof appAssignment.initializeTracking ===
        "function"
    ) {

        appAssignment.initializeTracking();

    }

}


/* ============================================================
   ASSIGNMENT EVENTS
============================================================ */

if (
    appAssignment.ui.assignment.nextButton
) {

    appAssignment.ui.assignment.nextButton.addEventListener(
        "click",
        continueFromAssignment
    );

}


/* ============================================================
   REGISTER MODULE
============================================================ */

appAssignment.initializeAssignment =
    openAssignment;

appAssignment.determineVehicle =
    determineVehicle;

appAssignment.getVehicleDetails =
    getVehicleDetails;
   
/* ============================================================
   NUTRICYCLE AI
   DONATION MODULE
   COMPLETE MAPPING ENGINE — A → Z
   ------------------------------------------------------------
   This module owns ONLY:
   • Live tracking map
   • Live donor GPS
   • NGO destination
   • OSRM road routing
   • Vehicle emoji
   • Vehicle route simulation
   • Distance
   • ETA
   • Tracking timeline
   • Tracking cleanup
============================================================ */


/* ============================================================
   A — APPLICATION
============================================================ */

const appMap =
    window.NutriCycleAI;


/* ============================================================
   B — CONFIGURATION
============================================================ */

appMap.MAP_CONFIG = {

    /*
       OSRM is used directly.

       No Leaflet Routing Machine.
       No straight-line route.
       No fake route fallback.
    */

    osrmBase:
        "https://router.project-osrm.org/route/v1/driving/",


    /*
       Default NGO location is used only when the
       assignment does not yet contain coordinates.

       The donor location NEVER has a fake fallback.
    */

    defaultNGO:
        [
            18.6352,
            73.8066
        ],


    /*
       OSM tile server.
    */

    tileURL:
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",


    /*
       Vehicle emoji is determined exclusively by
       the Part 7 vehicle assignment.
    */

    vehicleEmoji: {

        Bike:
            "🏍️",

        Car:
            "🚗",

        Tempo:
            "🚚",

        Truck:
            "🚛"

    },


    /*
       Vehicle speed is used only for prototype ETA.
    */

    vehicleSpeedKmph: {

        Bike:
            18,

        Car:
            25,

        Tempo:
            22,

        Truck:
            20

    },


    /*
       Vehicle animation interval.
    */

    movementInterval:
        900,


    /*
       Keep route detail while preventing
       extremely large route arrays.
    */

    maximumRoutePoints:
        300

};


/* ============================================================
   C — TRACKING DOM
============================================================ */

appMap.ui.tracking = {

    map:
        document.getElementById(
            "trackingMap"
        ),

    driverName:
        document.getElementById(
            "driverName"
        ),

    driverPhone:
        document.getElementById(
            "driverPhone"
        ),

    vehicle:
        document.getElementById(
            "trackingVehicle"
        ),

    vehicleNumber:
        document.getElementById(
            "vehicleNumber"
        ),

    ngo:
        document.getElementById(
            "trackingNGO"
        ),

    status:
        document.getElementById(
            "trackingStatus"
        ),

    eta:
        document.getElementById(
            "trackingETA"
        ),

    distance:
        document.getElementById(
            "trackingDistance"
        ),

    statusMessage:
        document.getElementById(
            "trackingStatusMessage"
        ),

    dashboardButton:
        document.getElementById(
            "dashboardButton"
        ),

    timeline:
        Array.from(
            document.querySelectorAll(
                "#trackingScreen .timeline-item"
            )
        )

};


/* ============================================================
   D — STATE
============================================================ */

appMap.state.tracking = {

    initialized:
        false,

    mapReady:
        false,

    routeReady:
        false,

    movementRunning:
        false,

    movementCompleted:
        false,

    map:
        null,

    donorMarker:
        null,

    ngoMarker:
        null,

    vehicleMarker:
        null,

    routeLine:
        null,

    donorLocation:
        null,

    liveLocation:
        null,

    locationAccuracyMeters:
        null,

    ngoLocation:
        null,

    routePoints:
        [],

    routeDistanceKm:
        0,

    remainingDistanceKm:
        0,

    currentLocation:
        null,

    routeIndex:
        0,

    movementTimer:
        null,

    locationWatchId:
        null,

    driver:
        "",

    phone:
        "",

    vehicle:
        "",

    vehicleNumber:
        "",

    ngo:
        ""

};


/* ============================================================
   E — LEAFLET VALIDATION
============================================================ */

function mapLeafletReady() {

    return (

        typeof window.L !==
        "undefined"

        &&

        typeof window.L.map ===
        "function"

        &&

        typeof window.L.tileLayer ===
        "function"

    );

}


/* ============================================================
   F — LOCATION
============================================================ */

function mapGetExactLiveLocation() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                !navigator.geolocation
            ) {

                reject(
                    new Error(
                        "This browser does not support live location."
                    )
                );

                return;

            }


            navigator.geolocation.getCurrentPosition(

                position => {

                    const lat =
                        Number(
                            position.coords.latitude
                        );

                    const lng =
                        Number(
                            position.coords.longitude
                        );

                    const accuracy =
                        Number(
                            position.coords.accuracy
                        );


                    if (
                        !Number.isFinite(lat)
                        ||
                        !Number.isFinite(lng)
                    ) {

                        reject(
                            new Error(
                                "Invalid GPS coordinates were received."
                            )
                        );

                        return;

                    }


                    console.log(
                        "NutriCycle AI — MAP GPS:",
                        {

                            latitude:
                                lat,

                            longitude:
                                lng,

                            accuracyMeters:
                                accuracy

                        }
                    );


                    resolve({

                        coordinates:
                            [
                                lat,
                                lng
                            ],

                        accuracyMeters:
                            Number.isFinite(
                                accuracy
                            )
                                ? accuracy
                                : null

                    });

                },

                error => {

                    let message =
                        "Unable to detect your live location.";


                    if (
                        error.code ===
                        1
                    ) {

                        message =
                            "Location permission was denied.";

                    }

                    else if (
                        error.code ===
                        2
                    ) {

                        message =
                            "Your device location is unavailable.";

                    }

                    else if (
                        error.code ===
                        3
                    ) {

                        message =
                            "GPS detection timed out.";

                    }


                    reject(
                        new Error(
                            message
                        )
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
    );

}


/* ============================================================
   G — LIVE LOCATION WATCH
============================================================ */

function mapStartLocationWatch() {

    const state =
        appMap.state.tracking;


    if (
        state.locationWatchId !==
        null
    ) {

        return;

    }


    if (
        !navigator.geolocation
    ) {

        return;

    }


    state.locationWatchId =
        navigator.geolocation.watchPosition(

            position => {

                const lat =
                    Number(
                        position.coords.latitude
                    );

                const lng =
                    Number(
                        position.coords.longitude
                    );


                if (
                    !Number.isFinite(lat)
                    ||
                    !Number.isFinite(lng)
                ) {

                    return;

                }


                state.liveLocation =
                    [
                        lat,
                        lng
                    ];


                state.locationAccuracyMeters =
                    Number.isFinite(
                        position.coords.accuracy
                    )
                        ? Number(
                            position.coords.accuracy
                        )
                        : null;


                /*
                   Move the donor marker to the
                   latest real device location.
                */

                if (
                    state.donorMarker
                ) {

                    state.donorMarker.setLatLng(
                        state.liveLocation
                    );

                }


                mapUpdateGPSAccuracy();


            },

            error => {

                console.warn(
                    "NutriCycle AI — MAP GPS update:",
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


/* ============================================================
   H — STOP GPS WATCH
============================================================ */

function mapStopLocationWatch() {

    const state =
        appMap.state.tracking;


    if (
        state.locationWatchId ===
        null
    ) {

        return;

    }


    try {

        navigator.geolocation.clearWatch(
            state.locationWatchId
        );

    }
    catch (
        error
    ) {

        console.warn(
            "NutriCycle AI — GPS cleanup:",
            error
        );

    }


    state.locationWatchId =
        null;

}


/* ============================================================
   I — VEHICLE SELECTION
============================================================ */

function mapGetAssignedVehicle() {

    const donation =
        appMap.state.donation;


    return (

        donation
            ?.assignment
            ?.vehicle

        ||

        "Car"

    );

}


/* ============================================================
   J — VEHICLE EMOJI
============================================================ */

function mapGetVehicleEmoji(
    vehicle
) {

    return (

        appMap
            .MAP_CONFIG
            .vehicleEmoji[
                vehicle
            ]

        ||

        "🚗"

    );

}


function mapCreateVehicleIcon(
    vehicle
) {

    const emoji =
        mapGetVehicleEmoji(
            vehicle
        );


    return L.divIcon({

        className:
            "nutricycle-map-vehicle-icon",

        html:
            `
            <div
                class="nutricycle-map-vehicle-wrapper"
                style="
                    width:74px;
                    height:94px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    transform-origin:center center;
                    pointer-events:none;
                "
            >

                <svg
                    class="nutricycle-map-vehicle-svg"
                    viewBox="0 0 70 100"
                    width="68"
                    height="90"
                    aria-hidden="true"
                    style="
                        display:block;
                        overflow:visible;
                        transform-origin:50% 50%;
                    "
                >

                    <!-- Shadow -->
                    <ellipse
                        cx="35"
                        cy="51"
                        rx="24"
                        ry="43"
                        fill="rgba(0,0,0,.22)"
                    />

                    <!-- Main vehicle body -->
                    <rect
                        x="12"
                        y="4"
                        width="46"
                        height="92"
                        rx="17"
                        fill="#159447"
                        stroke="#ffffff"
                        stroke-width="4"
                    />

                    <!-- Roof -->
                    <rect
                        x="18"
                        y="18"
                        width="34"
                        height="39"
                        rx="9"
                        fill="#18251e"
                    />

                    <!-- Front windshield -->
                    <path
                        d="
                            M20 22
                            Q35 13 50 22
                            L49 37
                            Q35 31 21 37
                            Z
                        "
                        fill="#b9d5dc"
                        opacity=".95"
                    />

                    <!-- Rear windshield -->
                    <path
                        d="
                            M21 47
                            Q35 52 49 47
                            L49 53
                            Q35 59 21 53
                            Z
                        "
                        fill="#7b9fa8"
                        opacity=".9"
                    />

                    <!-- Center cabin -->
                    <rect
                        x="28"
                        y="39"
                        width="14"
                        height="12"
                        rx="4"
                        fill="#23372c"
                    />

                    <!-- Headlights -->
                    <rect
                        x="18"
                        y="7"
                        width="10"
                        height="5"
                        rx="2"
                        fill="#f8faf8"
                    />

                    <rect
                        x="42"
                        y="7"
                        width="10"
                        height="5"
                        rx="2"
                        fill="#f8faf8"
                    />

                    <!-- Rear lights -->
                    <rect
                        x="18"
                        y="88"
                        width="10"
                        height="5"
                        rx="2"
                        fill="#e05252"
                    />

                    <rect
                        x="42"
                        y="88"
                        width="10"
                        height="5"
                        rx="2"
                        fill="#e05252"
                    />

                    <!-- Wheels -->
                    <rect
                        x="7"
                        y="25"
                        width="7"
                        height="18"
                        rx="3"
                        fill="#1d2420"
                    />

                    <rect
                        x="56"
                        y="25"
                        width="7"
                        height="18"
                        rx="3"
                        fill="#1d2420"
                    />

                    <rect
                        x="7"
                        y="62"
                        width="7"
                        height="18"
                        rx="3"
                        fill="#1d2420"
                    />

                    <rect
                        x="56"
                        y="62"
                        width="7"
                        height="18"
                        rx="3"
                        fill="#1d2420"
                    />

                </svg>

            </div>
            `,

        iconSize:
            [
                74,
                94
            ],

        iconAnchor:
            [
                37,
                47
            ],

        popupAnchor:
            [
                0,
                -40
            ]

    });

}
function mapOrientVehicleMarker(
    state,
    index
) {

    if (
        !state ||
        !state.vehicleMarker ||
        !Array.isArray(state.routePoints)
    ) {

        return;

    }


    const current =
        state.routePoints[index];


    const next =
        state.routePoints[
            Math.min(
                index + 1,
                state.routePoints.length - 1
            )
        ];


    if (
        !current ||
        !next
    ) {

        return;

    }


    const lat1 =
        current[0] *
        Math.PI /
        180;


    const lat2 =
        next[0] *
        Math.PI /
        180;


    const dLng =
        (
            next[1] -
            current[1]
        ) *
        Math.PI /
        180;


    const y =
        Math.sin(dLng) *
        Math.cos(lat2);


    const x =
        Math.cos(lat1) *
        Math.sin(lat2) -

        Math.sin(lat1) *
        Math.cos(lat2) *
        Math.cos(dLng);


    const bearing =
        Math.atan2(
            y,
            x
        ) *
        180 /
        Math.PI;


    const normalizedBearing =
        (
            bearing + 360
        ) % 360;


    const svg =
        state.vehicleMarker
            .getElement()
            ?.querySelector(
                ".nutricycle-map-vehicle-svg"
            );


    if (!svg) {

        return;

    }


    svg.style.transform =
        `rotate(${normalizedBearing}deg)`;

}


/* ============================================================
   L — DONOR ICON
============================================================ */

function mapCreateDonorIcon() {

    return L.divIcon({

        className:
            "nutricycle-map-donor-icon",

        html:
            `
            <div class="nutricycle-map-donor-bubble">
                <i class="fa-solid fa-location-dot"></i>
            </div>
            `,

        iconSize:
            [
                40,
                40
            ],

        iconAnchor:
            [
                20,
                20
            ]

    });

}


/* ============================================================
   M — NGO ICON
============================================================ */

function mapCreateNGOIcon() {

    return L.divIcon({

        className:
            "nutricycle-map-ngo-icon",

        html:
            `
            <div class="nutricycle-map-ngo-bubble">
                <i class="fa-solid fa-building"></i>
            </div>
            `,

        iconSize:
            [
                40,
                40
            ],

        iconAnchor:
            [
                20,
                20
            ]

    });

}


/* ============================================================
   N — NGO LOCATION
============================================================ */

function mapGetNGOLocation() {

    const assignment =
        appMap
            .state
            .donation
            ?.assignment;


    /*
       Future Firebase/NGO data can provide
       exact coordinates here.
    */

    const lat =
        Number(
            assignment?.ngoLatitude
        );

    const lng =
        Number(
            assignment?.ngoLongitude
        );


    if (
        Number.isFinite(lat)
        &&
        Number.isFinite(lng)
    ) {

        return [
            lat,
            lng
        ];

    }


    /*
       Prototype destination.
       This is a destination, NOT a fallback
       for the user's location.
    */

    return [
        ...appMap
            .MAP_CONFIG
            .defaultNGO
    ];

}


/* ============================================================
   O — HAVERSINE DISTANCE
============================================================ */

function mapDistanceKm(
    pointA,
    pointB
) {

    if (
        !Array.isArray(pointA)
        ||
        !Array.isArray(pointB)
    ) {

        return 0;

    }


    const R =
        6371;


    const lat1 =
        pointA[0] *
        Math.PI /
        180;


    const lat2 =
        pointB[0] *
        Math.PI /
        180;


    const dLat =
        (
            pointB[0] -
            pointA[0]
        )
        *
        Math.PI /
        180;


    const dLng =
        (
            pointB[1] -
            pointA[1]
        )
        *
        Math.PI /
        180;


    const a =
        Math.sin(
            dLat / 2
        ) ** 2

        +

        Math.cos(lat1)
        *
        Math.cos(lat2)
        *
        Math.sin(
            dLng / 2
        ) ** 2;


    return (

        2 *
        R *
        Math.atan2(

            Math.sqrt(a),

            Math.sqrt(
                1 - a
            )

        )

    );

}


/* ============================================================
   P — FORMAT DISTANCE
============================================================ */

function mapFormatDistance(
    km
) {

    const value =
        Number(
            km
        );


    if (
        !Number.isFinite(value)
    ) {

        return "--";

    }


    if (
        value < 1
    ) {

        return `${Math.round(
            value * 1000
        )} m`;

    }


    return `${value.toFixed(
        1
    )} km`;

}


/* ============================================================
   Q — GET OSRM ROAD ROUTE
============================================================ */

async function mapGetRoadRoute(
    start,
    end
) {

    const base =
        appMap
            .MAP_CONFIG
            .osrmBase;


    /*
       OSRM requires:
       longitude,latitude
    */

    const url =
        base

        +

        `${start[1]},${start[0]};`

        +

        `${end[1]},${end[0]}`

        +

        "?overview=full&geometries=geojson";


    const response =
        await fetch(
            url
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `Road routing service returned HTTP ${response.status}.`
        );

    }


    const data =
        await response.json();


    const route =
        data
            ?.routes
            ?.[0];


    if (
        !route
    ) {

        throw new Error(
            "No route was returned by OSRM."
        );

    }


    const rawCoordinates =
        route
            ?.geometry
            ?.coordinates;


    if (
        !Array.isArray(
            rawCoordinates
        )
        ||
        rawCoordinates.length < 2
    ) {

        throw new Error(
            "OSRM returned no usable road geometry."
        );

    }


    /*
       Convert:
       [longitude, latitude]

       to:
       [latitude, longitude]
    */

    const points =
        rawCoordinates.map(
            coordinate => [

                Number(
                    coordinate[1]
                ),

                Number(
                    coordinate[0]
                )

            ]
        );


    return {

        points,

        distanceKm:
            Number(
                route.distance
            ) / 1000,

        durationMinutes:
            Number(
                route.duration
            ) / 60

    };

}


/* ============================================================
   R — ROUTE VALIDATION
============================================================ */

function mapValidateRoadRoute(
    start,
    end,
    routePoints
) {

    if (
        !Array.isArray(
            routePoints
        )
        ||
        routePoints.length < 2
    ) {

        throw new Error(
            "Road route contains insufficient points."
        );

    }


    const first =
        routePoints[0];


    const last =
        routePoints[
            routePoints.length - 1
        ];


    /*
       The route must begin close to the donor
       and terminate close to the NGO.
    */

    const startError =
        mapDistanceKm(
            start,
            first
        );


    const endError =
        mapDistanceKm(
            end,
            last
        );


    if (
        startError > 0.5
        ||
        endError > 0.5
    ) {

        throw new Error(
            "Returned road route does not match the requested endpoints."
        );

    }


    /*
       Calculate route length from its actual
       geometry.
    */

    let geometryDistance =
        0;


    for (
        let i = 1;
        i < routePoints.length;
        i++
    ) {

        geometryDistance +=
            mapDistanceKm(
                routePoints[i - 1],
                routePoints[i]
            );

    }


    /*
       A road route must not collapse into a
       trivial two-point straight line.
    */

    if (
        routePoints.length <
        3
    ) {

        throw new Error(
            "Road router returned insufficient road geometry."
        );

    }


    if (
        !Number.isFinite(
            geometryDistance
        )
        ||
        geometryDistance <= 0
    ) {

        throw new Error(
            "Road route distance is invalid."
        );

    }


    return geometryDistance;

}


/* ============================================================
   S — ROUTE SIMPLIFICATION
============================================================ */

function mapSimplifyRoute(
    points
) {

    const max =
        appMap
            .MAP_CONFIG
            .maximumRoutePoints;


    if (
        points.length <= max
    ) {

        return points;

    }


    const output =
        [];


    const step =
        (
            points.length - 1
        )
        /
        (
            max - 1
        );


    for (
        let i = 0;
        i < max;
        i++
    ) {

        output.push(
            points[
                Math.round(
                    i * step
                )
            ]
        );

    }


    return output;

}


/* ============================================================
   T — MAP CREATION
============================================================ */

function mapCreateMap() {

    const state =
        appMap.state.tracking;

    const ui =
        appMap.ui.tracking;


    if (
        !ui.map
    ) {

        throw new Error(
            "trackingMap element was not found."
        );

    }


    if (
        !mapLeafletReady()
    ) {

        throw new Error(
            "Leaflet JavaScript is not available."
        );

    }


    /*
       Destroy an old map instance.
    */

    if (
        state.map
    ) {

        try {

            state.map.remove();

        }
        catch (
            error
        ) {

            console.warn(
                "NutriCycle AI — Old map cleanup:",
                error
            );

        }

    }


    state.map =
        null;


    ui.map.innerHTML =
        "";


    /*
       Create fresh Leaflet instance.
    */

    state.map =
        L.map(
            ui.map,
            {

                center:
                    state.liveLocation,

                zoom:
                    14,

                zoomControl:
                    true,

                attributionControl:
                    true,

                scrollWheelZoom:
                    true,

                dragging:
                    true,

                touchZoom:
                    true,

                doubleClickZoom:
                    true

            }
        );


    /*
       Add OpenStreetMap tiles.
    */

    const tileLayer =
        L.tileLayer(

            appMap
                .MAP_CONFIG
                .tileURL,

            {

                maxZoom:
                    19,

                minZoom:
                    3,

                tileSize:
                    256,

                zoomOffset:
                    0,

                attribution:
                    "&copy; OpenStreetMap contributors"

            }

        );


    tileLayer.on(
        "tileload",
        () => {

            state.map?.invalidateSize(
                true
            );

        }
    );


    tileLayer.on(
        "tileerror",
        error => {

            console.warn(
                "NutriCycle AI — OSM tile error:",
                error
            );

        }
    );


    tileLayer.addTo(
        state.map
    );


    /*
       Force Leaflet to calculate the visible
       dimensions multiple times because the
       Tracking screen becomes visible dynamically.
    */

    const resize =
        () => {

            state.map?.invalidateSize(
                true
            );

        };


    requestAnimationFrame(
        resize
    );


    setTimeout(
        resize,
        150
    );


    setTimeout(
        resize,
        500
    );


    setTimeout(
        resize,
        1000
    );


    return state.map;

}


/* ============================================================
   U — MARKERS
============================================================ */

function mapCreateMarkers() {

    const state =
        appMap.state.tracking;

    const donation =
        appMap.state.donation;


    /*
       Donor marker.
    */

    state.donorMarker =
        L.marker(
            state.liveLocation,
            {

                icon:
                    mapCreateDonorIcon()

            }
        )
        .addTo(
            state.map
        )
        .bindPopup(
            `
            <strong>Your Live Location</strong><br>
            GPS accuracy:
            ${
                Number.isFinite(
                    state.locationAccuracyMeters
                )
                    ? `${Math.round(
                        state.locationAccuracyMeters
                    )} m`
                    : "Unavailable"
            }
            `
        );


    /*
       NGO marker.
    */

    state.ngoMarker =
        L.marker(
            state.ngoLocation,
            {

                icon:
                    mapCreateNGOIcon()

            }
        )
        .addTo(
            state.map
        )
        .bindPopup(
            `
            <strong>Assigned NGO</strong><br>
            ${
                donation
                    ?.assignment
                    ?.ngo
                ||
                "Assigned NGO"
            }
            `
        );


    /*
       Vehicle type comes directly from Part 7.
    */

    state.vehicle =
        mapGetAssignedVehicle();


    state.vehicleMarker =
        L.marker(
            state.routePoints[0],
            {

                icon:
                    mapCreateVehicleIcon(
                        state.vehicle
                    ),

                zIndexOffset:
                    1000

            }
        )
        .addTo(
            state.map
        )
        .bindPopup(
            `
            <strong>
                ${
                    mapGetVehicleEmoji(
                        state.vehicle
                    )
                }
                ${state.vehicle}
            </strong><br>
            ${
                donation
                    ?.assignment
                    ?.agent
                ||
                "Delivery Partner"
            }
            `
        );

}


/* ============================================================
   V — DRAW ROUTE
============================================================ */

function mapDrawRoute() {

    const state =
        appMap.state.tracking;


    if (
        state.routeLine
    ) {

        state.routeLine.remove();

    }


    state.routeLine =
        L.polyline(

            state.routePoints,

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
                    "round",

                smoothFactor:
                    0.7

            }

        )
        .addTo(
            state.map
        );


    /*
       Put the whole road route in view.
    */

    state.map.fitBounds(

        state.routeLine.getBounds(),

        {

            padding:
                [
                    50,
                    50
                ],

            maxZoom:
                16

        }

    );


    /*
       Ensure Leaflet calculates correct dimensions.
    */

    setTimeout(
        () => {

            state.map?.invalidateSize(
                true
            );

        },
        200
    );

}


/* ============================================================
   W — DISTANCE + ETA
============================================================ */

function mapRemainingDistance(
    index
) {

    const state =
        appMap.state.tracking;


    if (
        index >=
        state.routePoints.length - 1
    ) {

        return 0;

    }


    let distance =
        0;


    for (
        let i = index;
        i < state.routePoints.length - 1;
        i++
    ) {

        distance +=
            mapDistanceKm(

                state.routePoints[i],

                state.routePoints[i + 1]

            );

    }


    return distance;

}


/* ============================================================
   X — ETA
============================================================ */

function mapCalculateETA(
    distanceKm
) {

    const state =
        appMap.state.tracking;


    const speed =
        Number(
            appMap
                .MAP_CONFIG
                .vehicleSpeedKmph[
                    state.vehicle
                ]
        )
        ||
        22;


    if (
        !Number.isFinite(
            distanceKm
        )
        ||
        distanceKm <= 0
    ) {

        return 0;

    }


    return Math.max(

        1,

        Math.ceil(

            (
                distanceKm /
                speed
            )
            *
            60

        )

    );

}


/* ============================================================
   Y — UPDATE UI
============================================================ */

function mapUpdateUI() {

    const state =
        appMap.state.tracking;

    const donation =
        appMap.state.donation;

    const ui =
        appMap.ui.tracking;


    if (
        ui.driverName
    ) {

        ui.driverName.textContent =
            state.driver ||
            donation
                ?.assignment
                ?.agent ||
            "Delivery Partner";

    }


    if (
        ui.driverPhone
    ) {

        ui.driverPhone.textContent =
            state.phone ||
            donation
                ?.assignment
                ?.agentPhone ||
            "+91 90000 00000";

    }


    if (
        ui.vehicle
    ) {

        ui.vehicle.textContent =
            `${
                mapGetVehicleEmoji(
                    state.vehicle
                )
            } ${state.vehicle}`;

    }


    if (
        ui.vehicleNumber
    ) {

        ui.vehicleNumber.textContent =
            state.vehicleNumber ||
            "--";

    }


    if (
        ui.ngo
    ) {

        ui.ngo.textContent =
            state.ngo ||
            donation
                ?.assignment
                ?.ngo ||
            "Assigned NGO";

    }


    if (
        ui.status
    ) {

        ui.status.textContent =
            donation.status ||
            "Driver Assigned";

    }


    if (
        ui.distance
    ) {

        ui.distance.textContent =
            mapFormatDistance(
                state.remainingDistanceKm
            );

    }


    if (
        ui.eta
    ) {

        const eta =
            mapCalculateETA(
                state.remainingDistanceKm
            );


        ui.eta.textContent =
            eta > 0
                ? `${eta} mins`
                : "Arrived";

    }


    if (
        ui.statusMessage
    ) {

        ui.statusMessage.textContent =
            `Live route tracking • ${
                mapGetVehicleEmoji(
                    state.vehicle
                )
            } ${state.vehicle}`;

    }


    mapUpdateGPSAccuracy();

}


/* ============================================================
   Z — GPS ACCURACY
============================================================ */

function mapUpdateGPSAccuracy() {

    const element =
        document.getElementById(
            "trackingGPSAccuracy"
        );


    if (
        !element
    ) {

        return;

    }


    const state =
        appMap.state.tracking;


    if (
        Number.isFinite(
            state.locationAccuracyMeters
        )
    ) {

        element.textContent =
            `${Math.round(
                state.locationAccuracyMeters
            )} m`;

    }

}


/* ============================================================
   COMPLETE INITIALIZATION
============================================================ */

async function initializeMapModule() {

    const state =
        appMap.state.tracking;


    console.log(
        "NutriCycle AI — MAP MODULE STARTING"
    );


    /*
       1. Fresh GPS.
    */

    const location =
        await mapGetExactLiveLocation();


    state.liveLocation =
        location.coordinates;


    state.donorLocation =
        location.coordinates;


    state.locationAccuracyMeters =
        location.accuracyMeters;


    /*
       2. Destination.
    */

    state.ngoLocation =
        mapGetNGOLocation();


    /*
       3. Create map.
    */

    mapCreateMap();


    /*
       4. Get real road route.
    */

    const route =
        await mapGetRoadRoute(

            state.liveLocation,

            state.ngoLocation

        );


    /*
       5. Validate route.
    */

    const actualGeometryDistance =
        mapValidateRoadRoute(

            state.liveLocation,

            state.ngoLocation,

            route.points

        );


    /*
       6. Store route.
    */

    state.routePoints =
        mapSimplifyRoute(
            route.points
        );


    state.routeDistanceKm =
        actualGeometryDistance;


    state.remainingDistanceKm =
        actualGeometryDistance;


    state.currentLocation =
        state.routePoints[0];


    state.routeIndex =
        0;


    state.routeReady =
        true;


    /*
       7. Draw route.
    */

    mapDrawRoute();


    /*
       8. Create markers.
    */

    mapCreateMarkers();


    /*
       9. Populate information.
    */

    const assignment =
        appMap
            .state
            .donation
            ?.assignment;


    state.driver =
        assignment?.agent
        ||
        "Delivery Partner";


    state.phone =
        assignment?.agentPhone
        ||
        "+91 90000 00000";


    state.ngo =
        assignment?.ngo
        ||
        "Assigned NGO";


    const vehicleNumbers = {

        Bike:
            "MH-12-BK-4210",

        Car:
            "MH-12-CR-7314",

        Tempo:
            "MH-12-TM-5826",

        Truck:
            "MH-12-TR-9042"

    };


    state.vehicleNumber =
        vehicleNumbers[
            state.vehicle
        ]
        ||
        "MH-12-CR-7314";


    /*
       10. Final UI.
    */

    mapUpdateUI();


    /*
       11. Start real GPS watcher.
    */

    mapStartLocationWatch();


    state.mapReady =
        true;

    state.initialized =
        true;


    console.log(
        "NutriCycle AI — MAP READY",
        {

            latitude:
                state.liveLocation[0],

            longitude:
                state.liveLocation[1],

            accuracyMeters:
                state.locationAccuracyMeters,

            vehicle:
                state.vehicle,

            emoji:
                mapGetVehicleEmoji(
                    state.vehicle
                ),

            routePoints:
                state.routePoints.length,

            roadDistanceKm:
                state.routeDistanceKm

        }
    );


    return true;

}


/* ============================================================
   TRACKING SCREEN OPEN
============================================================ */

async function openMapTracking() {

    const donation =
        appMap.state.donation;


    const assignment =
        donation?.assignment;


    if (
        !assignment
        ||
        !assignment.vehicle
        ||
        !assignment.ngo
    ) {

        console.error(
            "NutriCycle AI — Mapping blocked: assignment incomplete."
        );

        return;

    }


    /*
       Transfer assignment data.
    */

    const state =
        appMap.state.tracking;


    state.driver =
        assignment.agent ||
        "Delivery Partner";


    state.phone =
        assignment.agentPhone ||
        "+91 90000 00000";


    state.vehicle =
        assignment.vehicle;


    state.ngo =
        assignment.ngo;


    const vehicleNumbers = {

        Bike:
            "MH-12-BK-4210",

        Car:
            "MH-12-CR-7314",

        Tempo:
            "MH-12-TM-5826",

        Truck:
            "MH-12-TR-9042"

    };


    state.vehicleNumber =
        vehicleNumbers[
            assignment.vehicle
        ]
        ||
        "MH-12-CR-7314";


    /*
       Store tracking information in the donation.
    */

    donation.tracking.driverName =
        state.driver;


    donation.tracking.driverPhone =
        state.phone;


    donation.tracking.vehicle =
        state.vehicle;


    donation.tracking.vehicleNumber =
        state.vehicleNumber;


    donation.tracking.ngo =
        state.ngo;


    donation.status =
        "Driver Assigned";


    /*
       Show screen FIRST.
    */

    appMap.showScreen(
        7
    );


    /*
       Wait until browser paints the visible map
       container.
    */

    requestAnimationFrame(
        async () => {

            try {

                await initializeMapModule();


                if (
                    state.mapReady
                    &&
                    state.routeReady
                ) {

                    startMapVehicleMovement();

                }

            }
            catch (
                error
            ) {

                console.error(
                    "NutriCycle AI — MAP INITIALIZATION FAILED:",
                    error
                );


                if (
                    appMap.ui.tracking
                        .status
                ) {

                    appMap
                        .ui
                        .tracking
                        .status
                        .textContent =
                            "Tracking Unavailable";

                    }

            }

        }
    );

}


/* ============================================================
   VEHICLE MOVEMENT
============================================================ */

function startMapVehicleMovement() {

    const state =
        appMap.state.tracking;


    if (
        state.movementRunning
    ) {

        return;

    }


    if (
        !state.mapReady ||
        !state.routeReady ||
        !state.vehicleMarker ||
        !state.routePoints.length
    ) {

        console.warn(
            "NutriCycle AI — Vehicle movement cannot start."
        );

        return;

    }


    state.routeIndex =
        0;


    state.currentLocation =
        state.routePoints[0];


    state.remainingDistanceKm =
        state.routeDistanceKm;


    /*
       EXACTLY lock marker to the first
       road coordinate.
    */
    state.vehicleMarker.setLatLng(

        state.currentLocation

    );


    /*
       Face the first road segment.
    */
    mapOrientVehicleMarker(
        state,
        0
    );


    state.movementRunning =
        true;


    state.movementCompleted =
        false;


    if (
        state.movementTimer
    ) {

        clearInterval(
            state.movementTimer
        );

    }


    state.movementTimer =
        setInterval(

            () => {

                advanceMapVehicle();

            },

            appMap
                .MAP_CONFIG
                .movementInterval

        );


    mapUpdateUI();


    console.log(

        "NutriCycle AI — Vehicle movement started:",

        {

            vehicle:
                state.vehicle,

            routePoints:
                state.routePoints.length

        }

    );

}


/* ============================================================
   ADVANCE VEHICLE
============================================================ */

function advanceMapVehicle() {

    const state =
        appMap.state.tracking;


    if (
        !state.movementRunning ||
        state.movementCompleted
    ) {

        return;

    }


    const nextIndex =
        Math.min(

            state.routeIndex + 1,

            state.routePoints.length - 1

        );


    state.routeIndex =
        nextIndex;


    state.currentLocation =
        state.routePoints[
            nextIndex
        ];


    /*
       STRICT ROUTE LOCK:
       marker position comes directly from
       the road geometry.
    */
    state.vehicleMarker.setLatLng(

        state.currentLocation

    );


    /*
       Keep vehicle facing the road.
    */
    mapOrientVehicleMarker(

        state,

        nextIndex

    );


    state.remainingDistanceKm =
        mapRemainingDistance(

            nextIndex

        );


    const progress =
        nextIndex /
        (
            state.routePoints.length - 1
        );


    mapUpdateTimeline(
        progress
    );


    const donation =
        appMap.state.donation;


    if (
        progress >= 1
    ) {

        finishMapDelivery();

        return;

    }


    if (
        progress >= 0.40
    ) {

        donation.status =
            "On the Way";

    }

    else if (
        progress >= 0.25
    ) {

        donation.status =
            "Driver Assigned";

    }

    else if (
        progress >= 0.10
    ) {

        donation.status =
            "NGO Assigned";

    }

    else {

        donation.status =
            "Donation Created";

    }


    mapUpdateUI();

}


/* ============================================================
   TIMELINE
============================================================ */

function mapUpdateTimeline(
    progress
) {

    const items =
        appMap
            .ui
            .tracking
            .timeline;


    if (
        !items.length
    ) {

        return;

    }


    let activeIndex =
        0;


    if (
        progress >= 0.90
    ) {

        activeIndex =
            4;

    }

    else if (
        progress >= 0.40
    ) {

        activeIndex =
            3;

    }

    else if (
        progress >= 0.25
    ) {

        activeIndex =
            2;

    }

    else if (
        progress >= 0.10
    ) {

        activeIndex =
            1;

    }


    items.forEach(
        (
            item,
            index
        ) => {

            item.classList.toggle(
                "active",
                index <= activeIndex
            );

        }
    );

}


/* ============================================================
   DELIVERY COMPLETE
============================================================ */

function finishMapDelivery() {

    const state =
        appMap.state.tracking;

    const donation =
        appMap.state.donation;


    if (
        state.movementTimer
    ) {

        clearInterval(
            state.movementTimer
        );

    }


    state.movementTimer =
        null;


    state.movementRunning =
        false;


    state.movementCompleted =
        true;


    state.routeIndex =
        state.routePoints.length - 1;


    state.currentLocation =
        state.routePoints[
            state.routePoints.length - 1
        ];


    state.remainingDistanceKm =
        0;


    state.vehicleMarker.setLatLng(
        state.currentLocation
    );


    donation.status =
        "Delivered";


    donation.tracking.status =
        "Delivered";


    if (
        appMap.ui.tracking.status
    ) {

        appMap
            .ui
            .tracking
            .status
            .textContent =
                "Delivered";

    }


    if (
        appMap.ui.tracking.eta
    ) {

        appMap
            .ui
            .tracking
            .eta
            .textContent =
                "Arrived";

    }


    if (
        appMap.ui.tracking.distance
    ) {

        appMap
            .ui
            .tracking
            .distance
            .textContent =
                "0 m";

    }


    if (
        appMap.ui.tracking.statusMessage
    ) {

        appMap
            .ui
            .tracking
            .statusMessage
            .textContent =
                "Donation delivered successfully to the assigned NGO.";

    }


    mapUpdateTimeline(
        1
    );


    /*
       Persist through Part 10 when available.
    */

    if (
        typeof appMap.persistTrackingState ===
        "function"
    ) {

        appMap.persistTrackingState();

    }


    console.log(
        "NutriCycle AI — Delivery Complete"
    );

}


/* ============================================================
   STOP MOVEMENT
============================================================ */

function stopMapVehicleMovement() {

    const state =
        appMap.state.tracking;


    if (
        state.movementTimer
    ) {

        clearInterval(
            state.movementTimer
        );

    }


    state.movementTimer =
        null;


    state.movementRunning =
        false;

}


/* ============================================================
   RESET COMPLETE MAP
============================================================ */

function resetMapModule() {

    const state =
        appMap.state.tracking;


    stopMapVehicleMovement();

    mapStopLocationWatch();


    if (
        state.map
    ) {

        try {

            state.map.remove();

        }
        catch (
            error
        ) {

            console.warn(
                "NutriCycle AI — Map reset warning:",
                error
            );

        }

    }


    state.map =
        null;

    state.donorMarker =
        null;

    state.ngoMarker =
        null;

    state.vehicleMarker =
        null;

    state.routeLine =
        null;

    state.donorLocation =
        null;

    state.liveLocation =
        null;

    state.locationAccuracyMeters =
        null;

    state.ngoLocation =
        null;

    state.routePoints =
        [];

    state.routeDistanceKm =
        0;

    state.remainingDistanceKm =
        0;

    state.currentLocation =
        null;

    state.routeIndex =
        0;

    state.mapReady =
        false;

    state.routeReady =
        false;

    state.initialized =
        false;

    state.movementCompleted =
        false;


}


/* ============================================================
   RETURN TO DASHBOARD
============================================================ */

function mapReturnToDashboard() {

    resetMapModule();


    window.location.href =
        "user.html";

}


/* ============================================================
   BUTTON
============================================================ */

if (
    appMap.ui.tracking.dashboardButton
) {

    appMap.ui.tracking.dashboardButton
        .addEventListener(
            "click",
            mapReturnToDashboard
        );

}


/* ============================================================
   PUBLIC API
============================================================ */

appMap.initializeTracking =
    openMapTracking;


appMap.initializeTrackingMap =
    initializeMapModule;


appMap.startTrackingMovement =
    startMapVehicleMovement;


appMap.stopTrackingMovement =
    stopMapVehicleMovement;


appMap.resetTracking =
    resetMapModule;


appMap.getExactLiveLocation =
    mapGetExactLiveLocation;


/*
   These names are retained so Part 10 can
   persist tracking state without needing to
   know the internal implementation.
*/

window.getExactLiveLocation =
    mapGetExactLiveLocation;


window.startTrackingMovement =
    startMapVehicleMovement;


window.stopTrackingMovement =
    stopMapVehicleMovement;


/* ============================================================
   FINAL READY
============================================================ */

console.log(
    "NutriCycle AI — COMPLETE MAP MODULE READY"
);
    /* ============================================================
   PART 10 — DONATION PERSISTENCE
   FIRESTORE + LOCAL COMPATIBILITY
============================================================ */

const appPersistence =
    window.NutriCycleAI;


/* ============================================================
   PERSISTENCE CONFIG
============================================================ */

appPersistence.PERSISTENCE_CONFIG = {

    donationsKey:
        "nutricycle_donations",

    currentUserKey:
        "nutricycle_current_user"

};


/* ============================================================
   CURRENT USER
============================================================ */

function getPersistenceCurrentUser() {

    try {

        const raw =
            localStorage.getItem(
                appPersistence
                    .PERSISTENCE_CONFIG
                    .currentUserKey
            );


        if (raw) {

            return JSON.parse(raw);

        }

    }
    catch (error) {

        console.warn(
            "NutriCycle AI — Local user read failed:",
            error
        );

    }


    /*
     * Firebase Authentication is the stronger
     * source when available.
     */
    return null;

}


/* ============================================================
   FIREBASE USER
============================================================ */

async function getFirebaseContext() {

    try {

        const firebaseModule =

            await import(
                "../js/firebase-config.js"
            );


        return {

            db:
                firebaseModule.db,

            auth:
                firebaseModule.auth

        };

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Firebase config could not be loaded:",
            error
        );


        return null;

    }

}


/* ============================================================
   LOCAL DONATIONS
============================================================ */

function getPersistedDonations() {

    try {

        const raw =
            localStorage.getItem(

                appPersistence
                    .PERSISTENCE_CONFIG
                    .donationsKey

            );


        if (!raw) {

            return [];

        }


        const parsed =
            JSON.parse(
                raw
            );


        return Array.isArray(
            parsed
        )
            ? parsed
            : [];

    }
    catch (error) {

        console.warn(
            "NutriCycle AI — Could not read local donations:",
            error
        );


        return [];

    }

}


/* ============================================================
   SAVE LOCAL COPY
============================================================ */

function saveLocalDonation(
    record
) {

    const donations =
        getPersistedDonations();


    const existingIndex =
        donations.findIndex(

            item =>
                item?.id ===
                record.id

        );


    if (
        existingIndex >= 0
    ) {

        donations[
            existingIndex
        ] =
            record;

    }
    else {

        donations.push(
            record
        );

    }


    localStorage.setItem(

        appPersistence
            .PERSISTENCE_CONFIG
            .donationsKey,

        JSON.stringify(
            donations
        )

    );


    localStorage.setItem(

        "nutricycle_lastDonation",

        JSON.stringify(
            record
        )

    );

}


/* ============================================================
   LOCATION HELPERS
============================================================ */

function getValidCoordinates(
    latitude,
    longitude
) {

    const lat =
        Number(
            latitude
        );

    const lng =
        Number(
            longitude
        );


    if (
        !Number.isFinite(lat)
        ||
        !Number.isFinite(lng)
    ) {

        return null;

    }


    if (
        lat < -90
        ||
        lat > 90
        ||
        lng < -180
        ||
        lng > 180
    ) {

        return null;

    }


    return {

        latitude:
            lat,

        longitude:
            lng

    };

}


/* ============================================================
   LIVE DONOR LOCATION
============================================================ */

function getDonationLiveLocation() {

    const trackingState =
        appPersistence
            ?.MAP_STATE
            ?.tracking;


    const possibleStates = [

        trackingState,

        appPersistence
            ?.state
            ?.tracking,

        appPersistence
            ?.MAP
            ?.state
            ?.tracking

    ];


    for (
        const state
        of possibleStates
    ) {

        if (!state) {

            continue;

        }


        const coordinates =

            Array.isArray(
                state.liveLocation
            )

                ? state.liveLocation

                : Array.isArray(
                    state.donorLocation
                )
                    ? state.donorLocation
                    : null;


        if (
            !coordinates
            ||
            coordinates.length < 2
        ) {

            continue;

        }


        const valid =
            getValidCoordinates(

                coordinates[0],

                coordinates[1]

            );


        if (!valid) {

            continue;

        }


        return {

            ...valid,

            accuracyMeters:
                Number.isFinite(
                    Number(
                        state.locationAccuracyMeters
                    )
                )
                    ? Number(
                        state.locationAccuracyMeters
                    )
                    : null,

            source:
                "live_gps"

        };

    }


    /*
     * The map module in this file stores its
     * tracking state on the shared application
     * object. Read it directly as a fallback.
     */
    try {

        const mapState =
            window
                ?.NutriCycleAI
                ?.MAP_STATE
                ?.tracking;


        const coordinates =

            Array.isArray(
                mapState?.liveLocation
            )

                ? mapState.liveLocation

                : Array.isArray(
                    mapState?.donorLocation
                )
                    ? mapState.donorLocation
                    : null;


        if (
            coordinates
            &&
            coordinates.length >= 2
        ) {

            const valid =
                getValidCoordinates(

                    coordinates[0],

                    coordinates[1]

                );


            if (valid) {

                return {

                    ...valid,

                    accuracyMeters:
                        Number.isFinite(
                            Number(
                                mapState
                                    ?.locationAccuracyMeters
                            )
                        )
                            ? Number(
                                mapState
                                    .locationAccuracyMeters
                            )
                            : null,

                    source:
                        "live_gps"

                };

            }

        }

    }
    catch (error) {

        console.warn(
            "NutriCycle AI — Live location read failed:",
            error
        );

    }


    return null;

}


/* ============================================================
   FIRESTORE DONOR PROFILE LOCATION
============================================================ */

async function getDonorProfileLocation(
    db,
    uid,
    firestore
) {

    if (
        !db
        ||
        !uid
        ||
        !firestore
    ) {

        return null;

    }


    try {

        const {
            doc,
            getDoc
        } =
            firestore;


        const userRef =
            doc(
                db,
                "users",
                uid
            );


        const snapshot =
            await getDoc(
                userRef
            );


        if (
            !snapshot.exists()
        ) {

            return null;

        }


        const user =
            snapshot.data();


        const location =
            user?.location;


        if (!location) {

            return null;

        }


        const coordinates =
            getValidCoordinates(

                location.latitude,

                location.longitude

            );


        if (!coordinates) {

            return null;

        }


        return {

            countryCode:
                location.countryCode ||
                "",

            countryName:
                location.countryName ||
                "",

            administrativeArea:
                location.administrativeArea ||
                "",

            district:
                location.district ||
                "",

            municipalityOrCity:
                location.municipalityOrCity ||
                "",

            locality:
                location.locality ||
                "",

            postalCode:
                location.postalCode ||
                "",

            latitude:
                coordinates.latitude,

            longitude:
                coordinates.longitude,

            timezone:
                location.timezone ||
                "",

            source:
                "profile",

            accuracyMeters:
                null

        };

    }
    catch (error) {

        console.warn(
            "NutriCycle AI — Donor profile location read failed:",
            error
        );


        return null;

    }

}


/* ============================================================
   LOCATION CONTRACT
============================================================ */

function createEmptyDonationLocation() {

    return {

        countryCode:
            "",

        countryName:
            "",

        administrativeArea:
            "",

        district:
            "",

        municipalityOrCity:
            "",

        locality:
            "",

        postalCode:
            "",

        latitude:
            null,

        longitude:
            null,

        timezone:
            "",

        source:
            "",

        accuracyMeters:
            null

    };

}


/* ============================================================
   BUILD DONATION RECORD
============================================================ */

function buildDonationRecord() {

    const donation =
        appPersistence
            .state
            .donation;


    if (!donation) {

        return null;

    }


    if (!donation.id) {

        donation.id =

            `NCA-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 7)
                .toUpperCase()}`;

    }


    const localUser =
        getPersistenceCurrentUser();


    /*
     * Capture live GPS if the map module has
     * already initialized.
     *
     * This is only a provisional location.
     * The authenticated Firestore profile is
     * resolved later during persistence.
     */
    const liveLocation =
        getDonationLiveLocation();


    const initialLocation =
        createEmptyDonationLocation();


    if (liveLocation) {

        initialLocation.latitude =
            liveLocation.latitude;

        initialLocation.longitude =
            liveLocation.longitude;

        initialLocation.source =
            liveLocation.source;

        initialLocation.accuracyMeters =
            liveLocation.accuracyMeters;

    }


    const record = {

        /*
         * Application ID
         */
        id:
            donation.id,


        /*
         * Firebase ownership gets filled
         * before Firestore write.
         */
        donorUid:
            "",

        donorName:
            localUser?.fullName ||
            localUser?.name ||
            "Food Donor",

        donorEmail:
            localUser?.email ||
            "",

        donorPhone:
            localUser?.phone ||
            "",


        /*
         * Permanent standardized location
         * contract.
         */
        location:
            initialLocation,


        /*
         * Temporary compatibility fields.
         *
         * These allow older dashboard code to
         * continue reading coordinates while
         * every new record uses location as the
         * canonical structure.
         */
        latitude:
            initialLocation.latitude,

        longitude:
            initialLocation.longitude,


        /* Food */

        image:
            donation.image ||
            "",

        foodName:
            donation.foodName ||
            "",

        freshness:
            donation.freshness ||
            "",

        shelfLife:
            donation.shelfLife ||
            "",

        confidence:
            donation.confidence ||
            "",


        /* Quantity */

        quantity:
            donation.quantity ??
            null,

        unit:
            donation.unit ||
            "",

        quantityKg:
            donation.quantityKg ??
            null,


        /* Timing */

        preparedTime:
            donation.preparedTime ||
            "",

        expiryTime:
            donation.expiryTime ||
            "",

        notes:
            donation.notes ||
            "",


        /* Payment */

        paymentMethod:
            donation.paymentMethod ||
            "",

        paymentAmount:
            donation.paymentAmount ??
            100,

        paymentCompleted:
            donation.paymentCompleted === true,


        /* Reward */

        reward:
            donation.reward
                ? {

                    revealed:
                        donation.reward.revealed === true,

                    title:
                        donation.reward.title ||
                        "₹100 OFF",

                    brand:
                        donation.reward.brand ||
                        "Partner Brand Reward",

                    offer:
                        donation.reward.offer ||
                        "🎉 ₹100 Donation Coupon 🎉"

                }
                : {

                    revealed:
                        false,

                    title:
                        "₹100 OFF",

                    brand:
                        "Partner Brand Reward",

                    offer:
                        "🎉 ₹100 Donation Coupon 🎉"

                },


        /* Assignment */

        assignment:
            donation.assignment
                ? {

                    vehicle:
                        donation.assignment.vehicle ||
                        "",

                    capacityKg:
                        donation.assignment.capacityKg ??
                        null,

                    reason:
                        donation.assignment.reason ||
                        "",

                    ngo:
                        donation.assignment.ngo ||
                        "",

                    agent:
                        donation.assignment.agent ||
                        "",

                    phone:
                        donation.assignment.phone ||
                        "",

                    etaMinutes:
                        donation.assignment.etaMinutes ??
                        null

                }
                : null,


        /* Tracking */

        tracking:
            donation.tracking
                ? {

                    driverName:
                        donation.tracking.driverName ||
                        "",

                    driverPhone:
                        donation.tracking.driverPhone ||
                        "",

                    vehicle:
                        donation.tracking.vehicle ||
                        "",

                    vehicleNumber:
                        donation.tracking.vehicleNumber ||
                        "",

                    status:
                        donation.tracking.status ||
                        "Waiting for Pickup",

                    eta:
                        donation.tracking.eta ||
                        "",

                    distanceKm:
                        donation.tracking.distanceKm ??
                        null,

                    ngo:
                        donation.tracking.ngo ||
                        "",

                    route:
                        Array.isArray(
                            donation.tracking.route
                        )
                            ? donation.tracking.route
                            : [],

                    routeIndex:
                        Number.isFinite(
                            donation.tracking.routeIndex
                        )
                            ? donation.tracking.routeIndex
                            : 0

                }
                : null,


        /* Overall */

        status:
            donation.status ||
            "Donation Created",


        schemaVersion:
            2,


        createdAt:
            new Date().toISOString(),


        updatedAt:
            new Date().toISOString()

    };


    return record;

}


/* ============================================================
   RESOLVE FINAL DONATION LOCATION
============================================================ */

async function resolveDonationLocation(
    record,
    db,
    firebaseUser,
    firestore
) {

    /*
     * 1. Start with the live GPS location
     * already captured by the map module.
     */
    const liveLocation =
        getDonationLiveLocation();


    /*
     * 2. Read the donor's permanent profile
     * location from Firestore.
     */
    const profileLocation =
        await getDonorProfileLocation(

            db,

            firebaseUser.uid,

            firestore

        );


    /*
     * 3. Build the canonical location.
     *
     * Profile supplies structured geography.
     * Live GPS supplies the most current
     * coordinates when available.
     */
    const profile =
        profileLocation ||
        createEmptyDonationLocation();


    const coordinates =
        liveLocation ||

        getValidCoordinates(

            profile.latitude,

            profile.longitude

        );


    const finalLocation = {

        countryCode:
            profile.countryCode ||
            "",

        countryName:
            profile.countryName ||
            "",

        administrativeArea:
            profile.administrativeArea ||
            "",

        district:
            profile.district ||
            "",

        municipalityOrCity:
            profile.municipalityOrCity ||
            "",

        locality:
            profile.locality ||
            "",

        postalCode:
            profile.postalCode ||
            "",

        latitude:
            coordinates
                ?.latitude ??
            null,

        longitude:
            coordinates
                ?.longitude ??
            null,

        timezone:
            profile.timezone ||
            "",

        source:
            liveLocation
                ? "live_gps"
                : (
                    profileLocation
                        ? "profile"
                        : ""
                ),

        accuracyMeters:
            liveLocation
                ?.accuracyMeters ??
            profileLocation
                ?.accuracyMeters ??
            null

    };


    record.location =
        finalLocation;


    /*
     * Temporary compatibility fields.
     */
    record.latitude =
        finalLocation.latitude;

    record.longitude =
        finalLocation.longitude;


    /*
     * Keep donorLocation available for older
     * consumers while the canonical field is
     * location.
     */
    record.donorLocation = {

        ...finalLocation

    };


    /*
     * Keep the location synchronized into the
     * application state as well.
     */
    if (
        appPersistence
            ?.state
            ?.donation
    ) {

        appPersistence
            .state
            .donation
            .location =
                finalLocation;

    }


    return record;

}


/* ============================================================
   SAVE DONATION
============================================================ */

async function persistDonation() {

    const record =
        buildDonationRecord();


    if (!record) {

        console.error(
            "NutriCycle AI — Cannot persist missing donation."
        );


        return false;

    }


    /*
     * Save local copy immediately.
     * This preserves the current donor-side
     * behaviour.
     */
    try {

        saveLocalDonation(
            record
        );

    }
    catch (error) {

        console.warn(
            "NutriCycle AI — Local donation copy failed:",
            error
        );

    }


    /*
     * Firebase context.
     */
    const firebase =
        await getFirebaseContext();


    if (!firebase) {

        console.warn(
            "NutriCycle AI — Firestore unavailable; local copy retained."
        );


        return false;

    }


    const {
        db,
        auth
    } =
        firebase;


    const firebaseUser =
        auth?.currentUser;


    if (!firebaseUser) {

        console.warn(
            "NutriCycle AI — No authenticated Firebase user."
        );


        return false;

    }


    /*
     * Add authenticated ownership.
     */
    record.donorUid =
        firebaseUser.uid;


    record.donorName =

        firebaseUser.displayName ||

        record.donorName;


    record.donorEmail =

        firebaseUser.email ||

        record.donorEmail;


    try {

        const firestore =

            await import(

                "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"

            );


        /*
         * Resolve the permanent location
         * contract before the cloud write.
         */
        await resolveDonationLocation(

            record,

            db,

            firebaseUser,

            firestore

        );


        /*
         * Re-save local copy with Firebase UID
         * and the resolved location.
         */
        try {

            saveLocalDonation(
                record
            );

        }
        catch (error) {

            console.warn(
                "NutriCycle AI — Updated local donation copy failed:",
                error
            );

        }


        const {
            collection,
            addDoc,
            serverTimestamp
        } =
            firestore;


        /*
         * Create the permanent cloud record.
         */
        const ref =

            await addDoc(

                collection(
                    db,
                    "donations"
                ),

                {

                    ...record,

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp()

                }

            );


        /*
         * Remember the Firestore ID.
         */
        appPersistence
            .state
            .donation
            .firestoreId =
                ref.id;


        appPersistence
            .state
            .donation
            .donorUid =
                firebaseUser.uid;


        console.log(

            "NutriCycle AI — Donation saved to Firestore:",

            ref.id,

            {

                location:
                    record.location,

                latitude:
                    record.latitude,

                longitude:
                    record.longitude

            }

        );


        return true;

    }
    catch (error) {

        console.error(

            "NutriCycle AI — Firestore donation save failed:",

            error

        );


        /*
         * We intentionally do not delete the
         * local copy. This gives the donor UI
         * a fallback while making the failure
         * visible in the console.
         */

        return false;

    }

}


/* ============================================================
   SAVE ASSIGNMENT
============================================================ */

async function persistAssignment() {

    const donation =
        appPersistence
            .state
            .donation;


    if (
        !donation.assignment
    ) {

        console.warn(
            "NutriCycle AI — Assignment unavailable."
        );


        return false;

    }


    return persistDonation();

}


/* ============================================================
   SAVE TRACKING STATE
============================================================ */

async function persistTrackingState() {

    const donation =
        appPersistence
            .state
            .donation;


    const tracking =
        appPersistence
            .state
            .tracking;


    if (!donation) {

        return false;

    }


    if (!donation.tracking) {

        donation.tracking = {};

    }


    donation.tracking.vehicle =

        tracking?.vehicle ||

        donation.assignment?.vehicle ||

        "";


    donation.tracking.driverName =

        tracking?.driver ||

        donation.assignment?.agent ||

        "";


    donation.tracking.driverPhone =

        tracking?.phone ||

        donation.assignment?.phone ||

        "";


    donation.tracking.vehicleNumber =

        tracking?.vehicleNumber ||

        "";


    donation.tracking.ngo =

        tracking?.ngo ||

        donation.assignment?.ngo ||

        "";


    donation.tracking.distanceKm =

        Number.isFinite(
            tracking?.remainingDistanceKm
        )

            ? tracking.remainingDistanceKm

            : null;


    donation.tracking.route =

        Array.isArray(
            tracking?.routePoints
        )

            ? tracking.routePoints

            : [];


    donation.tracking.routeIndex =

        Number.isFinite(
            tracking?.routeIndex
        )

            ? tracking.routeIndex

            : 0;


    return persistDonation();

}


/* ============================================================
   ASSIGNMENT BUTTON
============================================================ */

const assignmentButton =

    document.getElementById(
        "assignmentNextButton"
    );


if (
    assignmentButton
) {

    assignmentButton.addEventListener(

        "click",

        () => {

            /*
             * Fire-and-forget.
             *
             * The existing workflow continues
             * immediately while the cloud copy
             * is written asynchronously.
             */

            persistAssignment();

        }

    );

}


/* ============================================================
   TRACKING MOVEMENT PERSISTENCE
============================================================ */

function persistCurrentTrackingState() {

    persistTrackingState();

}


/* ============================================================
   PUBLIC API
============================================================ */

appPersistence.persistDonation =
    persistDonation;

appPersistence.persistAssignment =
    persistAssignment;

appPersistence.persistTrackingState =
    persistTrackingState;


console.log(
    "NutriCycle AI — PART 10 FIRESTORE READY"
);