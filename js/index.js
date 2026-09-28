"use strict";

/* ==========================================
   NutriCycle AI
   Homepage Controller
========================================== */

function goLogin() {
    window.location.href = "/html/login.html";
}

function goSignup() {
    window.location.href = "/html/signup.html";
}

function goAwareness() {
    window.location.href = "/html/signup.html";
}

/* Make functions available to existing inline onclick handlers */
window.goLogin = goLogin;
window.goSignup = goSignup;
window.goAwareness = goAwareness;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Homepage Initialized");
});