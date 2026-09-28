import I18n from "./i18n.js";

"use strict";

/* ============================================================
   NutriCycle AI
   GLOBAL CONTEXT GATEWAY
   Version 2.0
   CLDR-powered country / language / currency selection
============================================================ */


/* ============================================================
   CONFIGURATION
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

    }),


    languageCatalog: Object.freeze({

        /*
           The CLDR languageNames file is the authoritative
           catalog source for the language selector.

           Translation availability is intentionally separate
           from language availability.
        */

        exclude: Object.freeze([

            "root",
            "und"

        ])

    })

});


/* ============================================================
   STATE
============================================================ */

const state = {

    metadata:
        null,


    /*
       Actual translation locales declared
       in locales/manifest.json.
    */

    translationLocales:
        [],


    /*
       Worldwide language catalog generated
       from CLDR language names.
    */

    languageCatalog:
        [],


    /*
       Compatibility alias retained for
       existing application logic.
    */

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


    languageSelect:
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

    dom.countrySelect =
        document.getElementById(
            "countrySelect"
        );


    dom.languageSelect =
        document.getElementById(
            "languageSelect"
        );


    dom.currencySelect =
        document.getElementById(
            "currencySelect"
        );


    dom.continueButton =
        document.getElementById(
            "continueButton"
        );


    dom.error =
        document.getElementById(
            "contextError"
        );


    dom.detectedLocation =
        document.getElementById(
            "detectedLocation"
        );


    dom.detectedText =
        document.getElementById(
            "detectedText"
        );


    dom.countryHint =
        document.getElementById(
            "countryHint"
        );

}


/* ============================================================
   ERROR
============================================================ */

function showError(
    message
) {

    if (
        !dom.error
    ) {

        return;

    }


    dom.error.textContent =
        message ||
        "";


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
   FETCH JSON
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

        return Intl
            .getCanonicalLocales(
                locale
            )[0];

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


    /*
       CLDR language names can contain
       language + script/variant entries.

       For the language selector we retain
       canonical language identifiers and
       useful script-specific identifiers.
    */

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

        /*
           Some CLDR language identifiers are
           broader language identifiers that are
           still useful even when Intl rejects
           their exact legacy representation.
        */

        if (
            /^[a-z]{2,3}$/i.test(
                cleaned
            )
        ) {

            return cleaned
                .toLowerCase();

        }


        return "";

    }

}


/* ============================================================
   LANGUAGE DISPLAY NAME
============================================================ */

function getLanguageDisplayName(
    languageCode,
    displayLocale = "en"
) {

    const normalized =
        normalizeLanguageCode(
            languageCode
        );


    if (
        !normalized
    ) {

        return languageCode;

    }


    try {

        if (
            typeof Intl.DisplayNames ===
                "function"
        ) {

            const displayNames =
                new Intl.DisplayNames(
                    [
                        normalizeLocaleCode(
                            displayLocale
                        ) ||
                        "en"
                    ],
                    {

                        type:
                            "language"

                    }
                );


            const result =
                displayNames.of(
                    normalized
                );


            if (
                result
            ) {

                return result;

            }

        }

    }

    catch {

        /* Continue to CLDR fallback. */

    }


    return (
        state.metadata
            ?.languageNames
            ?.[
                normalized
            ] ||
        normalized
    );

}


/* ============================================================
   NATIVE LANGUAGE NAME
============================================================ */

function getNativeLanguageName(
    languageCode
) {

    const normalized =
        normalizeLanguageCode(
            languageCode
        );


    if (
        !normalized
    ) {

        return languageCode;

    }


    /*
       Ask the browser's CLDR-backed Intl
       implementation to display the language
       in its own language where possible.
    */

    try {

        if (
            typeof Intl.DisplayNames ===
                "function"
        ) {

            const displayNames =
                new Intl.DisplayNames(
                    [
                        normalized
                    ],
                    {

                        type:
                            "language"

                    }
                );


            const nativeName =
                displayNames.of(
                    normalized
                );


            if (
                nativeName
            ) {

                return nativeName;

            }

        }

    }

    catch {

        /* Continue to English CLDR name. */

    }


    return getLanguageDisplayName(
        normalized,
        "en"
    );

}


/* ============================================================
   LANGUAGE CATALOG FROM CLDR
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


    Object.keys(
        languageNames
    )
        .forEach(
            rawCode => {

                if (
                    CONFIG
                        .languageCatalog
                        .exclude
                        .includes(
                            rawCode
                        )
                ) {

                    return;

                }


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


                const parts =
                    code.split(
                        "-"
                    );


                const language =
                    parts[0] ||
                    "";


                /*
                   Ignore internal CLDR keys
                   that are not useful to users.
                */

                if (
                    !/^[a-z]{2,3}$/i.test(
                        language
                    )
                ) {

                    return;

                }


                const englishName =
                    getLanguageDisplayName(
                        code,
                        "en"
                    );


                const nativeName =
                    getNativeLanguageName(
                        code
                    );


                catalog.push({

                    code:
                        code,

                    language:
                        language.toLowerCase(),

                    script:
                        parts[1] &&
                        /^[A-Z][a-z]{3}$/
                            .test(
                                parts[1]
                            )
                            ? parts[1]
                            : "",

                    name:
                        englishName ||
                        code,

                    nativeName:
                        nativeName ||
                        englishName ||
                        code,

                    direction:
                        I18n.getDirection
                            ? I18n.getDirection(
                                code
                            )
                            : "ltr"

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
        ) => {

            const firstName =
                first.nativeName ||
                first.name ||
                first.code;


            const secondName =
                second.nativeName ||
                second.name ||
                second.code;


            return firstName.localeCompare(
                secondName,
                I18n.getLocale?.() ||
                    "en"
            );

        }
    );


    state.languageCatalog =
        catalog;


    /*
       Compatibility:

       Older parts of this module use
       state.locales.

       Keep it synchronized with the
       full CLDR language catalog.
    */

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
                    state.translationLocales
                        .some(
                            translation =>
                                normalizeLocaleCode(
                                    translation.code
                                ) ===
                                normalizeLocaleCode(
                                    entry.code
                                )
                        )

            })
        );


    return state.languageCatalog;

}


/* ============================================================
   LOAD METADATA
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
                ?.territoryInfo
            ||
            {},


        currencyRegions:
            currencyData
                ?.supplemental
                ?.currencyData
                ?.region
            ||
            {},


        languageNames:
            languageData
                ?.main
                ?.en
                ?.localeDisplayNames
                ?.languages
            ||
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


    return state.metadata;

}


/* ============================================================
   COUNTRY FLAG
============================================================ */

function getCountryFlag(
    countryCode
) {

    if (
        !countryCode ||
        countryCode.length !==
            2
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
                    character.charCodeAt(
                        0
                    )
                )
        )
        .join("");

}


/* ============================================================
   COUNTRY CATALOG
============================================================ */

function getCountryCatalog() {

    if (
        state.countryCatalog
            .length
    ) {

        return state.countryCatalog;

    }


    let regionNames;


    try {

        regionNames =
            new Intl.DisplayNames(
                ["en"],
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


    const countries =
        Object.keys(
            state.metadata
                ?.territoryInfo ||
            {}
        )
        .filter(
            code =>
                /^[A-Z]{2}$/
                    .test(
                        code
                    )
        )
        .map(
            code => ({

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


    state.countryCatalog =
        countries;


    return countries;

}


/* ============================================================
   POPULATE COUNTRIES
============================================================ */

function populateCountries() {

    if (
        !dom.countrySelect
    ) {

        return;

    }


    const countries =
        getCountryCatalog();


    dom.countrySelect.innerHTML =
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


    dom.countrySelect.appendChild(
        placeholder
    );


    countries.forEach(
        country => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                country.code;


            option.textContent =
                `${country.flag} ${country.name}`;


            option.dataset.countryName =
                country.name;


            dom.countrySelect
                .appendChild(
                    option
                );

        }
    );

}


/* ============================================================
   LANGUAGE AVAILABILITY LABEL
============================================================ */

function getLanguageOptionLabel(
    locale
) {

    const nativeName =
        locale.nativeName ||
        locale.name ||
        locale.code;


    /*
       For now all CLDR languages are
       selectable.

       Translation availability is preserved
       as metadata but does not artificially
       remove languages from the catalog.
    */

    return nativeName;

}


/* ============================================================
   AVAILABLE LANGUAGE CATALOG
============================================================ */

function populateLanguages() {

    if (
        !dom.languageSelect
    ) {

        return;

    }


    /*
       Rebuild from the CLDR catalog rather
       than from manifest.locales.

       The manifest only describes actual
       translation files.
    */

    if (
        !state.languageCatalog
            .length
    ) {

        buildLanguageCatalog();

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


    dom.languageSelect
        .appendChild(
            placeholder
        );


    state.languageCatalog
        .slice()
        .sort(
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
                    getLanguageOptionLabel(
                        locale
                    );


                option.dataset.languageName =
                    locale.name ||
                    locale.code;


                option.dataset.nativeName =
                    locale.nativeName ||
                    locale.name ||
                    locale.code;


                option.dataset.direction =
                    locale.direction ||
                    "ltr";


                option.dataset.translationAvailable =
                    locale.translationAvailable
                        ? "true"
                        : "false";


                dom.languageSelect
                    .appendChild(
                        option
                    );

            }
        );

}


/* ============================================================
   CURRENCY CATALOG
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


    let currencyNames;


    try {

        currencyNames =
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


    dom.currencySelect
        .appendChild(
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


                dom.currencySelect
                    .appendChild(
                        option
                    );

            }
        );

}


/* ============================================================
   RECOMMENDED LANGUAGE
============================================================ */

function recommendLanguage(
    countryCode
) {

    const territory =
        state.metadata
            ?.territoryInfo
            ?.[countryCode];


    const population =
        territory
            ?.languagePopulation;


    if (
        !population
    ) {

        return "";

    }


    const availableCodes =
        new Set(
            state.languageCatalog
                .map(
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
                        ?.toLowerCase()
                    ||
                    "";


                return {

                    exactCode,

                    baseCode,

                    population:
                        Number(
                            info
                                ?._populationPercent
                            ||
                            0
                        ),

                    official:
                        info
                            ?._officialStatus
                        ||
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

                const officialFirst =
                    first.official ===
                        "official"
                        ? 2
                        : first.official ===
                            "official_regional"
                            ? 1
                            : 0;


                const officialSecond =
                    second.official ===
                        "official"
                        ? 2
                        : second.official ===
                            "official_regional"
                            ? 1
                            : 0;


                if (
                    officialSecond !==
                    officialFirst
                ) {

                    return (
                        officialSecond -
                        officialFirst
                    );

                }


                return (
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
   SAFE LANGUAGE POPULATION CODE
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


    /*
       CLDR territoryInfo commonly uses
       forms such as:

       en
       hi
       pt
       zh
       zh_Hant

       Normalize those into
       BCP-47-compatible forms.
    */

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


/* ============================================================
   RECOMMENDED CURRENCY
============================================================ */

function recommendCurrency(
    countryCode
) {

    const regions =
        state.metadata
            ?.currencyRegions
            ?.[countryCode];


    if (
        !Array.isArray(
            regions
        )
    ) {

        return "";

    }


    const currentCurrencies =
        regions
            .flatMap(
                entry =>
                    Object.entries(
                        entry
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
                        !item.info?._to
                    );

                }
            );


    return (
        currentCurrencies[0]
            ?.code ||
        ""
    );

}


/* ============================================================
   BROWSER REGION
============================================================ */

function detectBrowserRegion() {

    try {

        const browserLocale =
            navigator.language ||
            "";


        return (
            new Intl.Locale(
                browserLocale
            ).region ||
            ""
        );

    }

    catch {

        return "";

    }

}


/* ============================================================
   APPLY COUNTRY DEFAULTS
============================================================ */

function applyCountry(
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
        dom.languageSelect
    ) {

        const exists =
            Array.from(
                dom.languageSelect
                    .options
            ).some(
                option =>
                    option.value ===
                    locale
            );


        if (
            exists
        ) {

            dom.languageSelect
                .value =
                locale;

            state.selectedLocale =
                locale;

        }

    }


    const currency =
        recommendCurrency(
            countryCode
        );


    if (
        currency &&
        dom.currencySelect
    ) {

        const exists =
            Array.from(
                dom.currencySelect
                    .options
            ).some(
                option =>
                    option.value ===
                    currency
            );


        if (
            exists
        ) {

            dom.currencySelect
                .value =
                currency;

            state.selectedCurrency =
                currency;

        }

    }


    const selectedOption =
        dom.countrySelect
            ?.selectedOptions
            ?.[0];


    if (
        dom.countryHint
    ) {

        dom.countryHint.textContent =
            selectedOption
                ?.dataset
                ?.countryName ||
            "";

    }

}


/* ============================================================
   DETECTED REGION DISPLAY
============================================================ */

function showDetectedRegion(
    countryCode
) {

    if (
        !dom.detectedLocation ||
        !dom.detectedText
    ) {

        return;

    }


    const country =
        getCountryCatalog()
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


    dom.detectedText.textContent =
        `${country.flag} ${country.name}`;


    dom.detectedLocation.hidden =
        false;

}


/* ============================================================
   TRANSLATION AVAILABILITY
============================================================ */

function hasTranslationFile(
    locale
) {

    const normalized =
        normalizeLocaleCode(
            locale
        );


    if (
        !normalized
    ) {

        return false;

    }


    return state.translationLocales
        .some(
            item =>
                normalizeLocaleCode(
                    item.code
                ) ===
                normalized
        );

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


        return;

    }


    if (
        !locale
    ) {

        showError(
            "Please select your language."
        );


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


        /*
           Set the requested locale.

           When the corresponding translation
           file does not exist yet, i18n.js will
           retain the selected locale and fall
           back to English messages.
        */

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
   EXISTING CONTEXT
============================================================ */

function hasExistingContext() {

    return (

        getStored(
            CONFIG.storage.configured
        ) ===
            "true"

        &&

        Boolean(
            getStored(
                CONFIG.storage.locale
            )
        )

    );

}


/* ============================================================
   RESTORE EXISTING CONTEXT
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


    if (
        savedCountry &&
        dom.countrySelect &&
        Array.from(
            dom.countrySelect
                .options
        ).some(
            option =>
                option.value ===
                savedCountry
        )
    ) {

        dom.countrySelect.value =
            savedCountry;


        state.selectedCountry =
            savedCountry;

    }


    if (
        savedCurrency &&
        dom.currencySelect &&
        Array.from(
            dom.currencySelect
                .options
        ).some(
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


    if (
        savedLocale &&
        dom.languageSelect &&
        Array.from(
            dom.languageSelect
                .options
        ).some(
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
        savedCountry
    ) {

        showDetectedRegion(
            savedCountry
        );

    }

}


/* ============================================================
   EVENTS
============================================================ */

function initializeEvents() {

    dom.countrySelect
        ?.addEventListener(
            "change",
            () => {

                applyCountry(
                    dom.countrySelect
                        .value
                );

            }
        );


    dom.languageSelect
        ?.addEventListener(
            "change",
            () => {

                state.selectedLocale =
                    dom.languageSelect
                        .value;

            }
        );


    dom.currencySelect
        ?.addEventListener(
            "change",
            () => {

                state.selectedCurrency =
                    dom.currencySelect
                        .value;

            }
        );


    dom.continueButton
        ?.addEventListener(
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
           Initialize the upgraded global
           internationalization engine first.

           This gives us:

           - locale normalization
           - CLDR language names
           - RTL detection
           - locale fallback
           - Intl formatting
        */

        await I18n.initialize();


        await loadMetadata();


        populateCountries();


        /*
           IMPORTANT:

           Languages now come from CLDR,
           not only from manifest.locales.
        */

        populateLanguages();


        populateCurrencies();


        const detectedRegion =
            detectBrowserRegion();


        const savedCountry =
            getStored(
                CONFIG.storage
                    .country
            );


        const initialCountry =
            savedCountry ||
            detectedRegion ||
            "";


        if (
            initialCountry &&
            dom.countrySelect &&
            Array.from(
                dom.countrySelect
                    .options
            ).some(
                option =>
                    option.value ===
                    initialCountry
            )
        ) {

            dom.countrySelect
                .value =
                initialCountry;


            applyCountry(
                initialCountry
            );


            if (
                !savedCountry
            ) {

                showDetectedRegion(
                    initialCountry
                );

            }

        }


        restoreContext();


        initializeEvents();


        state.initialized =
            true;


        console.log(
            "NutriCycle AI — Global Context Gateway Ready",
            {

                languages:
                    state
                        .languageCatalog
                        .length,

                translationLocales:
                    state
                        .translationLocales
                        .length,

                countries:
                    state
                        .countryCatalog
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