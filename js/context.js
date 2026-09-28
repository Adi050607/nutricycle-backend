import I18n from "./i18n.js";

"use strict";


/* ============================================================
   CONFIG
   ============================================================ */

const CONFIG = {

    homePath: "/html/home.html",

    storage: {

        locale:
            "nutricycle_locale",

        country:
            "nutricycle_country",

        currency:
            "nutricycle_currency",

        configured:
            "nutricycle_context_configured"

    },

    metadata: {

        territoryInfo:
            "https://cdn.jsdelivr.net/npm/cldr-core@48.2.0/supplemental/territoryInfo.json",

        currencyData:
            "https://cdn.jsdelivr.net/npm/cldr-core@48.2.0/supplemental/currencyData.json",

        localeManifest:
            "/locales/manifest.json"

    },

    locationApi:
        "https://api.bigdatacloud.net/data/reverse-geocode-client"

};


/* ============================================================
   STATE
   ============================================================ */

const state = {

    territoryInfo: {},

    currencyRegions: {},

    locales: [],

    countries: [],

    selectedCountry: "",

    selectedLocale: "",

    selectedCurrency: "",

    locationDetected: false

};


/* ============================================================
   DOM
   ============================================================ */

const dom = {

    countrySearch:
        document.getElementById(
            "countrySearch"
        ),

    countryResults:
        document.getElementById(
            "countryResults"
        ),

    countryClear:
        document.getElementById(
            "countryClear"
        ),

    countrySelect:
        document.getElementById(
            "countrySelect"
        ),

    countryHint:
        document.getElementById(
            "countryHint"
        ),

    languageSelect:
        document.getElementById(
            "languageSelect"
        ),

    currencySelect:
        document.getElementById(
            "currencySelect"
        ),

    continueButton:
        document.getElementById(
            "continueButton"
        ),

    error:
        document.getElementById(
            "contextError"
        ),

    detectedLocation:
        document.getElementById(
            "detectedLocation"
        ),

    detectedText:
        document.getElementById(
            "detectedText"
        )

};


/* ============================================================
   ERROR
   ============================================================ */

function showError(
    message = ""
) {

    if (!dom.error) {
        return;
    }

    dom.error.textContent =
        message;

    dom.error.classList.toggle(
        "visible",
        Boolean(message)
    );

}


/* ============================================================
   STORAGE
   ============================================================ */

function getStored(
    key
) {

    try {

        return (
            localStorage.getItem(key)
            || ""
        );

    }

    catch {

        return "";

    }

}


function setStored(
    key,
    value
) {

    try {

        localStorage.setItem(
            key,
            value
        );

    }

    catch (error) {

        console.warn(
            "NutriCycle AI — localStorage unavailable:",
            error
        );

    }

}


/* ============================================================
   FETCH
   ============================================================ */

async function fetchJson(
    url
) {

    const response =
        await fetch(
            url,
            {
                cache: "no-cache"
            }
        );


    if (!response.ok) {

        throw new Error(
            `${response.status} ${response.statusText}`
        );

    }


    return response.json();

}


/* ============================================================
   LOAD METADATA
   ============================================================ */

async function loadMetadata() {

    const [

        territoryData,

        currencyData,

        manifest

    ] = await Promise.all([

        fetchJson(
            CONFIG.metadata.territoryInfo
        ),

        fetchJson(
            CONFIG.metadata.currencyData
        ),

        fetchJson(
            CONFIG.metadata.localeManifest
        )

    ]);


    state.territoryInfo =
        territoryData
            ?.supplemental
            ?.territoryInfo
        || {};


    state.currencyRegions =
        currencyData
            ?.supplemental
            ?.currencyData
            ?.region
        || {};


    state.locales =
        Array.isArray(
            manifest?.locales
        )
            ? manifest.locales
            : [];

}


/* ============================================================
   COUNTRY FLAG
   ============================================================ */

function countryFlag(
    countryCode
) {

    if (
        !countryCode ||
        countryCode.length !== 2
    ) {

        return "🌍";

    }


    return countryCode
        .toUpperCase()
        .split("")
        .map(
            character =>
                String.fromCodePoint(
                    127397 +
                    character.charCodeAt(0)
                )
        )
        .join("");

}


/* ============================================================
   COUNTRY CATALOG
   ============================================================ */

function buildCountries() {

    const displayNames =
        new Intl.DisplayNames(
            ["en"],
            {
                type: "region"
            }
        );


    state.countries =
        Object.keys(
            state.territoryInfo
        )

        .filter(
            code =>
                /^[A-Z]{2}$/.test(code)
        )

        .map(
            code => ({

                code,

                name:
                    displayNames.of(code)
                    || code,

                flag:
                    countryFlag(code)

            })
        )

        .sort(
            (a, b) =>
                a.name.localeCompare(
                    b.name
                )
        );

}


/* ============================================================
   COUNTRY RESULT RENDERING
   ============================================================ */

function renderCountries(
    countries
) {

    if (!dom.countryResults) {
        return;
    }


    dom.countryResults.innerHTML =
        "";


    if (!countries.length) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "country-no-results";


        empty.textContent =
            "No countries or regions found.";


        dom.countryResults.appendChild(
            empty
        );


        return;

    }


    const fragment =
        document.createDocumentFragment();


    countries.forEach(
        country => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "country-result";


            button.setAttribute(
                "role",
                "option"
            );


            button.dataset.countryCode =
                country.code;


            const flag =
                document.createElement(
                    "span"
                );


            flag.className =
                "country-result-flag";


            flag.textContent =
                country.flag;


            const name =
                document.createElement(
                    "span"
                );


            name.className =
                "country-result-name";


            name.textContent =
                country.name;


            button.appendChild(
                flag
            );


            button.appendChild(
                name
            );


            button.addEventListener(
                "click",
                () => {

                    selectCountry(
                        country
                    );

                }
            );


            fragment.appendChild(
                button
            );

        }
    );


    dom.countryResults.appendChild(
        fragment
    );

}


/* ============================================================
   COUNTRY SEARCH
   ============================================================ */

function searchCountries(
    query
) {

    const normalized =
        query
            .trim()
            .toLocaleLowerCase();


    if (!normalized) {

        renderCountries(
            state.countries
        );

        return;

    }


    const matches =
        state.countries.filter(
            country =>
                country.name
                    .toLocaleLowerCase()
                    .includes(
                        normalized
                    )
        );


    renderCountries(
        matches
    );

}


/* ============================================================
   COUNTRY DROPDOWN
   ============================================================ */

function openCountryDropdown() {

    searchCountries(
        dom.countrySearch.value
    );


    dom.countryResults.hidden =
        false;


    dom.countrySearch.setAttribute(
        "aria-expanded",
        "true"
    );

}


function closeCountryDropdown() {

    dom.countryResults.hidden =
        true;


    dom.countrySearch.setAttribute(
        "aria-expanded",
        "false"
    );

}


/* ============================================================
   COUNTRY SELECTION
   ============================================================ */

function selectCountry(
    country
) {

    if (!country) {
        return;
    }


    state.selectedCountry =
        country.code;


    dom.countrySelect.value =
        country.code;


    dom.countrySearch.value =
        `${country.flag} ${country.name}`;


    dom.countryHint.textContent =
        country.name;


    dom.countryClear.hidden =
        false;


    applyCountryDefaults(
        country.code
    );


    closeCountryDropdown();

}


/* ============================================================
   LANGUAGE RECOMMENDATION
   ============================================================ */

function recommendLanguage(
    countryCode
) {

    const population =
        state
            .territoryInfo[
                countryCode
            ]
            ?.languagePopulation;


    if (!population) {
        return "";
    }


    const available =
        new Set(
            state.locales.map(
                locale =>
                    locale.code
            )
        );


    const candidates =
        Object.entries(
            population
        )

        .map(
            ([code, info]) => {

                const baseCode =
                    code.split("_")[0];


                let officialRank = 0;


                if (
                    info?._officialStatus ===
                    "official"
                ) {

                    officialRank = 2;

                }

                else if (
                    info?._officialStatus ===
                    "official_regional"
                ) {

                    officialRank = 1;

                }


                return {

                    exactCode:
                        code,

                    baseCode,

                    population:
                        Number(
                            info?._populationPercent
                            || 0
                        ),

                    officialRank

                };

            }
        )

        .filter(
            candidate =>
                candidate.baseCode !== "und"
        )

        .sort(
            (a, b) => {

                if (
                    b.officialRank !==
                    a.officialRank
                ) {

                    return (
                        b.officialRank -
                        a.officialRank
                    );

                }


                return (
                    b.population -
                    a.population
                );

            }
        );


    for (
        const candidate of candidates
    ) {

        if (
            available.has(
                candidate.exactCode
            )
        ) {

            return candidate.exactCode;

        }


        if (
            available.has(
                candidate.baseCode
            )
        ) {

            return candidate.baseCode;

        }

    }


    /*
       English fallback only when English actually
       exists in NutriCycle's manifest.
    */

    if (
        available.has("en")
    ) {

        return "en";

    }


    return "";

}


/* ============================================================
   CURRENCY RECOMMENDATION
   ============================================================ */

function recommendCurrency(
    countryCode
) {

    const regions =
        state.currencyRegions[
            countryCode
        ];


    if (
        !Array.isArray(regions)
    ) {

        return "";

    }


    for (
        const regionEntry of regions
    ) {

        for (
            const [code, info]
            of Object.entries(
                regionEntry
            )
        ) {

            if (
                info?._tender ===
                "false"
            ) {

                continue;

            }


            if (
                info?._to
            ) {

                continue;

            }


            return code;

        }

    }


    return "";

}


/* ============================================================
   APPLY COUNTRY DEFAULTS
   ============================================================ */

function applyCountryDefaults(
    countryCode
) {

    state.selectedCountry =
        countryCode;


    const locale =
        recommendLanguage(
            countryCode
        );


    if (
        locale &&
        Array.from(
            dom.languageSelect.options
        )
        .some(
            option =>
                option.value === locale
        )
    ) {

        dom.languageSelect.value =
            locale;

        state.selectedLocale =
            locale;

    }


    const currency =
        recommendCurrency(
            countryCode
        );


    if (
        currency &&
        Array.from(
            dom.currencySelect.options
        )
        .some(
            option =>
                option.value === currency
        )
    ) {

        dom.currencySelect.value =
            currency;

        state.selectedCurrency =
            currency;

    }

}


/* ============================================================
   LANGUAGE CATALOG
   ============================================================ */

function populateLanguages() {

    dom.languageSelect.innerHTML =
        "";


    const placeholder =
        document.createElement(
            "option"
        );


    placeholder.value =
        "";


    placeholder.textContent =
        "Select Language";


    placeholder.disabled =
        true;


    placeholder.selected =
        true;


    dom.languageSelect.appendChild(
        placeholder
    );


    state.locales
        .slice()
        .sort(
            (a, b) =>
                (
                    a.nativeName
                    || a.name
                    || a.code
                )
                .localeCompare(
                    a.nativeName
                    || a.name
                    || a.code
                )
        )
        .forEach(
            locale => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    locale.code;


                option.textContent =
                    locale.nativeName
                    || locale.name
                    || locale.code;


                dom.languageSelect.appendChild(
                    option
                );

            }
        );

}


/* ============================================================
   CURRENCY CATALOG
   ============================================================ */

function populateCurrencies() {

    dom.currencySelect.innerHTML =
        "";


    const placeholder =
        document.createElement(
            "option"
        );


    placeholder.value =
        "";


    placeholder.textContent =
        "Select Currency";


    placeholder.disabled =
        true;


    placeholder.selected =
        true;


    dom.currencySelect.appendChild(
        placeholder
    );


    let currencies = [];


    try {

        currencies =
            Intl.supportedValuesOf(
                "currency"
            );

    }

    catch {

        console.warn(
            "NutriCycle AI — Currency enumeration unavailable."
        );

    }


    let displayNames;


    try {

        displayNames =
            new Intl.DisplayNames(
                ["en"],
                {
                    type: "currency"
                }
            );

    }

    catch {

        displayNames = null;

    }


    currencies
        .sort()
        .forEach(
            code => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    code;


                const name =
                    displayNames?.of(code)
                    || code;


                option.textContent =
                    `${code} — ${name}`;


                dom.currencySelect.appendChild(
                    option
                );

            }
        );

}


/* ============================================================
   LOCATION DETECTION
   ============================================================ */

async function detectCurrentLocation() {

    if (
        !navigator.geolocation
    ) {

        return null;

    }


    return new Promise(
        resolve => {

            navigator.geolocation.getCurrentPosition(

                async position => {

                    const latitude =
                        position.coords.latitude;


                    const longitude =
                        position.coords.longitude;


                    try {

                        const url =
                            `${CONFIG.locationApi}` +
                            `?latitude=${encodeURIComponent(latitude)}` +
                            `&longitude=${encodeURIComponent(longitude)}` +
                            `&localityLanguage=en`;


                        const response =
                            await fetch(
                                url
                            );


                        if (!response.ok) {

                            resolve(null);

                            return;

                        }


                        const data =
                            await response.json();


                        resolve({

                            countryCode:
                                data.countryCode
                                || "",

                            countryName:
                                data.countryName
                                || "",

                            state:
                                data.principalSubdivision
                                || "",

                            city:
                                data.city
                                ||
                                data.locality
                                ||
                                ""

                        });

                    }

                    catch {

                        resolve(null);

                    }

                },

                () => {

                    /*
                       Permission denied or location unavailable.
                       This must never break the gateway.
                    */

                    resolve(null);

                },

                {

                    enableHighAccuracy:
                        false,

                    timeout:
                        8000,

                    maximumAge:
                        300000

                }

            );

        }
    );

}


/* ============================================================
   LOCATION DISPLAY
   ============================================================ */

function displayDetectedLocation(
    location
) {

    if (!location) {
        return;
    }


    const parts = [

        location.city,

        location.state,

        location.countryName

    ]
        .filter(Boolean);


    if (!parts.length) {
        return;
    }


    dom.detectedText.textContent =
        parts.join(", ");


    dom.detectedLocation.hidden =
        false;

}


/* ============================================================
   RESTORE SAVED CONTEXT
   ============================================================ */

function restoreContext() {

    const savedCountry =
        getStored(
            CONFIG.storage.country
        );


    const savedLocale =
        getStored(
            CONFIG.storage.locale
        );


    const savedCurrency =
        getStored(
            CONFIG.storage.currency
        );


    if (savedCountry) {

        const country =
            state.countries.find(
                item =>
                    item.code ===
                    savedCountry
            );


        if (country) {

            selectCountry(
                country
            );

        }

    }


    if (
        savedLocale &&
        Array.from(
            dom.languageSelect.options
        )
        .some(
            option =>
                option.value ===
                savedLocale
        )
    ) {

        dom.languageSelect.value =
            savedLocale;

        state.selectedLocale =
            savedLocale;

    }


    if (
        savedCurrency &&
        Array.from(
            dom.currencySelect.options
        )
        .some(
            option =>
                option.value ===
                savedCurrency
        )
    ) {

        dom.currencySelect.value =
            savedCurrency;

        state.selectedCurrency =
            savedCurrency;

    }

}


/* ============================================================
   EVENTS
   ============================================================ */

function initializeEvents() {

    /* COUNTRY FOCUS */

    dom.countrySearch.addEventListener(
        "focus",
        () => {

            openCountryDropdown();

        }
    );


    /* COUNTRY CLICK */

    dom.countrySearch.addEventListener(
        "click",
        () => {

            openCountryDropdown();

        }
    );


    /* COUNTRY INPUT */

    dom.countrySearch.addEventListener(
        "input",
        () => {

            /*
               A manually typed value is not a valid country
               selection until the user selects a result.
            */

            state.selectedCountry =
                "";

            dom.countrySelect.value =
                "";


            dom.countryClear.hidden =
                !dom.countrySearch.value;


            searchCountries(
                dom.countrySearch.value
            );


            openCountryDropdown();

        }
    );


    /* ESCAPE */

    dom.countrySearch.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeCountryDropdown();

            }

        }
    );


    /* CLEAR */

    dom.countryClear.addEventListener(
        "click",
        event => {

            event.preventDefault();
            event.stopPropagation();


            dom.countrySearch.value =
                "";

            dom.countrySelect.value =
                "";

            dom.countryHint.textContent =
                "";


            state.selectedCountry =
                "";


            dom.countryClear.hidden =
                true;


            openCountryDropdown();


            dom.countrySearch.focus();

        }
    );


    /* OUTSIDE CLICK */

    document.addEventListener(
        "click",
        event => {

            const wrapper =
                document.querySelector(
                    ".country-search-wrapper"
                );


            if (
                wrapper &&
                !wrapper.contains(
                    event.target
                )
            ) {

                closeCountryDropdown();

            }

        }
    );


    /* LANGUAGE */

    dom.languageSelect.addEventListener(
        "change",
        () => {

            state.selectedLocale =
                dom.languageSelect.value;

        }
    );


    /* CURRENCY */

    dom.currencySelect.addEventListener(
        "change",
        () => {

            state.selectedCurrency =
                dom.currencySelect.value;

        }
    );


    /* CONTINUE */

    dom.continueButton.addEventListener(
        "click",
        continueContext
    );

}


/* ============================================================
   CONTINUE
   ============================================================ */

async function continueContext() {

    showError();


    const country =
        dom.countrySelect.value;


    const locale =
        dom.languageSelect.value;


    const currency =
        dom.currencySelect.value;


    if (!country) {

        showError(
            "Please select your country or region."
        );

        dom.countrySearch.focus();

        openCountryDropdown();

        return;

    }


    if (!locale) {

        showError(
            "Please select your language."
        );

        return;

    }


    if (!currency) {

        showError(
            "Please select your currency."
        );

        return;

    }


    dom.continueButton.disabled =
        true;


    try {

        await I18n.setLocale(
            locale
        );


        setStored(
            CONFIG.storage.country,
            country
        );


        setStored(
            CONFIG.storage.locale,
            locale
        );


        setStored(
            CONFIG.storage.currency,
            currency
        );


        setStored(
            CONFIG.storage.configured,
            "true"
        );


        window.location.assign(
            CONFIG.homePath
        );

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Context save failed:",
            error
        );


        showError(
            "We could not save your preferences. Please try again."
        );


        dom.continueButton.disabled =
            false;

    }

}


/* ============================================================
   INITIALIZATION
   ============================================================ */

async function initialize() {

    try {

        /*
           The page and event handlers are already available.
           Load metadata first because the country catalog depends
           on CLDR data.
        */

        await I18n.initialize();

        await loadMetadata();


        buildCountries();

        populateLanguages();

        populateCurrencies();


        /*
           Attach events immediately after the catalogs exist.
        */

        initializeEvents();


        /*
           Restore an explicitly configured context.
        */

        const configured =
            getStored(
                CONFIG.storage.configured
            );


        if (
            configured === "true" &&
            getStored(
                CONFIG.storage.country
            )
        ) {

            restoreContext();

        }

        else {

            /*
               Location detection is deliberately detached
               from the main initialization flow.
            */

            detectCurrentLocation()
                .then(
                    location => {

                        if (!location) {
                            return;
                        }


                        state.locationDetected =
                            true;


                        displayDetectedLocation(
                            location
                        );


                        /*
                           Location is only a recommendation.
                           User remains free to change it.
                        */

                        if (
                            !state.selectedCountry &&
                            location.countryCode
                        ) {

                            const country =
                                state.countries.find(
                                    item =>
                                        item.code ===
                                        location.countryCode
                                );


                            if (country) {

                                selectCountry(
                                    country
                                );

                            }

                        }

                    }
                );

        }


        console.log(
            "NutriCycle AI — Global Context Gateway Ready"
        );

    }

    catch (error) {

        console.error(
            "NutriCycle AI — Gateway initialization failed:",
            error
        );


        showError(
            "We could not load the global settings. Please refresh the page."
        );

    }

}


/* ============================================================
   START
   ============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initialize,
        {
            once: true
        }
    );

}

else {

    initialize();

}