/* ============================================================
   NutriCycle AI
   Login Module
   Version 2.0
============================================================ */

"use strict";

import Auth from "./auth.js";


/* ============================================================
   DOM CACHE
============================================================ */

const ui = {

    form: document.getElementById("loginForm"),

    credential:
        document.getElementById("loginCredential"),

    password:
        document.getElementById("loginPassword"),

    rememberMe:
        document.getElementById("rememberMe"),

    loginButton:
        document.getElementById("loginButton"),

    forgotPasswordButton:
        document.getElementById("forgotPasswordButton"),

    togglePassword:
        document.getElementById("togglePassword"),

    togglePasswordIcon:
        document.getElementById("togglePasswordIcon"),

    loadingScreen:
        document.getElementById("loadingScreen"),

    loginSuccess:
        document.getElementById("loginSuccess"),

    credentialError:
        document.getElementById("credentialError"),

    passwordError:
        document.getElementById("passwordError")

};


/* ============================================================
   ERROR HANDLING
============================================================ */

function showError(element, message) {

    if (!element) {

        return;

    }

    element.textContent = message;

}


function clearErrors() {

    showError(ui.credentialError, "");

    showError(ui.passwordError, "");

}


/* ============================================================
   LOADING STATE
============================================================ */

function showLoader() {

    ui.loadingScreen?.classList.add("active");

}


function hideLoader() {

    ui.loadingScreen?.classList.remove("active");

}


function setLoginButtonState(disabled) {

    if (!ui.loginButton) {

        return;

    }

    ui.loginButton.disabled = disabled;

}


/* ============================================================
   REDIRECT
============================================================ */

function redirectUser(user) {

    if (!user) {

        return;

    }

    switch (user.role) {

        case "donor":

            window.location.href = "user.html";

            break;


        case "ngo":

            window.location.href = "ngo.html";

            break;


        case "agent":

            window.location.href = "agent.html";

            break;


        default:

            console.error(
                "Unknown user role:",
                user.role
            );

            hideLoader();

            showError(
                ui.credentialError,
                "Your account has an invalid role configuration."
            );

    }

}


/* ============================================================
   LOGIN
============================================================ */

async function handleLogin() {

    clearErrors();

    const credential =
        ui.credential?.value.trim() || "";

    const password =
        ui.password?.value || "";


    /* --------------------------------------------------------
       BASIC VALIDATION
    -------------------------------------------------------- */

    if (!credential) {

        showError(
            ui.credentialError,
            "Enter your email address."
        );

        ui.credential?.focus();

        return;

    }


    if (!password) {

        showError(
            ui.passwordError,
            "Enter your password."
        );

        ui.password?.focus();

        return;

    }


    /* --------------------------------------------------------
       LOGIN
    -------------------------------------------------------- */

    showLoader();

    setLoginButtonState(true);

    try {

        /*
         * Firebase Authentication currently
         * authenticates using email + password.
         */

        const user =
            await Auth.login(
                credential,
                password
            );


        if (!user) {

            throw new Error(
                "Unable to load your account."
            );

        }


        /* ----------------------------------------------------
           SUCCESS
        ---------------------------------------------------- */

        ui.loginSuccess?.classList.add("active");


        setTimeout(() => {

            redirectUser(user);

        }, 1000);

    }

    catch (error) {

        console.error(
            "Login failed:",
            error
        );


        let message =
            "Unable to sign in. Please try again.";


        if (error?.code ===
            "auth/invalid-credential") {

            message =
                "Incorrect email or password.";

        }

        else if (
            error?.code ===
            "auth/user-not-found"
        ) {

            message =
                "No account exists with this email.";

        }

        else if (
            error?.code ===
            "auth/wrong-password"
        ) {

            message =
                "Incorrect password.";

        }

        else if (
            error?.code ===
            "auth/too-many-requests"
        ) {

            message =
                "Too many attempts. Please try again later.";

        }

        else if (
            error?.message
        ) {

            message =
                error.message;

        }


        hideLoader();

        setLoginButtonState(false);


        showError(
            ui.credentialError,
            message
        );

    }

}


/* ============================================================
   PASSWORD VISIBILITY
============================================================ */

function initializePasswordToggle() {

    ui.togglePassword?.addEventListener(
        "click",
        () => {

            if (!ui.password) {

                return;

            }


            const showingPassword =
                ui.password.type === "text";


            ui.password.type =
                showingPassword
                    ? "password"
                    : "text";


            if (ui.togglePasswordIcon) {

                ui.togglePasswordIcon.className =
                    showingPassword
                        ? "fa-solid fa-eye"
                        : "fa-solid fa-eye-slash";

            }

        }
    );

}


/* ============================================================
   FORGOT PASSWORD
============================================================ */

function initializeForgotPassword() {

    ui.forgotPasswordButton?.addEventListener(
        "click",
        () => {

            showError(
                ui.credentialError,
                "Password reset will be connected in the next authentication phase."
            );

        }
    );

}


/* ============================================================
   EVENTS
============================================================ */

function initializeEvents() {

    ui.form?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await handleLogin();

        }
    );


    initializePasswordToggle();

    initializeForgotPassword();

}


/* ============================================================
   INITIALIZATION
============================================================ */

function initialize() {

    initializeEvents();

    console.log(
        "NutriCycle AI Login Module Ready"
    );

}


/* ============================================================
   START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);