import I18n from "./i18n.js";

"use strict";

/* ============================================================
   NutriCycle AI
   GLOBAL CONTEXT GATEWAY
   CLDR-backed country / language / currency selection
   ============================================================ */

const CONFIG = Object.freeze({

    storage: Object.freeze({
        locale:
            "nutricycle_locale",

        country:
            "nutricycle_country",

        currency:
            "nutricycle_currency",

        configured:
            "nutricycle_context_configured"
    }),

    homePath:
        "/html/home.html",

    metadata: Object.freeze({

        territoryInfo:
            "https://cdn.jsdelivr.net/npm/cldr-core@48.2.0/supplemental/territoryInfo.json",

        currencyData:
            "https://cdn.jsdelivr.net/npm/cldr-core@48.2.0/supplemental/currencyData.json",

        languageNames:
            "https://cdn.jsdelivr.net/npm/cldr-localenames-full@48.2.0/main/en/languages.json",

        localeManifest:
            "/locales/manifest.json"

    })

});


/* ============================================================
   STATE
============================================================ */

const state = {

    metadata:
        null,

    translationLocales:
        [],

    languageCatalog:
        [],

    locales:
        [],

    countryCatalog:
        [],

    selectedCountry:
        "",

    selectedLocale:
        "",

    selectedCurrency:
        "",

    initialized:
        false

};


/* ============================================================
   DOM
============================================================ */

const dom = {

    countrySelect:
        null,

    countrySearch:
        null,

    countryResults:
        null,

    countryClear:
        null,

    languageSelect:
        null,

    languageSearch:
        null,

    languageResults:
        null,

    languageClear:
        null,

    currencySelect:
        null,

    continueButton:
        null,

    error:
        null,

    detectedLocation:
        null,

    detectedText:
        null,

    countryHint:
        null

};


/* ============================================================
   DOM CACHE
============================================================ */

function cacheDOM() {

    const ids = {

        countrySelect:
            "countrySelect",

        countrySearch:
            "countrySearch",

        countryResults:
            "countryResults",

        countryClear:
            "countryClear",

        languageSelect:
            "languageSelect",

        languageSearch:
            "languageSearch",

        languageResults:
            "languageResults",

        languageClear:
            "languageClear",

        currencySelect:
            "currencySelect",

        continueButton:
            "continueButton",

        error:
            "contextError",

        detectedLocation:
            "detectedLocation",

        detectedText:
            "detectedText",

        countryHint:
            "countryHint"

    };


    Object.entries(
        ids
    ).forEach(
        (
            [
                key,
                id
            ]
        ) => {

            dom[key] =
                document.getElementById(
                    id
                );

        }
    );

}


/* ============================================================
   ERROR
============================================================ */

function showError(
    message = ""
) {

    if (
        !dom.error
    ) {

        return;

    }


    dom.error.textContent =
        message;


    dom.error.classList.toggle(
        "visible",
        Boolean(
            message
        )
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
            localStorage.getItem(
                key
            ) ||
            ""
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

    catch (
        error
    ) {

        console.warn(
            "NutriCycle AI — Unable to persist context:",
            error
        );

    }

}


/* ============================================================
   JSON FETCH
============================================================ */

async function fetchJson(
    url
) {

    const response =
        await fetch(
            url,
            {
                cache:
                    "no-cache"
            }
        );


    if (
        !response.ok
    ) {

        throw new Error(
            `Request failed: ${response.status}`
        );

    }


    return response.json();

}


/* ============================================================
   LOCALE NORMALIZATION
============================================================ */

function normalizeLocaleCode(
    locale
) {

    if (
        !locale ||
        typeof locale !==
            "string"
    ) {

        return "";

    }


    try {

        return (
            Intl
                .getCanonicalLocales(
                    locale
                )[0] ||
            ""
        );

    }

    catch {

        return "";

    }

}


/* ============================================================
   LANGUAGE CODE NORMALIZATION
============================================================ */

function normalizeLanguageCode(
    code
) {

    if (
        !code ||
        typeof code !==
            "string"
    ) {

        return "";

    }


    const cleaned =
        code
            .trim()
            .replace(
                /_/g,
                "-"
            );


    try {

        const canonical =
            Intl
                .getCanonicalLocales(
                    cleaned
                )[0];


        const locale =
            new Intl.Locale(
                canonical
            );


        const language =
            locale.language ||
            "";


        if (
            !language
        ) {

            return "";

        }


        const script =
            locale.script ||
            "";


        if (
            script
        ) {

            return (
                `${language}-${script}`
            );

        }


        return language;

    }

    catch {

        return (
            /^[a-z]{2,3}$/i.test(
                cleaned
            )
                ? cleaned.toLowerCase()
                : ""
        );

    }

}


/* ============================================================
   DIRECTION
   No hardcoded RTL language list.
============================================================ */

function getDirection(
    localeCode
) {

    try {

        if (
            typeof I18n.getDirection ===
                "function"
        ) {

            const direction =
                I18n.getDirection(
                    localeCode
                );


            if (
                direction === "ltr" ||
                direction === "rtl"
            ) {

                return direction;

            }

        }

    }

    catch {

        /* Continue to platform CLDR data. */

    }


    try {

        const locale =
            new Intl.Locale(
                localeCode
            );


        const direction =
            locale.textInfo
                ?.direction;


        if (
            direction === "ltr" ||
            direction === "rtl"
        ) {

            return direction;

        }

    }

    catch {

        /* Generic fallback below. */

    }


    return "ltr";

}


/* ============================================================
   COUNTRY FLAG
============================================================ */

function getCountryFlag(
    countryCode
) {

    if (
        !/^[A-Z]{2}$/.test(
            countryCode ||
            ""
        )
    ) {

        return "🌍";

    }


    return countryCode
        .split("")
        .map(
            character =>
                String.fromCodePoint(
                    127397 +
                    character.charCodeAt(
                        0
                    )
                )
        )
        .join("");

}


/* ============================================================
   LANGUAGE NAMES
============================================================ */

function getEnglishLanguageName(
    code,
    rawCode,
    rawName
) {

    const cldrName =
        typeof rawName ===
            "string"
            ? rawName.trim()
            : "";


    if (
        cldrName &&
        cldrName
            .toLocaleLowerCase() !==
            String(
                rawCode
            )
                .trim()
                .toLocaleLowerCase()
    ) {

        return cldrName;

    }


    const direct =
        state.metadata
            ?.languageNames
            ?.[
                code
            ];


    if (
        typeof direct ===
            "string" &&
        direct.trim() &&
        direct
            .trim()
            .toLocaleLowerCase() !==
            code
                .toLocaleLowerCase()
    ) {

        return direct.trim();

    }


    try {

        if (
            typeof Intl.DisplayNames ===
                "function"
        ) {

            const result =
                new Intl.DisplayNames(
                    [
                        "en"
                    ],
                    {
                        type:
                            "language"
                    }
                )
                    .of(
                        code
                    );


            if (
                result &&
                result
                    .toLocaleLowerCase() !==
                    code
                        .toLocaleLowerCase()
            ) {

                return result;

            }

        }

    }

    catch {

        /* Continue to code fallback. */

    }


    return code;

}


function getNativeLanguageName(
    code,
    englishName
) {

    try {

        if (
            typeof Intl.DisplayNames ===
                "function"
        ) {

            const result =
                new Intl.DisplayNames(
                    [
                        code
                    ],
                    {
                        type:
                            "language",

                        fallback:
                            "code"
                    }
                )
                    .of(
                        code
                    );


            if (
                result &&
                result
                    .toLocaleLowerCase() !==
                    code
                        .toLocaleLowerCase()
            ) {

                return result;

            }

        }

    }

    catch {

        /* Continue to CLDR English name. */

    }


    return (
        englishName ||
        code
    );

}


function getLanguageOptionLabel(
    language
) {

    if (
        !language
    ) {

        return "";

    }


    const nativeName =
        language
            .nativeName ||
        "";


    const englishName =
        language
            .name ||
        "";


    if (
        nativeName &&
        englishName &&
        nativeName
            .toLocaleLowerCase() !==
            englishName
                .toLocaleLowerCase()
    ) {

        return (
            `${nativeName} — ${englishName}`
        );

    }


    return (
        nativeName ||
        englishName ||
        language.code ||
        ""
    );

}


/* ============================================================
   LANGUAGE CATALOG
   CLDR is the source of the catalog.
============================================================ */

function buildLanguageCatalog() {

    const languageNames =
        state.metadata
            ?.languageNames ||
        {};


    const catalog =
        [];


    const seen =
        new Set();


    Object.entries(
        languageNames
    ).forEach(
        (
            [
                rawCode,
                rawName
            ]
        ) => {

            const code =
                normalizeLanguageCode(
                    rawCode
                );


            if (
                !code ||
                seen.has(
                    code
                )
            ) {

                return;

            }


            const baseLanguage =
                code
                    .split(
                        "-"
                    )[0] ||
                "";


            if (
                !/^[a-z]{2,3}$/i.test(
                    baseLanguage
                )
            ) {

                return;

            }


            const englishName =
                getEnglishLanguageName(
                    code,
                    rawCode,
                    rawName
                );


            const nativeName =
                getNativeLanguageName(
                    code,
                    englishName
                );


            catalog.push({

                code:

                    code,

                language:

                    baseLanguage
                        .toLowerCase(),

                name:

                    englishName,

                nativeName:

                    nativeName,

                direction:

                    getDirection(
                        code
                    ),

                translationAvailable:

                    state
                        .translationLocales
                        .some(
                            item =>
                                normalizeLocaleCode(
                                    item?.code
                                ) ===
                                normalizeLocaleCode(
                                    code
                                )
                        )

            });


            seen.add(
                code
            );

        }
    );


    catalog.sort(
        (
            first,
            second
        ) =>
            (
                first.nativeName ||
                first.name ||
                first.code
            ).localeCompare(
                second.nativeName ||
                second.name ||
                second.code,
                I18n.getLocale?.() ||
                    "en"
            )
    );


    state.languageCatalog =
        catalog;


    state.locales =
        catalog.map(
            entry => ({
                code:
                    entry.code,

                name:
                    entry.name,

                nativeName:
                    entry.nativeName,

                direction:
                    entry.direction,

                translationAvailable:
                    entry.translationAvailable
            })
        );


    return catalog;

}


/* ============================================================
   METADATA
============================================================ */

async function loadMetadata() {

    const [
        territoryData,
        currencyData,
        languageData,
        manifest
    ] = await Promise.all([

        fetchJson(
            CONFIG.metadata
                .territoryInfo
        ),

        fetchJson(
            CONFIG.metadata
                .currencyData
        ),

        fetchJson(
            CONFIG.metadata
                .languageNames
        ),

        fetchJson(
            CONFIG.metadata
                .localeManifest
        )

    ]);


    state.metadata = {

        territoryInfo:

            territoryData
                ?.supplemental
                ?.territoryInfo ||
            {},

        currencyRegions:

            currencyData
                ?.supplemental
                ?.currencyData
                ?.region ||
            {},

        languageNames:

            languageData
                ?.main
                ?.en
                ?.localeDisplayNames
                ?.languages ||
            {}

    };


    state.translationLocales =
        Array.isArray(
            manifest
                ?.locales
        )
            ? manifest.locales
            : [];


    buildLanguageCatalog();

}


/* ============================================================
   SEARCH STYLES
============================================================ */

function injectSearchStyles() {

    if (
        document.getElementById(
            "nutricycle-context-search-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "nutricycle-context-search-styles";


    style.textContent = `

        .context-search-wrapper {
            position: relative;
            width: 100%;
        }

        .context-search {
            width: 100%;
            min-height: 56px;
            border: 1px solid #d8e3dc;
            border-radius: 14px;
            background: #ffffff;
            color: #162b20;
            padding: 0 52px 0 48px;
            font-family: inherit;
            font-size: 16px;
            outline: none;
            box-sizing: border-box;
        }

        .context-search:focus {
            border-color: #16a34a;
            box-shadow:
                0 0 0 4px
                rgba(
                    22,
                    163,
                    74,
                    0.10
                );
        }

        .context-search-icon {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: #6b7280;
            pointer-events: none;
            z-index: 2;
        }

        .context-search-clear {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 36px;
            height: 36px;
            border: 0;
            border-radius: 10px;
            background: transparent;
            color: #6b7280;
            cursor: pointer;
            z-index: 3;
        }

        .context-search-clear:hover {
            background: #f3f4f6;
            color: #111827;
        }

        .context-search-results {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            max-height: 320px;
            overflow-y: auto;
            background: #ffffff;
            border: 1px solid #d8e3dc;
            border-radius: 14px;
            box-shadow:
                0 16px 35px
                rgba(
                    13,
                    74,
                    42,
                    0.12
                ),
                0 4px 12px
                rgba(
                    13,
                    74,
                    42,
                    0.06
                );
            z-index: 9999;
        }

        .context-search-result {
            width: 100%;
            min-height: 48px;
            border: 0;
            background: #ffffff;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            text-align: left;
            color: #162b20;
            font-family: inherit;
            font-size: 14px;
            cursor: pointer;
            box-sizing: border-box;
        }

        .context-search-result:hover,
        .context-search-result:focus {
            background: #f0fdf4;
            outline: none;
        }

        .context-search-result-icon {
            width: 30px;
            flex: 0 0 30px;
            text-align: center;
            font-size: 18px;
        }

        .context-search-result-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .context-search-result-code {
            margin-left: auto;
            color: #64748b;
            font-size: 12px;
            flex: 0 0 auto;
        }

        .context-search-no-results {
            padding: 16px;
            color: #64748b;
            font-size: 13px;
            text-align: center;
        }

        .context-search-native-select {
            display: none !important;
        }

    `;


    document.head.appendChild(
        style
    );

}


/* ============================================================
   SEARCH CONTROL BUILDER
============================================================ */

function buildSearchControl({
    select,
    inputId,
    resultsId,
    clearId,
    placeholder,
    iconClass
}) {

    if (
        !select ||
        !select.parentNode
    ) {

        return null;

    }


    let input =
        document.getElementById(
            inputId
        );


    let results =
        document.getElementById(
            resultsId
        );


    let clear =
        document.getElementById(
            clearId
        );


    let wrapper =
        input?.closest(
            ".context-search-wrapper"
        ) ||
        results?.closest(
            ".context-search-wrapper"
        ) ||
        null;


    if (
        !wrapper
    ) {

        wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "context-search-wrapper";


        select.parentNode.insertBefore(
            wrapper,
            select
        );

    }


    if (
        !input
    ) {

        const icon =
            document.createElement(
                "i"
            );


        icon.className =
            `${iconClass} context-search-icon`;


        wrapper.appendChild(
            icon
        );


        input =
            document.createElement(
                "input"
            );


        input.id =
            inputId;


        input.type =
            "text";


        input.className =
            "context-search";


        input.autocomplete =
            "off";


        input.placeholder =
            placeholder;


        input.setAttribute(
            "role",
            "combobox"
        );


        input.setAttribute(
            "aria-autocomplete",
            "list"
        );


        input.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    input.classList.add(
        "context-search"
    );


    if (
        !input.placeholder
    ) {

        input.placeholder =
            placeholder;

    }


    if (
        !wrapper.contains(
            input
        )
    ) {

        wrapper.appendChild(
            input
        );

    }


    if (
        !clear
    ) {

        clear =
            document.createElement(
                "button"
            );


        clear.type =
            "button";


        clear.id =
            clearId;


        clear.className =
            "context-search-clear";


        clear.hidden =
            true;


        clear.innerHTML =
            '<i class="fa-solid fa-xmark"></i>';


        clear.setAttribute(
            "aria-label",
            "Clear selection"
        );

    }


    clear.classList.add(
        "context-search-clear"
    );


    if (
        !wrapper.contains(
            clear
        )
    ) {

        wrapper.appendChild(
            clear
        );

    }


    if (
        !results
    ) {

        results =
            document.createElement(
                "div"
            );


        results.id =
            resultsId;


        results.className =
            "context-search-results";


        results.hidden =
            true;


        results.setAttribute(
            "role",
            "listbox"
        );

    }


    results.classList.add(
        "context-search-results"
    );


    if (
        !wrapper.contains(
            results
        )
    ) {

        wrapper.appendChild(
            results
        );

    }


    /*
       Only actual native SELECT controls
       are hidden here.

       countrySelect is an INPUT and remains
       the internal country value.
    */

    if (
        select.tagName ===
            "SELECT"
    ) {

        select.classList.add(
            "context-search-native-select"
        );

    }


    const label =
        document.querySelector(
            `label[for="${select.id}"]`
        );


    if (
        label
    ) {

        label.setAttribute(
            "for",
            inputId
        );

    }


    return {

        input,

        results,

        clear

    };

}


/* ============================================================
   SEARCH RESULTS
============================================================ */

function renderResults(
    container,
    items,
    type
) {

    if (
        !container
    ) {

        return;

    }


    container.innerHTML =
        "";


    if (
        !items.length
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "context-search-no-results";


        empty.textContent =
            type ===
                "country"
                ? "No countries or regions found."
                : "No languages found.";


        container.appendChild(
            empty
        );


        return;

    }


    items.forEach(
        item => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "context-search-result";


            button.setAttribute(
                "role",
                "option"
            );


            button.addEventListener(
                "mousedown",
                event => {

                    event.preventDefault();

                }
            );


            const icon =
                document.createElement(
                    "span"
                );


            icon.className =
                "context-search-result-icon";


            icon.textContent =
                type ===
                    "country"
                    ? item.flag
                    : "A";


            const name =
                document.createElement(
                    "span"
                );


            name.className =
                "context-search-result-name";


            name.textContent =
                type ===
                    "country"
                    ? item.name
                    : getLanguageOptionLabel(
                        item
                    );


            const code =
                document.createElement(
                    "span"
                );


            code.className =
                "context-search-result-code";


            code.textContent =
                item.code;


            button.append(
                icon,
                name,
                code
            );


            button.addEventListener(
                "click",
                () => {

                    if (
                        type ===
                            "country"
                    ) {

                        selectCountry(
                            item
                        );

                    }

                    else {

                        selectLanguage(
                            item
                        );

                    }

                }
            );


            container.appendChild(
                button
            );

        }
    );

}


/* ============================================================
   COUNTRY CATALOG
============================================================ */

function getCountryCatalog() {

    if (
        state.countryCatalog.length
    ) {

        return state.countryCatalog;

    }


    let regionNames =
        null;


    try {

        regionNames =
            new Intl.DisplayNames(
                [
                    "en"
                ],
                {
                    type:
                        "region"
                }
            );

    }

    catch {

        regionNames =
            null;

    }


    state.countryCatalog =
        Object.keys(
            state.metadata
                ?.territoryInfo ||
            {}
        )
        .filter(
            code =>
                /^[A-Z]{2}$/.test(
                    code
                )
        )
        .map(
            code => ({

                code:

                    code,

                name:

                    regionNames?.of(
                        code
                    ) ||
                    code,

                flag:

                    getCountryFlag(
                        code
                    )

            })
        )
        .sort(
            (
                first,
                second
            ) =>
                first.name.localeCompare(
                    second.name
                )
        );


    return state.countryCatalog;

}


/* ============================================================
   COUNTRY SEARCH
============================================================ */

function filterCountries(
    searchTerm = ""
) {

    const term =
        searchTerm
            .trim()
            .toLocaleLowerCase();


    const countries =
        getCountryCatalog();


    return (
        !term
            ? countries.slice(
                0,
                50
            )
            : countries
                .filter(
                    country =>
                        `${country.name} ${country.code}`
                            .toLocaleLowerCase()
                            .includes(
                                term
                            )
                )
                .slice(
                    0,
                    50
                )
    );

}


function openCountryResults() {

    if (
        !dom.countryResults
    ) {

        return;

    }


    renderResults(
        dom.countryResults,
        filterCountries(
            dom.countrySearch?.value ||
            ""
        ),
        "country"
    );


    dom.countryResults.hidden =
        false;


    dom.countrySearch?.setAttribute(
        "aria-expanded",
        "true"
    );

}


function closeCountryResults() {

    if (
        !dom.countryResults
    ) {

        return;

    }


    dom.countryResults.hidden =
        true;


    dom.countrySearch?.setAttribute(
        "aria-expanded",
        "false"
    );

}


function selectCountry(
    country
) {

    if (
        !country ||
        !dom.countrySelect
    ) {

        return;

    }


    /*
       countrySelect is an internal hidden
       INPUT. Store the code only.
    */

    dom.countrySelect.value =
        country.code;


    state.selectedCountry =
        country.code;


    if (
        dom.countrySearch
    ) {

        dom.countrySearch.value =
            `${country.flag} ${country.name}`;

    }


    if (
        dom.countryClear
    ) {

        dom.countryClear.hidden =
            false;

    }


    if (
        dom.countryHint
    ) {

        dom.countryHint.textContent =
            country.name;

    }


    applyCountry(
        country.code
    );


    closeCountryResults();

}


/* ============================================================
   LANGUAGE SEARCH
============================================================ */

function filterLanguages(
    searchTerm = ""
) {

    const term =
        searchTerm
            .trim()
            .toLocaleLowerCase();


    const languages =
        state.languageCatalog;


    return (
        !term
            ? languages.slice(
                0,
                50
            )
            : languages
                .filter(
                    language =>
                        `${language.name} ${language.nativeName} ${language.code}`
                            .toLocaleLowerCase()
                            .includes(
                                term
                            )
                )
                .slice(
                    0,
                    50
                )
    );

}


function openLanguageResults() {

    if (
        !dom.languageResults
    ) {

        return;

    }


    renderResults(
        dom.languageResults,
        filterLanguages(
            dom.languageSearch?.value ||
            ""
        ),
        "language"
    );


    dom.languageResults.hidden =
        false;


    dom.languageSearch?.setAttribute(
        "aria-expanded",
        "true"
    );

}


function closeLanguageResults() {

    if (
        !dom.languageResults
    ) {

        return;

    }


    dom.languageResults.hidden =
        true;


    dom.languageSearch?.setAttribute(
        "aria-expanded",
        "false"
    );

}


function selectLanguage(
    language
) {

    if (
        !language ||
        !dom.languageSelect
    ) {

        return;

    }


    dom.languageSelect.value =
        language.code;


    state.selectedLocale =
        language.code;


    if (
        dom.languageSearch
    ) {

        dom.languageSearch.value =
            getLanguageOptionLabel(
                language
            );


        dom.languageSearch.setAttribute(
            "dir",
            language.direction
        );

    }


    if (
        dom.languageClear
    ) {

        dom.languageClear.hidden =
            false;

    }


    closeLanguageResults();

}


/* ============================================================
   SEARCH SETUP
============================================================ */

function setupSearchControls() {

    injectSearchStyles();


    const countryControl =
        buildSearchControl({

            select:
                dom.countrySelect,

            inputId:
                "countrySearch",

            resultsId:
                "countryResults",

            clearId:
                "countryClear",

            placeholder:
                "Search country or region",

            iconClass:
                "fa-solid fa-earth-americas"

        });


    if (
        countryControl
    ) {

        dom.countrySearch =
            countryControl.input;

        dom.countryResults =
            countryControl.results;

        dom.countryClear =
            countryControl.clear;

    }


    const languageControl =
        buildSearchControl({

            select:
                dom.languageSelect,

            inputId:
                "languageSearch",

            resultsId:
                "languageResults",

            clearId:
                "languageClear",

            placeholder:
                "Search language or code",

            iconClass:
                "fa-solid fa-language"

        });


    if (
        languageControl
    ) {

        dom.languageSearch =
            languageControl.input;

        dom.languageResults =
            languageControl.results;

        dom.languageClear =
            languageControl.clear;

    }

}


/* ============================================================
   RECOMMENDED LANGUAGE
============================================================ */

function safeLanguagePopulationCode(
    code
) {

    if (
        typeof code !==
            "string"
    ) {

        return "";

    }


    const converted =
        code.replace(
            /_/g,
            "-"
        );


    return (
        normalizeLanguageCode(
            converted
        ) ||
        converted
            .toLowerCase()
    );

}


function recommendLanguage(
    countryCode
) {

    const population =
        state.metadata
            ?.territoryInfo
            ?.[
                countryCode
            ]
            ?.languagePopulation;


    if (
        !population
    ) {

        return "";

    }


    const availableCodes =
        new Set(
            state.languageCatalog.map(
                item =>
                    item.code
            )
        );


    const candidates =
        Object.entries(
            population
        )
        .map(
            (
                [
                    code,
                    info
                ]
            ) => {

                const exactCode =
                    safeLanguagePopulationCode(
                        code
                    );


                const baseCode =
                    exactCode
                        ?.split(
                            "-"
                        )[0]
                        ?.toLowerCase() ||
                    "";


                return {

                    exactCode,

                    baseCode,

                    population:
                        Number(
                            info
                                ?._populationPercent ||
                            0
                        ),

                    official:
                        info
                            ?._officialStatus ||
                        ""

                };

            }
        )
        .filter(
            candidate =>
                Boolean(
                    candidate.baseCode
                )
        )
        .sort(
            (
                first,
                second
            ) => {

                const rank =
                    value =>
                        value ===
                            "official"
                            ? 2
                            : value ===
                                "official_regional"
                                ? 1
                                : 0;


                return (
                    rank(
                        second.official
                    ) -
                    rank(
                        first.official
                    ) ||
                    second.population -
                    first.population
                );

            }
        );


    for (
        const candidate
        of candidates
    ) {

        if (
            candidate.exactCode &&
            availableCodes.has(
                candidate.exactCode
            )
        ) {

            return candidate.exactCode;

        }


        if (
            candidate.baseCode &&
            availableCodes.has(
                candidate.baseCode
            )
        ) {

            return candidate.baseCode;

        }

    }


    return "";

}


/* ============================================================
   RECOMMENDED CURRENCY
============================================================ */

function recommendCurrency(
    countryCode
) {

    const regions =
        state.metadata
            ?.currencyRegions
            ?.[
                countryCode
            ];


    if (
        !Array.isArray(
            regions
        )
    ) {

        return "";

    }


    const currencies =
        regions
            .flatMap(
                region =>
                    Object.entries(
                        region
                    )
                    .map(
                        (
                            [
                                code,
                                info
                            ]
                        ) => ({

                            code,

                            info

                        })
                    )
            )
            .filter(
                item => {

                    if (
                        item.info
                            ?._tender ===
                        "false"
                    ) {

                        return false;

                    }


                    return (
                        !item.info
                            ?._to
                    );

                }
            );


    return (
        currencies[0]
            ?.code ||
        ""
    );

}


/* ============================================================
   APPLY COUNTRY
============================================================ */

function applyCountry(
    countryCode
) {

    const country =
        state.countryCatalog
            .find(
                item =>
                    item.code ===
                    countryCode
            );


    if (
        !country
    ) {

        return;

    }


    state.selectedCountry =
        countryCode;


    if (
        dom.countrySearch
    ) {

        dom.countrySearch.value =
            `${country.flag} ${country.name}`;

    }


    if (
        dom.countryClear
    ) {

        dom.countryClear.hidden =
            false;

    }


    if (
        dom.countryHint
    ) {

        dom.countryHint.textContent =
            country.name;

    }


    const recommendedLanguage =
        recommendLanguage(
            countryCode
        );


    if (
        recommendedLanguage &&
        dom.languageSelect
    ) {

        const option =
            Array.from(
                dom.languageSelect
                    .options
            )
            .find(
                item =>
                    item.value ===
                    recommendedLanguage
            );


        if (
            option
        ) {

            dom.languageSelect.value =
                option.value;


            state.selectedLocale =
                option.value;


            const language =
                state.languageCatalog
                    .find(
                        item =>
                            item.code ===
                            option.value
                    );


            if (
                language &&
                dom.languageSearch
            ) {

                dom.languageSearch.value =
                    getLanguageOptionLabel(
                        language
                    );


                dom.languageSearch.setAttribute(
                    "dir",
                    language.direction
                );


                if (
                    dom.languageClear
                ) {

                    dom.languageClear.hidden =
                        false;

                }

            }

        }

    }


    const recommendedCurrency =
        recommendCurrency(
            countryCode
        );


    if (
        recommendedCurrency &&
        dom.currencySelect
    ) {

        const option =
            Array.from(
                dom.currencySelect
                    .options
            )
            .find(
                item =>
                    item.value ===
                    recommendedCurrency
            );


        if (
            option
        ) {

            dom.currencySelect.value =
                option.value;


            state.selectedCurrency =
                option.value;

        }

    }

}


/* ============================================================
   POPULATE COUNTRIES
   countrySelect is an INPUT, never a SELECT.
============================================================ */

function populateCountries() {

    if (
        !dom.countrySelect
    ) {

        return;

    }


    dom.countrySelect.value =
        "";


    renderResults(
        dom.countryResults,
        getCountryCatalog().slice(
            0,
            50
        ),
        "country"
    );

}


/* ============================================================
   POPULATE LANGUAGES
============================================================ */

function populateLanguages() {

    if (
        !dom.languageSelect
    ) {

        return;

    }


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


    state.languageCatalog.forEach(
        language => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                language.code;


            option.textContent =
                getLanguageOptionLabel(
                    language
                );


            option.dataset.languageName =
                language.name;


            option.dataset.nativeName =
                language.nativeName;


            option.dataset.direction =
                language.direction;


            option.dataset.translationAvailable =
                language.translationAvailable
                    ? "true"
                    : "false";


            dom.languageSelect.appendChild(
                option
            );

        }
    );


    renderResults(
        dom.languageResults,
        state.languageCatalog.slice(
            0,
            50
        ),
        "language"
    );

}


/* ============================================================
   POPULATE CURRENCIES
============================================================ */

function populateCurrencies() {

    if (
        !dom.currencySelect
    ) {

        return;

    }


    dom.currencySelect.innerHTML =
        "";


    let currencies =
        [];


    try {

        if (
            typeof Intl
                .supportedValuesOf ===
                "function"
        ) {

            currencies =
                Intl.supportedValuesOf(
                    "currency"
                );

        }

    }

    catch (
        error
    ) {

        console.error(
            "NutriCycle AI — Currency enumeration unavailable:",
            error
        );

    }


    let currencyNames =
        null;


    try {

        currencyNames =
            new Intl.DisplayNames(
                [
                    I18n.getLocale?.() ||
                    navigator.language ||
                    "en"
                ],
                {
                    type:
                        "currency"
                }
            );

    }

    catch {

        currencyNames =
            null;

    }


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


    currencies
        .slice()
        .sort()
        .forEach(
            currencyCode => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    currencyCode;


                option.textContent =
                    `${currencyCode} — ${
                        currencyNames?.of(
                            currencyCode
                        ) ||
                        currencyCode
                    }`;


                dom.currencySelect.appendChild(
                    option
                );

            }
        );

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


    /*
       Country is an internal INPUT.
       Validate against the CLDR catalog directly.
    */

    if (
        savedCountry &&
        state.countryCatalog.some(
            country =>
                country.code ===
                savedCountry
        )
    ) {

        const country =
            state.countryCatalog.find(
                item =>
                    item.code ===
                    savedCountry
            );


        if (
            country
        ) {

            selectCountry(
                country
            );

        }

    }


    /*
       Language is a real SELECT.
       Array.from(options) is valid here.
    */

    if (
        savedLocale &&
        dom.languageSelect
    ) {

        const normalizedSavedLocale =
            normalizeLocaleCode(
                savedLocale
            );


        const option =
            Array.from(
                dom.languageSelect
                    .options
            )
            .find(
                item =>
                    normalizeLocaleCode(
                        item.value
                    ) ===
                    normalizedSavedLocale
            );


        if (
            option
        ) {

            const language =
                state.languageCatalog
                    .find(
                        item =>
                            item.code ===
                            option.value
                    );


            if (
                language
            ) {

                selectLanguage(
                    language
                );

            }

        }

    }


    /*
       Currency is a real SELECT.
    */

    if (
        savedCurrency &&
        dom.currencySelect
    ) {

        const option =
            Array.from(
                dom.currencySelect
                    .options
            )
            .find(
                item =>
                    item.value ===
                    savedCurrency
            );


        if (
            option
        ) {

            dom.currencySelect.value =
                option.value;


            state.selectedCurrency =
                option.value;

        }

    }


    /*
       Do not display "Region detected"
       for saved preferences or browser locale.
    */

    if (
        dom.detectedLocation
    ) {

        dom.detectedLocation.hidden =
            true;

    }

}


/* ============================================================
   CONTINUE
============================================================ */

async function continueContext() {

    showError(
        ""
    );


    const country =
        dom.countrySelect
            ?.value ||
        "";


    const locale =
        dom.languageSelect
            ?.value ||
        "";


    const currency =
        dom.currencySelect
            ?.value ||
        "";


    if (
        !country
    ) {

        showError(
            "Please select your country or region."
        );


        dom.countrySearch?.focus();


        return;

    }


    if (
        !locale
    ) {

        showError(
            "Please select your language."
        );


        dom.languageSearch?.focus();


        return;

    }


    if (
        !currency
    ) {

        showError(
            "Please select your currency."
        );


        return;

    }


    try {

        if (
            dom.continueButton
        ) {

            dom.continueButton.disabled =
                true;

        }


        state.selectedCountry =
            country;


        state.selectedLocale =
            locale;


        state.selectedCurrency =
            currency;


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

    catch (
        error
    ) {

        console.error(
            "NutriCycle AI — Context save failed:",
            error
        );


        showError(
            "We could not save your preferences. Please try again."
        );


        if (
            dom.continueButton
        ) {

            dom.continueButton.disabled =
                false;

        }

    }

}


/* ============================================================
   EVENTS
============================================================ */

function initializeEvents() {

    /*
       COUNTRY SEARCH
    */

    dom.countrySearch?.addEventListener(
        "focus",
        openCountryResults
    );


    dom.countrySearch?.addEventListener(
        "input",
        () => {

            if (
                dom.countrySelect
            ) {

                dom.countrySelect.value =
                    "";

            }


            state.selectedCountry =
                "";


            if (
                dom.countryClear
            ) {

                dom.countryClear.hidden =
                    !dom.countrySearch
                        .value;

            }


            renderResults(
                dom.countryResults,
                filterCountries(
                    dom.countrySearch
                        .value
                ),
                "country"
            );


            openCountryResults();

        }
    );


    dom.countrySearch?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeCountryResults();

            }

        }
    );


    dom.countryClear?.addEventListener(
        "click",
        () => {

            dom.countrySearch.value =
                "";

            dom.countrySelect.value =
                "";

            state.selectedCountry =
                "";

            dom.countryClear.hidden =
                true;

            if (
                dom.countryHint
            ) {

                dom.countryHint.textContent =
                    "";

            }

            openCountryResults();

            dom.countrySearch.focus();

        }
    );


    /*
       LANGUAGE SEARCH
    */

    dom.languageSearch?.addEventListener(
        "focus",
        openLanguageResults
    );


    dom.languageSearch?.addEventListener(
        "input",
        () => {

            dom.languageSelect.value =
                "";

            state.selectedLocale =
                "";


            if (
                dom.languageClear
            ) {

                dom.languageClear.hidden =
                    !dom.languageSearch
                        .value;

            }


            renderResults(
                dom.languageResults,
                filterLanguages(
                    dom.languageSearch
                        .value
                ),
                "language"
            );


            openLanguageResults();

        }
    );


    dom.languageSearch?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeLanguageResults();

            }

        }
    );


    dom.languageClear?.addEventListener(
        "click",
        () => {

            dom.languageSearch.value =
                "";

            dom.languageSelect.value =
                "";

            state.selectedLocale =
                "";

            dom.languageSearch.removeAttribute(
                "dir"
            );

            dom.languageClear.hidden =
                true;

            openLanguageResults();

            dom.languageSearch.focus();

        }
    );


    /*
       CLOSE SEARCH MENUS OUTSIDE THE CONTROL
    */

    document.addEventListener(
        "click",
        event => {

            const countryWrapper =
                dom.countrySearch
                    ?.closest(
                        ".context-search-wrapper"
                    );


            const languageWrapper =
                dom.languageSearch
                    ?.closest(
                        ".context-search-wrapper"
                    );


            if (
                countryWrapper &&
                !countryWrapper.contains(
                    event.target
                )
            ) {

                closeCountryResults();

            }


            if (
                languageWrapper &&
                !languageWrapper.contains(
                    event.target
                )
            ) {

                closeLanguageResults();

            }

        }
    );


    /*
       CURRENCY
    */

    dom.currencySelect?.addEventListener(
        "change",
        () => {

            state.selectedCurrency =
                dom.currencySelect.value;

        }
    );


    /*
       CONTINUE
    */

    dom.continueButton?.addEventListener(
        "click",
        continueContext
    );

}


/* ============================================================
   INITIALIZE
============================================================ */

async function initialize() {

    cacheDOM();


    try {

        /*
           Region detection is intentionally not used here.
           The context page should reflect the user's choice,
           not silently convert browser locale into a country.
        */

        if (
            dom.detectedLocation
        ) {

            dom.detectedLocation.hidden =
                true;

        }


        /*
           Build visible search controls first.
        */

        setupSearchControls();


        /*
           Initialize global i18n.
        */

        await I18n.initialize();


        /*
           Load CLDR + translation metadata.
        */

        await loadMetadata();


        /*
           Build controls.
        */

        populateCountries();

        populateLanguages();

        populateCurrencies();


        /*
           Restore saved preferences only.
        */

        restoreContext();


        /*
           Attach events after DOM is ready.
        */

        initializeEvents();


        state.initialized =
            true;


        console.log(
            "NutriCycle AI — Global Context Gateway Ready",
            {

                languages:
                    state.languageCatalog
                        .length,

                countries:
                    state.countryCatalog
                        .length,

                translationLocales:
                    state.translationLocales
                        .length,

                cldr:
                    "48.2"

            }
        );

    }

    catch (
        error
    ) {

        console.error(
            "NutriCycle AI — Context Gateway initialization failed:",
            error
        );


        showError(
            "We could not load the global settings. Please refresh the page."
        );


        if (
            dom.continueButton
        ) {

            dom.continueButton.disabled =
                false;

        }

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
            once:
                true
        }
    );

}

else {

    initialize();

}