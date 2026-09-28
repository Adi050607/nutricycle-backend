import Auth from "./auth.js";
import {
    parsePhoneNumberFromString,
    getCountries,
    getCountryCallingCode
} from "https://cdn.jsdelivr.net/npm/libphonenumber-js@1.12.17/+esm";

import {
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    db
} from "./firebase-config.js";
"use strict";

/* ============================================================
   NutriCycle AI
   Signup Module
   Version 2.0
   UI + Validation + Review
============================================================ */


/* ============================================================
   CONFIGURATION
============================================================ */

const CONFIG = Object.freeze({

    totalSteps: 5,

    minimumPasswordLength: 8,

    maximumPasswordLength: 128,

    securityTrustEndpoint:
        (
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
        )
            ? "http://localhost:10000/verify"
            : ""

});


/* ============================================================
   APPLICATION STATE
============================================================ */

const state = {

    currentStep: 1,

    selectedRole: null

};


/* ============================================================
   DOM CACHE
============================================================ */

const dom = {

    steps: [],

    progressSteps: [],

    progressFill: null,

    roleCards: [],

    selectedRole: null,

    loadingScreen: null

};


/* ============================================================
   INITIALIZATION
============================================================ */

async function initialize() {

    cacheDOM();

    initializeNavigation();

    initializeRoleSelection();

    initializePasswordStrength();

    initializeInputRestrictions();

    await initializeGlobalCountryContext();

    showStep(1);

    hideLoadingScreen();

    console.log(
        "NutriCycle AI Signup V2 Ready"
    );

}


/* ============================================================
   CACHE DOM
============================================================ */

function cacheDOM() {

    dom.steps =
        Array.from(
            document.querySelectorAll(".form-step")
        );

    dom.progressSteps =
        Array.from(
            document.querySelectorAll(".progress-step")
        );

    dom.progressFill =
        document.getElementById(
            "progressFill"
        );

    dom.roleCards =
        Array.from(
            document.querySelectorAll(".role-card")
        );

    dom.selectedRole =
        document.getElementById(
            "selectedRole"
        );

    dom.loadingScreen =
        document.getElementById(
            "loadingScreen"
        );

}



/* ============================================================
   COUNTRY FLAG
============================================================ */

function getCountryFlag(
    countryIsoCode
) {

    if (
        !countryIsoCode ||
        countryIsoCode.length !== 2
    ) {

        return "🌍";

    }


    return countryIsoCode
        .toUpperCase()
        .split("")
        .map(
            char =>
                String.fromCodePoint(
                    127397 +
                    char.charCodeAt(0)
                )
        )
        .join("");

}

/* ============================================================
   UPDATE SELECTED COUNTRY FLAG
============================================================ */

/* ============================================================
   UPDATE SELECTED COUNTRY
   Flag + Dial Code + Phone Metadata
============================================================ */

function updateCountryFlag() {

    const select =
        document.getElementById(
            "countryCode"
        );

    const flag =
        document.getElementById(
            "countryFlag"
        );

    const phoneHelp =
        document.querySelector(
            ".phone-input-container"
        )?.parentElement
        ?.querySelector(
            ".input-help"
        );


    if (!select) {

        return;

    }


    const countryIsoCode =
        select.value;


    if (!countryIsoCode) {

        if (flag) {

            flag.textContent =
                "🌍";

        }

        return;

    }


    /* ======================================================
       FLAG
    ====================================================== */

    if (flag) {

        flag.textContent =
            getCountryFlag(
                countryIsoCode
            );

    }


    /* ======================================================
       DIAL CODE
    ====================================================== */

    const dialCode =
        `+${getCountryCallingCode(
            countryIsoCode
        )}`;


    /*
     * Keep the selected country metadata
     * available on the select itself.
     */

    select.dataset.dialCode =
        dialCode;


    /*
     * Optional visual confirmation.
     */

    if (phoneHelp) {

        phoneHelp.textContent =
            `International format: ${dialCode}`;

    }

}

/* ============================================================
   GLOBAL COUNTRY CONTEXT
   Country → Flag + Dial Code + Language + Currency
   Data sources:
   - libphonenumber-js
   - Unicode CLDR
============================================================ */

let globalCountryMetadata = null;


/* ============================================================
   LOAD GLOBAL METADATA
============================================================ */

async function loadGlobalMetadata() {

    if (
        globalCountryMetadata
    ) {

        return globalCountryMetadata;

    }


    const territoryInfoUrl =
        "https://cdn.jsdelivr.net/npm/cldr-core@48.2.0/supplemental/territoryInfo.json";


    const currencyDataUrl =
        "https://cdn.jsdelivr.net/npm/cldr-core@48.2.0/supplemental/currencyData.json";


    const languageNamesUrl =
        "https://cdn.jsdelivr.net/npm/cldr-localenames-full@48.2.0/main/en/languages.json";


    try {

        const [
            territoryResponse,
            currencyResponse,
            languageResponse
        ] = await Promise.all([

            fetch(
                territoryInfoUrl
            ),

            fetch(
                currencyDataUrl
            ),

            fetch(
                languageNamesUrl
            )

        ]);


        if (
            !territoryResponse.ok ||
            !currencyResponse.ok ||
            !languageResponse.ok
        ) {

            throw new Error(
                "Global metadata request failed."
            );

        }


        const [
            territoryInfo,
            currencyData,
            languageData
        ] = await Promise.all([

            territoryResponse.json(),

            currencyResponse.json(),

            languageResponse.json()

        ]);


        globalCountryMetadata = {

            territoryInfo:
                territoryInfo
                    ?.supplemental
                    ?.territoryInfo
                || {},

            currencyRegions:
                currencyData
                    ?.supplemental
                    ?.currencyData
                    ?.region
                || {},

            languages:
                languageData
                    ?.main
                    ?.en
                    ?.localeDisplayNames
                    ?.languages
                || {}

        };


        return globalCountryMetadata;

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Failed to load global metadata:",
            error
        );

        throw error;

    }

}


/* ============================================================
   GLOBAL COUNTRY CONTEXT
============================================================ */

async function initializeGlobalCountryContext() {

    const countrySelect =
        document.getElementById(
            "countryCode"
        );


    const languageSelect =
        document.getElementById(
            "language"
        );


    const currencySelect =
        document.getElementById(
            "currency"
        );


    if (!countrySelect) {

        console.error(
            "NutriCycle AI — Country selector not found."
        );

        return;

    }


    try {

        const metadata =
            await loadGlobalMetadata();


        populateCountrySelector(
            countrySelect
        );


        populateAllLanguages(
            languageSelect,
            metadata.languages
        );


        populateAllCurrencies(
            currencySelect
        );


        countrySelect.addEventListener(
            "change",
            () => {

                applyCountryDefaults(
                    countrySelect.value,
                    metadata
                );

            }
        );


        /*
         * Detect the browser's country only as a
         * starting recommendation.
         *
         * We do NOT force a country.
         */

        const detectedRegion =
            detectBrowserRegion();


        if (
            detectedRegion &&
            Array.from(
                countrySelect.options
            ).some(
                option =>
                    option.value ===
                    detectedRegion
            )
        ) {

            countrySelect.value =
                detectedRegion;

        }


        if (
            countrySelect.value
        ) {

            applyCountryDefaults(
                countrySelect.value,
                metadata
            );

        }

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Global context initialization failed:",
            error
        );

        /*
         * Do not crash the complete signup page.
         */

        if (languageSelect) {

            languageSelect.innerHTML =
                "<option value=\"\">Language data unavailable</option>";

        }


        if (currencySelect) {

            currencySelect.innerHTML =
                "<option value=\"\">Currency data unavailable</option>";

        }

    }

}


/* ============================================================
   COUNTRY SELECTOR
============================================================ */

function populateCountrySelector(
    select
) {

    const regionNames =
        new Intl.DisplayNames(
            ["en"],
            {
                type:
                    "region"
            }
        );


    const countries =
        getCountries()
            .map(
                countryIsoCode => {

                    const countryName =
                        regionNames.of(
                            countryIsoCode
                        )
                        ||
                        countryIsoCode;


                    const dialCode =
                        getCountryCallingCode(
                            countryIsoCode
                        );


                    return {

                        iso:
                            countryIsoCode,

                        name:
                            countryName,

                        dialCode:
                            `+${dialCode}`,

                        flag:
                            getCountryFlag(
                                countryIsoCode
                            )

                    };

                }
            )
            .sort(
                (a, b) =>
                    a.name.localeCompare(
                        b.name
                    )
            );


    select.innerHTML =
        "";


    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value =
        "";

    placeholder.textContent =
        "Select Country / Region";

    placeholder.disabled =
        true;

    placeholder.selected =
        true;

    select.appendChild(
        placeholder
    );


    countries.forEach(
        country => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                country.iso;


            option.textContent =
                `${country.flag} ${country.name} (${country.dialCode})`;


            option.dataset.countryName =
                country.name;


            option.dataset.dialCode =
                country.dialCode;


            select.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   LANGUAGE CATALOG
============================================================ */

function populateAllLanguages(
    select,
    languages
) {

    if (!select) {

        return;

    }


    select.innerHTML =
        "";


    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value =
        "";

    placeholder.textContent =
        "Select Language";

    select.appendChild(
        placeholder
    );


    Object.entries(
        languages
    )
    .filter(
        ([code, name]) =>
            code &&
            name &&
            !code.includes(
                "-alt-"
            )
    )
    .sort(
        ([, nameA], [, nameB]) =>
            nameA.localeCompare(
                nameB
            )
    )
    .forEach(
        ([code, name]) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                code;

            option.textContent =
                name;

            select.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   CURRENCY CATALOG
============================================================ */

function populateAllCurrencies(
    select
) {

    if (!select) {

        return;

    }


    select.innerHTML =
        "";


    const placeholder =
        document.createElement(
            "option"
        );

    placeholder.value =
        "";

    placeholder.textContent =
        "Select Currency";

    select.appendChild(
        placeholder
    );


    let currencyCodes = [];


    try {

        currencyCodes =
            Intl.supportedValuesOf(
                "currency"
            );

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Currency enumeration unavailable:",
            error
        );

        return;

    }


    const currencyNames =
        new Intl.DisplayNames(
            [
                navigator.language ||
                "en"
            ],
            {
                type:
                    "currency"
            }
        );


    currencyCodes
        .slice()
        .sort()
        .forEach(
            currencyCode => {

                const option =
                    document.createElement(
                        "option"
                    );


                const currencyName =
                    currencyNames.of(
                        currencyCode
                    )
                    ||
                    currencyCode;


                option.value =
                    currencyCode;


                option.textContent =
                    `${currencyCode} — ${currencyName}`;


                select.appendChild(
                    option
                );

            }
        );

}


/* ============================================================
   APPLY COUNTRY DEFAULTS
============================================================ */

function applyCountryDefaults(
    countryIsoCode,
    metadata
) {

    if (
        !countryIsoCode
    ) {

        return;

    }


    updateCountryVisuals(
        countryIsoCode
    );


    applyRecommendedLanguage(
        countryIsoCode,
        metadata
    );


    applyCurrentCurrency(
        countryIsoCode,
        metadata
    );

}


/* ============================================================
   RECOMMENDED LANGUAGE
============================================================ */

function applyRecommendedLanguage(
    countryIsoCode,
    metadata
) {

    const languageSelect =
        document.getElementById(
            "language"
        );


    if (
        !languageSelect
    ) {

        return;

    }


    const territory =
        metadata
            .territoryInfo
            ?.[countryIsoCode];


    const languagePopulation =
        territory
            ?.languagePopulation;


    if (
        !languagePopulation
    ) {

        return;

    }


    const candidates =
        Object.entries(
            languagePopulation
        )
        .map(
            ([code, info]) => {

                const baseCode =
                    code.split(
                        "_"
                    )[0];


                const population =
                    Number(
                        info
                            ?._populationPercent
                        || 0
                    );


                const official =
                    info
                        ?._officialStatus
                        ||
                        "";


                const officialWeight =
                    official ===
                    "official"
                        ? 2
                        : official ===
                          "official_regional"
                            ? 1
                            : 0;


                return {

                    code:
                        code,

                    baseCode:
                        baseCode,

                    population:
                        population,

                    officialWeight:
                        officialWeight

                };

            }
        )
        .filter(
            item =>
                item.baseCode !==
                "und"
        )
        .sort(
            (a, b) => {

                if (
                    b.officialWeight !==
                    a.officialWeight
                ) {

                    return (
                        b.officialWeight -
                        a.officialWeight
                    );

                }


                return (
                    b.population -
                    a.population
                );

            }
        );


    if (
        candidates.length === 0
    ) {

        return;

    }


    const recommended =
        candidates[0];


    /*
     * Prefer the exact CLDR language code
     * when available. Otherwise use base code.
     */

    const exactOption =
        Array.from(
            languageSelect.options
        ).find(
            option =>
                option.value ===
                recommended.code
        );


    const baseOption =
        Array.from(
            languageSelect.options
        ).find(
            option =>
                option.value ===
                recommended.baseCode
        );


    const optionToSelect =
        exactOption ||
        baseOption;


    if (
        optionToSelect
    ) {

        languageSelect.value =
            optionToSelect.value;

    }

}


/* ============================================================
   CURRENT CURRENCY
============================================================ */

function applyCurrentCurrency(
    countryIsoCode,
    metadata
) {

    const currencySelect =
        document.getElementById(
            "currency"
        );


    if (
        !currencySelect
    ) {

        return;

    }


    const regionCurrencies =
        metadata
            .currencyRegions
            ?.[countryIsoCode];


    if (
        !Array.isArray(
            regionCurrencies
        )
    ) {

        return;

    }


    const currentCurrencies =
        regionCurrencies
            .flatMap(
                entry =>
                    Object.entries(
                        entry
                    )
                    .map(
                        ([code, info]) => ({

                            code:
                                code,

                            info:
                                info

                        })
                    )
            )
            .filter(
                item => {

                    /*
                     * Exclude non-tender currencies.
                     */

                    if (
                        item.info
                            ?._tender ===
                        "false"
                    ) {

                        return false;

                    }


                    /*
                     * Current currency:
                     * no ending date.
                     */

                    return !item.info
                        ?._to;

                }
            );


    if (
        currentCurrencies.length ===
        0
    ) {

        return;

    }


    /*
     * Prefer the first current tender currency
     * supplied by CLDR.
     */

    const preferredCurrency =
        currentCurrencies[0].code;


    const option =
        Array.from(
            currencySelect.options
        ).find(
            option =>
                option.value ===
                preferredCurrency
        );


    if (option) {

        currencySelect.value =
            preferredCurrency;

    }

}


/* ============================================================
   COUNTRY VISUALS
============================================================ */

function updateCountryVisuals(
    countryIsoCode
) {

    const countrySelect =
        document.getElementById(
            "countryCode"
        );


    const flag =
        document.getElementById(
            "countryFlag"
        );


    if (
        !countrySelect
    ) {

        return;

    }


    const option =
        Array.from(
            countrySelect.options
        ).find(
            item =>
                item.value ===
                countryIsoCode
        );


    if (
        flag
    ) {

        flag.textContent =
            getCountryFlag(
                countryIsoCode
            );

    }


    const dialCode =
        getCountryCallingCode(
            countryIsoCode
        );


    countrySelect.dataset.dialCode =
        `+${dialCode}`;


    countrySelect.dataset.countryName =
        option
            ?.dataset
            ?.countryName
        || "";

}


/* ============================================================
   BROWSER REGION
============================================================ */

function detectBrowserRegion() {

    try {

        return new Intl.Locale(
            navigator.language
        ).region || "";

    }

    catch {

        return "";

    }

}



/* ============================================================
   STEP ENGINE
============================================================ */

function showStep(stepNumber) {

    if (
        !Number.isInteger(stepNumber) ||
        stepNumber < 1 ||
        stepNumber > CONFIG.totalSteps
    ) {

        return;

    }


    state.currentStep = stepNumber;


    dom.steps.forEach(
        (step, index) => {

            step.classList.toggle(
                "active",
                index + 1 === stepNumber
            );

        }
    );


    updateProgress();

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* ============================================================
   PROGRESS
============================================================ */

function updateProgress() {

    const completedPercentage =
        (
            (state.currentStep - 1) /
            (CONFIG.totalSteps - 1)
        ) * 100;


    if (dom.progressFill) {

        dom.progressFill.style.width =
            `${completedPercentage}%`;

    }


    dom.progressSteps.forEach(
        (indicator, index) => {

            const stepNumber =
                index + 1;


            indicator.classList.toggle(
                "active",
                stepNumber === state.currentStep
            );


            indicator.classList.toggle(
                "completed",
                stepNumber < state.currentStep
            );

        }
    );

}


/* ============================================================
   NAVIGATION
============================================================ */

function initializeNavigation() {


    document
        .getElementById("step1NextButton")
        ?.addEventListener(
            "click",
            () => {

                if (validateAccount()) {

                    showStep(2);

                }

            }
        );


    document
        .getElementById("step2PreviousButton")
        ?.addEventListener(
            "click",
            () => {

                showStep(1);

            }
        );


    document
        .getElementById("step2NextButton")
        ?.addEventListener(
            "click",
            () => {

                if (validateProfile()) {

                    showStep(3);

                }

            }
        );


    document
        .getElementById("step3PreviousButton")
        ?.addEventListener(
            "click",
            () => {

                showStep(2);

            }
        );


    document
        .getElementById("step3NextButton")
        ?.addEventListener(
            "click",
            () => {

                if (validateRole()) {

                    buildReview();

                    showStep(4);

                }

            }
        );


    document
        .getElementById("step4PreviousButton")
        ?.addEventListener(
            "click",
            () => {

                showStep(3);

            }
        );


    document
        .getElementById("createAccountButton")
        ?.addEventListener(
            "click",
            handleCreateAccount
        );


    document
        .getElementById("goToDashboardButton")
        ?.addEventListener(
            "click",
            goToDashboard
        );

}


/* ============================================================
   ROLE SELECTION
============================================================ */

function initializeRoleSelection() {

    dom.roleCards.forEach(
        card => {


            card.setAttribute(
                "tabindex",
                "0"
            );


            card.addEventListener(
                "click",
                () => {

                    selectRole(card);

                }
            );


            card.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();

                        selectRole(card);

                    }

                }
            );

        }
    );

}


/* ============================================================
   SELECT ROLE
============================================================ */

function selectRole(card) {

    const role =
        card.dataset.role;


    if (!role) {

        return;

    }


    state.selectedRole =
        role;


    dom.roleCards.forEach(
        item => {

            item.classList.toggle(
                "selected",
                item === card
            );

        }
    );


    if (dom.selectedRole) {

        dom.selectedRole.value =
            role;

    }


    clearError("roleError");

    updateRoleSections();

}


/* ============================================================
   ROLE SECTIONS
============================================================ */

function updateRoleSections() {

    const donorSection =
        document.getElementById(
            "donorSection"
        );

    const ngoSection =
        document.getElementById(
            "ngoSection"
        );

    const agentSection =
        document.getElementById(
            "agentSection"
        );


    donorSection?.classList.remove(
        "active"
    );

    ngoSection?.classList.remove(
        "active"
    );

    agentSection?.classList.remove(
        "active"
    );


    if (state.selectedRole === "donor") {

        donorSection?.classList.add(
            "active"
        );

    }


    if (state.selectedRole === "ngo") {

        ngoSection?.classList.add(
            "active"
        );

    }


    if (state.selectedRole === "agent") {

        agentSection?.classList.add(
            "active"
        );

    }

}


/* ============================================================
   PASSWORD STRENGTH
============================================================ */

function initializePasswordStrength() {

    const password =
        document.getElementById(
            "password"
        );


    password?.addEventListener(
        "input",
        () => {

            updatePasswordStrength(
                password.value
            );

        }
    );

}


function updatePasswordStrength(password) {

    const bar =
        document.getElementById(
            "passwordStrengthBar"
        );

    const text =
        document.getElementById(
            "passwordStrengthText"
        );


    if (!bar || !text) {

        return;

    }


    /* ================================
       EMPTY
    ================================= */

    if (!password) {

        bar.style.width =
            "0%";

        bar.style.background =
            "#d1d5db";

        text.textContent =
            "Password strength";

        text.style.color =
            "#6b7280";

        return;

    }


    /* ================================
       SCORE
    ================================= */

    let score = 0;


    if (
        password.length >= 8
    ) {

        score++;

    }


    if (
        /[A-Z]/.test(password)
    ) {

        score++;

    }


    if (
        /[a-z]/.test(password)
    ) {

        score++;

    }


    if (
        /[0-9]/.test(password)
    ) {

        score++;

    }


    if (
        /[^A-Za-z0-9]/.test(password)
    ) {

        score++;

    }



    const percentage =
        (score / 5) * 100;


    bar.style.width =
        `${percentage}%`;


    /* ================================
       COLOUR + MESSAGE
    ================================= */

    if (score <= 2) {

        bar.style.background =
            "#ef4444";

        text.textContent =
            "Weak password";

        text.style.color =
            "#ef4444";

    }

    else if (score <= 3) {

        bar.style.background =
            "#f59e0b";

        text.textContent =
            "Moderate password";

        text.style.color =
            "#d97706";

    }

    else {

        bar.style.background =
            "#16a34a";

        text.textContent =
            "Strong password";

        text.style.color =
            "#16a34a";

    }

}


/* ============================================================
   INPUT RESTRICTIONS
============================================================ */

function initializeInputRestrictions() {

    const phone =
        document.getElementById(
            "phoneNumber"
        );

    const pincode =
        document.getElementById(
            "pincode"
        );


    


    pincode?.addEventListener(
        "input",
        () => {

            pincode.value =
                pincode.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

        }
    );

}


/* ============================================================
   ERROR HANDLING
============================================================ */

function showError(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            message;

    }

}


function clearError(elementId) {

    showError(
        elementId,
        ""
    );

}


function clearErrors(
    elementIds
) {

    elementIds.forEach(
        clearError
    );

}


/* ============================================================
   STEP 1 VALIDATION
============================================================ */

function validateAccount() {

    clearErrors([

        "emailError",

        "passwordError",

        "confirmPasswordError",

        "phoneError"

    ]);


    const email =
        document.getElementById(
            "email"
        )?.value.trim() || "";


    const password =
        document.getElementById(
            "password"
        )?.value || "";


    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        )?.value || "";


    const phone =
        document.getElementById(
            "phoneNumber"
        )?.value.trim() || "";


    let valid = true;


    /* EMAIL */

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(email)) {

        showError(
            "emailError",
            "Enter a valid email address."
        );

        valid = false;

    }


    /* PASSWORD */

    if (
        password.length <
        CONFIG.minimumPasswordLength
    ) {

        showError(
            "passwordError",
            "Password must contain at least 8 characters."
        );

        valid = false;

    }


    /* CONFIRM PASSWORD */

    if (
        password !==
        confirmPassword
    ) {

        showError(
            "confirmPasswordError",
            "Passwords do not match."
        );

        valid = false;

    }


   /* ======================================================
   MOBILE — INTERNATIONAL VALIDATION
====================================================== */

const countryIsoCode =
    document.getElementById(
        "countryCode"
    )?.value || "";


if (
    !countryIsoCode
) {

    showError(
        "phoneError",
        "Please select your country."
    );

    valid = false;

}

else {

    const parsedPhone =
       parsePhoneNumberFromString(
    phone,
    countryIsoCode
);


    if (
        !parsedPhone ||
        !parsedPhone.isValid()
    ) {

        showError(
            "phoneError",
            "This is an invalid number."
        );

        valid = false;

    }

}


    return valid;

}


/* ============================================================
   STEP 2 VALIDATION
============================================================ */

/* ============================================================
   STEP 2 VALIDATION
============================================================ */

function validateProfile() {

    clearErrors([

        "fullNameError",

        "genderError",

        "dateOfBirthError"

    ]);


    const fullName =
        document.getElementById(
            "fullName"
        )?.value.trim() || "";


    const gender =
        document.getElementById(
            "gender"
        )?.value || "";


    const dateOfBirth =
        document.getElementById(
            "dateOfBirth"
        )?.value || "";


    const language =
        document.getElementById(
            "language"
        )?.value || "";


    const currency =
        document.getElementById(
            "currency"
        )?.value || "";


    const administrativeArea =
        document.getElementById(
            "administrativeArea"
        )?.value.trim() || "";


    const district =
        document.getElementById(
            "district"
        )?.value.trim() || "";


    const municipalityOrCity =
        document.getElementById(
            "municipalityOrCity"
        )?.value.trim() || "";


    const locality =
        document.getElementById(
            "locality"
        )?.value.trim() || "";


    const postalCode =
        document.getElementById(
            "postalCode"
        )?.value.trim() || "";


    let valid = true;


    /* ======================================================
       NAME
    ====================================================== */

    if (
        fullName.length < 3
    ) {

        showError(
            "fullNameError",
            "Enter your full name."
        );

        valid = false;

    }


    /* ======================================================
       GENDER
    ====================================================== */

    if (
        !gender
    ) {

        showError(
            "genderError",
            "Select your gender."
        );

        valid = false;

    }


    /* ======================================================
       DATE OF BIRTH
    ====================================================== */

    if (
        !dateOfBirth
    ) {

        showError(
            "dateOfBirthError",
            "Select your date of birth."
        );

        valid = false;

    }


    /* ======================================================
       LANGUAGE
    ====================================================== */

    if (
        !language
    ) {

        alert(
            "Please select your preferred language."
        );

        valid = false;

    }


    /* ======================================================
       CURRENCY
    ====================================================== */

    if (
        !currency
    ) {

        alert(
            "Please select your preferred currency."
        );

        valid = false;

    }


    /* ======================================================
       LOCATION
    ====================================================== */

    if (
        !administrativeArea
    ) {

        alert(
            "Please enter your administrative area."
        );

        valid = false;

    }


    if (
        !district
    ) {

        alert(
            "Please enter your district or equivalent."
        );

        valid = false;

    }


    if (
        !municipalityOrCity
    ) {

        alert(
            "Please enter your city, town or village."
        );

        valid = false;

    }


    if (
        !locality
    ) {

        alert(
            "Please enter your locality or neighbourhood."
        );

        valid = false;

    }


    if (
        !postalCode
    ) {

        alert(
            "Please enter your postal code."
        );

        valid = false;

    }


    return valid;

}


/* ============================================================
   STEP 3 VALIDATION
============================================================ */

function validateRole() {

    clearError(
        "roleError"
    );


    if (!state.selectedRole) {

        showError(
            "roleError",
            "Select a role to continue."
        );

        return false;

    }


    if (
        state.selectedRole === "donor"
    ) {

        const donorType =
            document.getElementById(
                "donorType"
            )?.value || "";


        const operatingArea =
            document.getElementById(
                "donorOperatingArea"
            )?.value.trim() || "";


        if (!donorType) {

            showError(
                "roleError",
                "Please select your primary food source."
            );

            return false;

        }


        if (!operatingArea) {

            showError(
                "roleError",
                "Please enter your primary operating area."
            );

            document
                .getElementById(
                    "donorOperatingArea"
                )
                ?.focus();

            return false;

        }

    }


    return true;

}


/* ============================================================
   BUILD REVIEW
============================================================ */

function buildReview() {

    const email =
        document.getElementById(
            "email"
        )?.value.trim() || "—";


    const phone =
        document.getElementById(
            "phoneNumber"
        )?.value.trim() || "—";


    const name =
        document.getElementById(
            "fullName"
        )?.value.trim() || "—";


    const gender =
        document.getElementById(
            "gender"
        )?.selectedOptions[0]?.textContent.trim()
        || "—";


    const dateOfBirth =
        document.getElementById(
            "dateOfBirth"
        )?.value || "—";


    const stateValue =
        document.getElementById(
            "state"
        )?.value.trim() || "";


    const city =
        document.getElementById(
            "city"
        )?.value.trim() || "";


    const pincode =
        document.getElementById(
            "pincode"
        )?.value.trim() || "—";


    const roleName =
        getRoleDisplayName(
            state.selectedRole
        );


    setReviewValue(
        "reviewEmail",
        email
    );


    setReviewValue(
        "reviewPhone",
        phone
    );


    setReviewValue(
        "reviewName",
        name
    );


    setReviewValue(
        "reviewGender",
        gender
    );


    setReviewValue(
        "reviewDateOfBirth",
        dateOfBirth
    );


    setReviewValue(
        "reviewLocation",
        `${stateValue}, ${city}`
    );


    setReviewValue(
        "reviewPincode",
        pincode
    );


    setReviewValue(
        "reviewRole",
        roleName
    );


    buildRoleDetailsReview();

}


/* ============================================================
   ROLE DISPLAY NAME
============================================================ */

function getRoleDisplayName(role) {

    switch (role) {

        case "donor":
            return "Food Donor";

        case "ngo":
            return "NGO";

        case "agent":
            return "Delivery Agent";

        default:
            return "—";

    }

}


/* ============================================================
   ROLE DETAILS REVIEW
============================================================ */

function buildRoleDetailsReview() {

    const container =
        document.getElementById(
            "reviewRoleDetails"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    if (state.selectedRole === "donor") {

        const donorType =
            document.getElementById(
                "donorType"
            )?.selectedOptions[0]?.textContent.trim()
            || "—";


        const operatingArea =
            document.getElementById(
                "donorOperatingArea"
            )?.value.trim()
            || "—";


        container.innerHTML = `

        <strong>
            Food Source:
        </strong>
        ${donorType}

        <br>

        <strong>
            Primary Operating Area:
        </strong>
        ${operatingArea}

    `;

    }


    if (state.selectedRole === "ngo") {

        const ngoName =
            document.getElementById(
                "ngoName"
            )?.value.trim() || "—";


        const registration =
            document.getElementById(
                "ngoRegistration"
            )?.value.trim() || "—";


        container.textContent =
            `NGO: ${ngoName} | Registration: ${registration}`;

    }


    if (state.selectedRole === "agent") {

        const vehicle =
            document.getElementById(
                "vehicleType"
            )?.value || "—";


        const license =
            document.getElementById(
                "licenseNumber"
            )?.value.trim() || "—";


        container.textContent =
            `Vehicle: ${vehicle} | License: ${license}`;

    }

}


/* ============================================================
   REVIEW VALUE HELPER
============================================================ */

function setReviewValue(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value || "—";

    }

}


/* ============================================================
   SECURITY / TRUST VERIFICATION
   ROLE-SPECIFIC ACCOUNT CHECK
============================================================ */

async function runSecurityTrustVerification({
    firebaseUser,
    fullName,
    email,
    phoneVerified,
    role,
    roleDetails,
    location
}) {

    const baseVerification = {

        verified:
            false,

        trustScore:
            null,

        trustScorePercent:
            null,

        riskLevel:
            "pending",

        flags:
            [],

        reasons:
            [
                "Security / Trust verification has not completed yet."
            ],

        requiresHumanReview:
            true

    };


    if (
        role === "donor"
    ) {

        return {

            ...baseVerification,

            status:
                "not_required"

        };

    }


    if (!CONFIG.securityTrustEndpoint) {

        console.warn(
            "NutriCycle AI — Security / Trust Agent endpoint is not configured for this environment."
        );

        return {

            ...baseVerification,

            status:
                "pending_backend_deployment"

        };

    }


    const documentsProvided =
        [];


    if (
        role === "ngo" &&
        String(
            roleDetails?.ngoRegistration ||
            ""
        ).trim()
    ) {

        documentsProvided.push(
            "NGO Registration"
        );

    }


    if (
        role === "agent" &&
        String(
            roleDetails?.licenseNumber ||
            ""
        ).trim()
    ) {

        documentsProvided.push(
            "Driving Licence"
        );

    }


    const verificationPayload = {

        role:
            role,

        profile: {

            role:
                role,

            name:
                fullName,

            email:
                email,

            phoneVerified:
                phoneVerified === true,

            emailVerified:
                firebaseUser?.emailVerified === true,

            vehicleType:
                roleDetails?.vehicleType ||
                "",

            vehicleNumber:
                roleDetails?.vehicleNumber ||
                "",

            ngoName:
                roleDetails?.ngoName ||
                "",

            ngoRegistration:
                roleDetails?.ngoRegistration ||
                "",

            location:
                location ||
                {}

        },

        evidence: {

            documentsProvided:
                documentsProvided,

            identityVerified:
                false

        },

        history: {

            completedPickups:
                0,

            cancelledPickups:
                0,

            complaints:
                0

        }

    };


    try {

        const response =
            await fetch(
                CONFIG.securityTrustEndpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body:
                        JSON.stringify(
                            verificationPayload
                        )
                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            result?.success !== true
        ) {

            console.warn(
                "NutriCycle AI — Security / Trust Agent returned an unsuccessful response:",
                result
            );

            return {

                ...baseVerification,

                status:
                    "pending_review"

            };

        }


        const verificationStatus =
            result.verified === true
                ? "verified"
                : result.requiresHumanReview === true
                    ? "pending_review"
                    : "not_verified";


        return {

            ...baseVerification,

            verified:
                result.verified === true,

            trustScore:
                result.trustScore ??
                null,

            trustScorePercent:
                result.trustScorePercent ??
                null,

            riskLevel:
                result.riskLevel ||
                "unknown",

            flags:
                Array.isArray(result.flags)
                    ? result.flags
                    : [],

            reasons:
                Array.isArray(result.reasons)
                    ? result.reasons
                    : [],

            requiresHumanReview:
                result.requiresHumanReview === true,

            verificationVersion:
                result.verificationVersion ||
                "trust-agent-v1",

            status:
                verificationStatus

        };

    }
    catch (error) {

        console.error(
            "NutriCycle AI — Security / Trust Agent request failed:",
            error
        );

        return {

            ...baseVerification,

            status:
                "pending_review"

        };

    }

}


/* ============================================================
   SAVE SECURITY / TRUST RESULT
============================================================ */

async function saveSecurityTrustResult(
    firebaseUser,
    result
) {

    if (
        !firebaseUser?.uid ||
        !result
    ) {

        return;

    }


    try {

        await updateDoc(
            doc(
                db,
                "users",
                firebaseUser.uid
            ),
            {
                verified:
                    result.status === "verified",

                verificationStatus:
                    result.status ||
                    "pending_review",

                verificationAgent:
                    "Security / Trust Verification Agent",

                securityVerification: {

                    verified:
                        result.verified === true,

                    trustScore:
                        result.trustScore ??
                        null,

                    trustScorePercent:
                        result.trustScorePercent ??
                        null,

                    riskLevel:
                        result.riskLevel ||
                        "unknown",

                    flags:
                        result.flags ||
                        [],

                    reasons:
                        result.reasons ||
                        [],

                    requiresHumanReview:
                        result.requiresHumanReview === true,

                    verificationVersion:
                        result.verificationVersion ||
                        "trust-agent-v1",

                    evaluatedAt:
                        serverTimestamp()

                },

                updatedAt:
                    serverTimestamp()
            }
        );


        console.log(
            "NutriCycle AI — Security / Trust result saved:",
            {
                uid:
                    firebaseUser.uid,
                status:
                    result.status,
                riskLevel:
                    result.riskLevel,
                requiresHumanReview:
                    result.requiresHumanReview
            }
        );

    }
    catch (error) {

        console.error(
            "NutriCycle AI — Failed to save Security / Trust result:",
            error
        );

    }

}


/* ============================================================
   CREATE ACCOUNT
   FIREBASE REGISTRATION
============================================================ */

async function handleCreateAccount() {

    try {

        const fullName =
            document.getElementById("fullName")
                ?.value.trim() || "";

        const email =
            document.getElementById("email")
                ?.value.trim() || "";

        const password =
            document.getElementById("password")
                ?.value || "";

       const phoneNumber =
    document.getElementById(
        "phoneNumber"
    )?.value.trim() || "";


const countrySelect =
    document.getElementById(
        "countryCode"
    );


const countryIsoCode =
    countrySelect?.value || "";
    const dialCode =
    countryIsoCode
        ? `+${getCountryCallingCode(
            countryIsoCode
        )}`
        : "";
        
    const parsedPhone =
    parsePhoneNumberFromString(
        phoneNumber,
        countryIsoCode
    );


const phoneE164 =
    parsedPhone?.number || "";


const countryLabel =
    countrySelect
        ?.selectedOptions[0]
        ?.textContent
        ?.trim() || "";


const gender =
    document.getElementById(
        "gender"
    )?.value || "";


const dateOfBirth =
    document.getElementById(
        "dateOfBirth"
    )?.value || "";


const administrativeArea =
    document.getElementById(
        "administrativeArea"
    )?.value.trim() || "";


const district =
    document.getElementById(
        "district"
    )?.value.trim() || "";


const municipalityOrCity =
    document.getElementById(
        "municipalityOrCity"
    )?.value.trim() || "";


const locality =
    document.getElementById(
        "locality"
    )?.value.trim() || "";


const postalCode =
    document.getElementById(
        "postalCode"
    )?.value.trim() || "";
    const language =
    document.getElementById(
        "language"
    )?.value || "";


const currency =
    document.getElementById(
        "currency"
    )?.value || "";
    const bio =
    document.getElementById(
        "bio"
    )?.value.trim() || "";


const role =
    state.selectedRole;

   const location = {

    countryCode:
        countryIsoCode,

    countryName:
        countryLabel,

    administrativeArea:
        administrativeArea,

    district:
        district,

    municipalityOrCity:
        municipalityOrCity,

    locality:
        locality,

    postalCode:
        postalCode,

    latitude:
        null,

    longitude:
        null,

    timezone:
        ""

};

const preferences = {

    language:
        language,

    currency:
        currency,

    theme:
        "light"

};

const profile = {

    profileImage:
        "",

    bio:
        bio,

    gender:
        gender,

    dateOfBirth:
        dateOfBirth

};


        if (!fullName) {

            alert("Please enter your full name.");

            return;

        }


        if (!email) {

            alert("Please enter your email address.");

            return;

        }


        if (!password) {

            alert("Please enter your password.");

            return;

        }


        if (!role) {

            alert("Please select your role.");

            return;

        }


        /* =====================================================
           ROLE DETAILS
        ===================================================== */

        const roleDetails = {};


      if (role === "donor") {

    roleDetails.donorType =
        document.getElementById(
            "donorType"
        )?.value || "";


    roleDetails.operatingArea =
        document.getElementById(
            "donorOperatingArea"
        )?.value.trim() || "";

}


        if (role === "ngo") {

            roleDetails.ngoName =
                document.getElementById(
                    "ngoName"
                )?.value.trim() || "";

            roleDetails.ngoRegistration =
                document.getElementById(
                    "ngoRegistration"
                )?.value.trim() || "";

        }


        if (role === "agent") {

            roleDetails.vehicleType =
                document.getElementById(
                    "vehicleType"
                )?.value || "";

            roleDetails.licenseNumber =
                document.getElementById(
                    "licenseNumber"
                )?.value.trim() || "";

        }


        /* =====================================================
           CREATE FIREBASE ACCOUNT
        ===================================================== */

        const firebaseUser =
    await Auth.signup({

        name:
            fullName,

        email:
            email,

        password:
            password,


        /* ==================================================
           PHONE
        ================================================== */

       phoneE164:
    phoneE164,

phoneCountryCode:
    dialCode,

        phoneVerified:
            false,


        /* ==================================================
           PROFILE
        ================================================== */

        profile:
            profile,


        /* ==================================================
           LOCATION
        ================================================== */

        location:
            location,


        /* ==================================================
           PREFERENCES
        ================================================== */

        preferences:
            preferences,


        /* ==================================================
           ROLE
        ================================================== */

        role:
            role,

        roleDetails:
            roleDetails

    });


        if (!firebaseUser) {

            throw new Error(
                "Firebase account creation failed."
            );

        }


        /* =====================================================
           SECURITY / TRUST VERIFICATION
           Only NGO and Delivery Agent accounts
           require this verification stage.
        ===================================================== */

        const securityVerification =
            role === "donor"
                ? null
                : await runSecurityTrustVerification({

                    firebaseUser:
                        firebaseUser,

                    fullName:
                        fullName,

                    email:
                        email,

                    phoneVerified:
                        false,

                    role:
                        role,

                    roleDetails:
                        roleDetails,

                    location:
                        location

                });


        if (
            securityVerification
        ) {

            await saveSecurityTrustResult(
                firebaseUser,
                securityVerification
            );

        }


        /* =====================================================
           STORE CURRENT USER FOR DASHBOARD
        ===================================================== */

        const currentUser =
            Auth.getCurrentUser();


        if (currentUser) {

            const localVerificationUser =
                securityVerification
                    ? {

                        ...currentUser,

                        verified:
                            securityVerification.status ===
                            "verified",

                        verificationStatus:
                            securityVerification.status,

                        securityVerification:
                            securityVerification

                    }
                    : currentUser;


            localStorage.setItem(

                "nutricycle_current_user",

                JSON.stringify(
                    localVerificationUser
                )

            );

        }


        /* =====================================================
           VERIFICATION STATUS NOTICE
        ===================================================== */

        if (
            role === "ngo" ||
            role === "agent"
        ) {

            if (
                securityVerification.status ===
                "verified"
            ) {

                alert(
                    "Your account was created and Security / Trust verification completed successfully."
                );

            }

            else if (
                securityVerification
                    .requiresHumanReview ===
                true
            ) {

                alert(
                    "Your account was created. Security / Trust verification requires human review before it can be marked verified."
                );

            }

            else {

                alert(
                    "Your account was created. Security / Trust verification is currently pending."
                );

            }

        }


        /* =====================================================
           UPDATE REVIEW SUMMARY
        ===================================================== */

        const summaryName =
            document.getElementById(
                "summaryName"
            );

        const summaryRole =
            document.getElementById(
                "summaryRole"
            );

        const summaryCity =
            document.getElementById(
                "summaryCity"
            );


        if (summaryName) {

            summaryName.textContent =
                fullName;

        }


        if (summaryRole) {

            summaryRole.textContent =
                getRoleDisplayName(
                    role
                );

        }


        if (summaryCity) {

            summaryCity.textContent =
                municipalityOrCity || "—";

        }


        console.log(
            "NutriCycle AI — Firebase account created successfully.",
            currentUser
        );


        /* =====================================================
           GO TO FINAL SUCCESS SCREEN
        ===================================================== */

        showStep(5);

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Registration failed:",
            error
        );


        let message =
            "Unable to create your account.";


        if (
            error?.code ===
            "auth/email-already-in-use"
        ) {

            message =
                "An account with this email already exists.";

        }

        else if (
            error?.code ===
            "auth/invalid-email"
        ) {

            message =
                "Please enter a valid email address.";

        }

        else if (
            error?.code ===
            "auth/weak-password"
        ) {

            message =
                "Password must be at least 6 characters.";

        }

        else if (
            error?.code ===
            "auth/network-request-failed"
        ) {

            message =
                "Network error. Check your internet connection.";

        }

        else if (
            error?.message
        ) {

            message =
                error.message;

        }


        alert(message);

    }

}


/* ============================================================
   DASHBOARD
============================================================ */

function goToDashboard() {

    /* ======================================================
       RECOVER ROLE FROM FIREBASE PROFILE FIRST
    ====================================================== */

    let currentUser = null;

    try {

        currentUser =
            Auth.getCurrentUser();

    }

    catch (error) {

        console.warn(
            "NutriCycle AI — Could not read current Auth user:",
            error
        );

    }


    /* ======================================================
       FALLBACK TO SAVED USER
    ====================================================== */

    if (
        !currentUser
    ) {

        try {

            currentUser =
                JSON.parse(
                    localStorage.getItem(
                        "nutricycle_current_user"
                    ) || "null"
                );

        }

        catch (error) {

            console.warn(
                "NutriCycle AI — Saved user data could not be read:",
                error
            );

        }

    }


    /* ======================================================
       RESOLVE ROLE
    ====================================================== */

    const role =
        currentUser?.role ||
        state.selectedRole;


    console.log(
        "NutriCycle AI — Dashboard navigation:",
        {
            role:
                role,

            firebaseUser:
                !!currentUser
        }
    );


    /* ======================================================
       DASHBOARD ROUTE
    ====================================================== */

    const dashboards = {

        donor:
            "user.html",

        ngo:
            "ngo.html",

        agent:
            "agent.html"

    };


    const dashboard =
        dashboards[role];


    /* ======================================================
       SAFETY
    ====================================================== */

    if (
        !dashboard
    ) {

        console.error(
            "NutriCycle AI — Dashboard navigation failed. Role:",
            role
        );


        alert(
            "Your account was created, but the user role could not be recovered. Please check your account profile."
        );

        return;

    }


    /* ======================================================
       GO
    ====================================================== */

    window.location.assign(
        dashboard
    );

}


/* ============================================================
   LOADING SCREEN
============================================================ */

function hideLoadingScreen() {

    if (!dom.loadingScreen) {

        return;

    }


    dom.loadingScreen.classList.add(
        "hidden"
    );

}


/* ============================================================
   START APPLICATION
============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize,
        { once: true }
    );

}
else {

    initialize();

}