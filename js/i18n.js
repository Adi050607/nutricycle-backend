/* ============================================================
   NutriCycle AI
   GLOBAL INTERNATIONALIZATION ENGINE
   Version 2.0
   CLDR / BCP-47 / Intl Architecture
============================================================ */

"use strict";


/* ============================================================
   CONFIGURATION
============================================================ */

const I18N_CONFIG = Object.freeze({

    defaultLocale:
        "en",

    fallbackLocale:
        "en",

    translationsBasePath:
        "/locales",

    translationFileExtension:
        ".json",

    storageKey:
        "nutricycle_locale",

    cldrVersion:
        "48.2",

    cldrBasePath:
        "https://cdn.jsdelivr.net/npm/cldr-core@48.2.0",

    cldrLocaleNamesBasePath:
        "https://cdn.jsdelivr.net/npm/cldr-localenames-full@48.2.0",

    languageNamesLocale:
        "en",

    languageNamesUrl:
        "https://cdn.jsdelivr.net/npm/cldr-localenames-full@48.2.0/main/en/languages.json",

    localeManifestPath:
        "/locales/manifest.json",

    enableLocaleManifest:
        true,

    enableMutationObserver:
        true,

    translationCacheMode:
        "default",

    mutationDebounceMs:
        40

});


/* ============================================================
   STATE
============================================================ */

const I18N_STATE = {

    locale:
        I18N_CONFIG.defaultLocale,

    language:
        "en",

    script:
        "",

    region:
        "",

    direction:
        "ltr",

    translations:
        {},

    loadedLocales:
        new Set(),

    loadingLocales:
        new Map(),

    availableLocales:
        new Set(),

    localeCatalog:
        [],

    cldr:
        {

            languageNames:
                null,

            loaded:
                false,

            error:
                null

        },

    initialized:
        false,

    observer:
        null,

    mutationTimer:
        null

};


/* ============================================================
   INTERNAL CONSTANTS
============================================================ */

const RTL_LANGUAGES =
    new Set([

        "ar",
        "arc",
        "ckb",
        "dv",
        "fa",
        "he",
        "ku",
        "nqo",
        "ps",
        "sd",
        "syr",
        "ug",
        "ur",
        "yi"

    ]);


const LOCALE_SEPARATOR =
    "-";


const FALLBACK_SEPARATOR =
    "-";


/* ============================================================
   SAFE STRING
============================================================ */

function safeString(
    value,
    fallback = ""
) {

    if (
        value ===
        undefined ||
        value ===
        null
    ) {

        return fallback;

    }

    return String(
        value
    );

}


/* ============================================================
   LOCALE NORMALIZATION
============================================================ */

function normalizeLocale(
    locale
) {

    if (
        !locale ||
        typeof locale !==
            "string"
    ) {

        return I18N_CONFIG
            .fallbackLocale;

    }


    const cleaned =
        locale
            .trim()
            .replace(
                /_/g,
                "-"
            );


    if (
        !cleaned
    ) {

        return I18N_CONFIG
            .fallbackLocale;

    }


    try {

        return Intl
            .getCanonicalLocales(
                cleaned
            )[0];

    }

    catch {

        return I18N_CONFIG
            .fallbackLocale;

    }

}


/* ============================================================
   LOCALE PARTS
============================================================ */

function getLocaleParts(
    locale
) {

    const normalized =
        normalizeLocale(
            locale
        );


    try {

        const intlLocale =
            new Intl.Locale(
                normalized
            );

        return {

            locale:
                normalized,

            language:
                intlLocale.language ||
                "",

            script:
                intlLocale.script ||
                "",

            region:
                intlLocale.region ||
                ""

        };

    }

    catch {

        const parts =
            normalized.split(
                LOCALE_SEPARATOR
            );


        return {

            locale:
                normalized,

            language:
                parts[0] ||
                "",

            script:
                parts.find(
                    part =>
                        /^[A-Z][a-z]{3}$/
                            .test(
                                part
                            )
                ) ||
                "",

            region:
                parts.find(
                    part =>
                        /^[A-Z]{2}$/
                            .test(
                                part
                            ) ||
                        /^\d{3}$/
                            .test(
                                part
                            )
                ) ||
                ""

        };

    }

}


/* ============================================================
   FALLBACK CHAIN
============================================================ */

function getLocaleFallbackChain(
    locale
) {

    const normalized =
        normalizeLocale(
            locale
        );


    const parts =
        getLocaleParts(
            normalized
        );


    const chain =
        [];


    function add(
        value
    ) {

        if (
            value &&
            !chain.includes(
                value
            )
        ) {

            chain.push(
                value
            );

        }

    }


    /*
       Full locale first.

       Example:
       zh-Hant-TW
    */

    add(
        normalized
    );


    /*
       Remove Unicode extension
       and private extension.
    */

    try {

        const localeObject =
            new Intl.Locale(
                normalized
            );

        const baseName =
            localeObject.baseName;

        add(
            baseName
        );

    }

    catch {

        /* Nothing to do. */

    }


    /*
       Script-specific fallback.

       Example:
       zh-Hant
    */

    if (
        parts.language &&
        parts.script
    ) {

        add(
            `${parts.language}-${parts.script}`
        );

    }


    /*
       Language-only fallback.

       Example:
       zh
    */

    if (
        parts.language
    ) {

        add(
            parts.language
        );

    }


    /*
       Final application fallback.
    */

    add(
        normalizeLocale(
            I18N_CONFIG
                .fallbackLocale
        )
    );


    return chain;

}


/* ============================================================
   RTL DETECTION
============================================================ */

function getDirection(
    locale
) {

    const parts =
        getLocaleParts(
            locale
        );


    /*
       Modern browsers expose
       textInfo.direction.
    */

    try {

        const intlLocale =
            new Intl.Locale(
                parts.locale
            );


        if (
            intlLocale.textInfo &&
            typeof
                intlLocale.textInfo.direction ===
                    "string"
        ) {

            return intlLocale
                .textInfo
                .direction ===
                "rtl"
                    ? "rtl"
                    : "ltr";

        }

    }

    catch {

        /* Continue to fallback. */

    }


    /*
       CLDR-compatible language
       fallback for RTL scripts.
    */

    if (
        RTL_LANGUAGES.has(
            parts.language
        )
    ) {

        return "rtl";

    }


    if (
        parts.script ===
            "Arab" ||
        parts.script ===
            "Hebr"
    ) {

        return "rtl";

    }


    return "ltr";

}


/* ============================================================
   UPDATE LOCALE STATE
============================================================ */

function updateLocaleState(
    locale
) {

    const normalized =
        normalizeLocale(
            locale
        );


    const parts =
        getLocaleParts(
            normalized
        );


    I18N_STATE.locale =
        normalized;

    I18N_STATE.language =
        parts.language;

    I18N_STATE.script =
        parts.script;

    I18N_STATE.region =
        parts.region;

    I18N_STATE.direction =
        getDirection(
            normalized
        );

}


/* ============================================================
   GET SAVED LOCALE
============================================================ */

function getSavedLocale() {

    try {

        const saved =
            localStorage.getItem(
                I18N_CONFIG.storageKey
            );


        return normalizeLocale(
            saved
        );

    }

    catch {

        return normalizeLocale(
            I18N_CONFIG
                .defaultLocale
        );

    }

}


/* ============================================================
   SAVE LOCALE
============================================================ */

function saveLocale(
    locale
) {

    try {

        localStorage.setItem(
            I18N_CONFIG.storageKey,
            normalizeLocale(
                locale
            )
        );

    }

    catch (
        error
    ) {

        console.warn(
            "NutriCycle AI — Unable to save locale:",
            error
        );

    }

}


/* ============================================================
   TRANSLATION URL
============================================================ */

function buildTranslationUrl(
    locale
) {

    const normalized =
        normalizeLocale(
            locale
        );


    return (
        I18N_CONFIG
            .translationsBasePath +
        "/" +
        encodeURIComponent(
            normalized
        ) +
        I18N_CONFIG
            .translationFileExtension
    );

}


/* ============================================================
   READ TRANSLATION FILE
============================================================ */

async function fetchTranslation(
    locale
) {

    const normalized =
        normalizeLocale(
            locale
        );


    const existingRequest =
        I18N_STATE
            .loadingLocales
            .get(
                normalized
            );


    if (
        existingRequest
    ) {

        return existingRequest;

    }


    const request =
        (async () => {

            const url =
                buildTranslationUrl(
                    normalized
                );


            const response =
                await fetch(
                    url,
                    {

                        cache:
                            I18N_CONFIG
                                .translationCacheMode

                    }
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `Translation file returned ${response.status}: ${normalized}`
                );

            }


            const messages =
                await response.json();


            if (
                !messages ||
                typeof messages !==
                    "object" ||
                Array.isArray(
                    messages
                )
            ) {

                throw new Error(
                    `Translation file is not a valid object: ${normalized}`
                );

            }


            I18N_STATE
                .translations[
                    normalized
                ] =
                messages;


            I18N_STATE
                .loadedLocales
                .add(
                    normalized
                );


            I18N_STATE
                .availableLocales
                .add(
                    normalized
                );


            return messages;

        })();


    I18N_STATE
        .loadingLocales
        .set(
            normalized,
            request
        );


    try {

        return await request;

    }

    finally {

        I18N_STATE
            .loadingLocales
            .delete(
                normalized
            );

    }

}


/* ============================================================
   LOAD LOCALE
============================================================ */

async function loadLocale(
    locale
) {

    const normalized =
        normalizeLocale(
            locale
        );


    if (
        I18N_STATE
            .loadedLocales
            .has(
                normalized
            )
    ) {

        return I18N_STATE
            .translations[
                normalized
            ];

    }


    try {

        return await fetchTranslation(
            normalized
        );

    }

    catch (
        error
    ) {

        console.warn(
            `NutriCycle AI — Failed to load locale "${normalized}":`,
            error
        );


        /*
           Attempt the locale fallback chain.

           The actual selected locale remains
           the requested locale.
        */

        const chain =
            getLocaleFallbackChain(
                normalized
            );


        for (
            const candidate
            of chain
        ) {

            if (
                candidate ===
                normalized
            ) {

                continue;

            }


            try {

                return await fetchTranslation(
                    candidate
                );

            }

            catch {

                /* Try next candidate. */

            }

        }


        return {};

    }

}


/* ============================================================
   LOAD FALLBACK LOCALE
============================================================ */

async function ensureFallbackLoaded() {

    const fallback =
        normalizeLocale(
            I18N_CONFIG
                .fallbackLocale
        );


    if (
        I18N_STATE
            .loadedLocales
            .has(
                fallback
            )
    ) {

        return I18N_STATE
            .translations[
                fallback
            ];

    }


    try {

        return await fetchTranslation(
            fallback
        );

    }

    catch (
        error
    ) {

        console.error(
            "NutriCycle AI — Fallback locale could not be loaded:",
            error
        );


        return {};

    }

}


/* ============================================================
   NESTED KEY RESOLUTION
============================================================ */

function getMessage(
    messages,
    key
) {

    if (
        !messages ||
        !key
    ) {

        return null;

    }


    const parts =
        safeString(
            key
        ).split(
            "."
        );


    let value =
        messages;


    for (
        const part
        of parts
    ) {

        if (
            value === null ||
            value === undefined ||
            typeof value !==
                "object"
        ) {

            return null;

        }


        value =
            value[
                part
            ];

    }


    return typeof value ===
        "string"
        ? value
        : null;

}


/* ============================================================
   DEEP MESSAGE RESOLUTION
============================================================ */

function resolveMessage(
    key
) {

    const chain =
        getLocaleFallbackChain(
            I18N_STATE.locale
        );


    for (
        const locale
        of chain
    ) {

        const messages =
            I18N_STATE
                .translations[
                    locale
                ];


        if (
            !messages
        ) {

            continue;

        }


        const message =
            getMessage(
                messages,
                key
            );


        if (
            message !==
            null
        ) {

            return {

                message:
                    message,

                locale:
                    locale

            };

        }

    }


    return {

        message:
            null,

        locale:
            null

    };

}


/* ============================================================
   VARIABLE INTERPOLATION
============================================================ */

function interpolate(
    message,
    variables = {}
) {

    if (
        typeof message !==
        "string"
    ) {

        return "";

    }


    return message.replace(
        /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
        (
            match,
            variableName
        ) => {

            const value =
                variables[
                    variableName
                ];


            return (
                value ===
                    undefined ||
                value ===
                    null
            )
                ? match
                : String(
                    value
                );

        }
    );

}


/* ============================================================
   TRANSLATE
============================================================ */

function translate(
    key,
    variables = {}
) {

    const resolved =
        resolveMessage(
            key
        );


    if (
        !resolved.message
    ) {

        /*
           Preserve the old engine's
           useful missing-key behaviour.
        */

        return key;

    }


    return interpolate(
        resolved.message,
        variables
    );

}


/* ============================================================
   TRANSLATION EXISTS
============================================================ */

function hasTranslation(
    key,
    locale =
        I18N_STATE.locale
) {

    const chain =
        getLocaleFallbackChain(
            locale
        );


    for (
        const candidate
        of chain
    ) {

        const messages =
            I18N_STATE
                .translations[
                    candidate
                ];


        if (
            getMessage(
                messages,
                key
            ) !==
                null
        ) {

            return true;

        }

    }


    return false;

}


/* ============================================================
   TRANSLATE ELEMENT TEXT
============================================================ */

function translateElements(
    root =
        document
) {

    const elements =
        root.querySelectorAll(
            "[data-i18n]"
        );


    elements.forEach(
        element => {

            const key =
                element.dataset
                    .i18n;


            if (
                !key
            ) {

                return;

            }


            element.textContent =
                translate(
                    key
                );

        }
    );

}


/* ============================================================
   TRANSLATE HTML CONTENT
============================================================ */

function translateHtmlElements(
    root =
        document
) {

    const elements =
        root.querySelectorAll(
            "[data-i18n-html]"
        );


    elements.forEach(
        element => {

            const key =
                element.dataset
                    .i18nHtml;


            if (
                !key
            ) {

                return;

            }


            element.innerHTML =
                translate(
                    key
                );

        }
    );

}


/* ============================================================
   TRANSLATE PLACEHOLDERS
============================================================ */

function translatePlaceholders(
    root =
        document
) {

    const elements =
        root.querySelectorAll(
            "[data-i18n-placeholder]"
        );


    elements.forEach(
        element => {

            const key =
                element.dataset
                    .i18nPlaceholder;


            if (
                !key
            ) {

                return;

            }


            element.setAttribute(
                "placeholder",
                translate(
                    key
                )
            );

        }
    );

}


/* ============================================================
   TRANSLATE TITLES
============================================================ */

function translateTitles(
    root =
        document
) {

    const elements =
        root.querySelectorAll(
            "[data-i18n-title]"
        );


    elements.forEach(
        element => {

            const key =
                element.dataset
                    .i18nTitle;


            if (
                !key
            ) {

                return;

            }


            element.setAttribute(
                "title",
                translate(
                    key
                )
            );

        }
    );

}


/* ============================================================
   TRANSLATE ARIA LABELS
============================================================ */

function translateAriaLabels(
    root =
        document
) {

    const elements =
        root.querySelectorAll(
            "[data-i18n-aria-label]"
        );


    elements.forEach(
        element => {

            const key =
                element.dataset
                    .i18nAriaLabel;


            if (
                !key
            ) {

                return;

            }


            element.setAttribute(
                "aria-label",
                translate(
                    key
                )
            );

        }
    );

}


/* ============================================================
   TRANSLATE ATTRIBUTES
============================================================ */

function translateAttributes(
    root =
        document
) {

    const elements =
        root.querySelectorAll(
            "[data-i18n-attr]"
        );


    elements.forEach(
        element => {

            const specification =
                element.dataset
                    .i18nAttr;


            if (
                !specification
            ) {

                return;

            }


            const pairs =
                specification
                    .split(
                        ","
                    );


            pairs.forEach(
                pair => {

                    const separator =
                        pair.indexOf(
                            ":"
                        );


                    if (
                        separator ===
                        -1
                    ) {

                        return;

                    }


                    const attribute =
                        pair.slice(
                            0,
                            separator
                        ).trim();


                    const key =
                        pair.slice(
                            separator +
                            1
                        ).trim();


                    if (
                        !attribute ||
                        !key
                    ) {

                        return;

                    }


                    element.setAttribute(
                        attribute,
                        translate(
                            key
                        )
                    );

                }
            );

        }
    );

}


/* ============================================================
   TRANSLATE VALUE ATTRIBUTES
============================================================ */

function translateValues(
    root =
        document
) {

    const elements =
        root.querySelectorAll(
            "[data-i18n-value]"
        );


    elements.forEach(
        element => {

            const key =
                element.dataset
                    .i18nValue;


            if (
                !key
            ) {

                return;

            }


            element.value =
                translate(
                    key
                );

        }
    );

}


/* ============================================================
   TRANSLATE DOCUMENT
============================================================ */

function translateDocument(
    root =
        document
) {

    translateElements(
        root
    );

    translateHtmlElements(
        root
    );

    translatePlaceholders(
        root
    );

    translateTitles(
        root
    );

    translateAriaLabels(
        root
    );

    translateAttributes(
        root
    );

    translateValues(
        root
    );


    document.documentElement
        .setAttribute(
            "lang",
            I18N_STATE.locale
        );


    document.documentElement
        .setAttribute(
            "dir",
            I18N_STATE.direction
        );


    document.documentElement
        .setAttribute(
            "data-locale",
            I18N_STATE.locale
        );


    document.documentElement
        .setAttribute(
            "data-language",
            I18N_STATE.language
        );


    document.documentElement
        .setAttribute(
            "data-direction",
            I18N_STATE.direction
        );

}


/* ============================================================
   LOAD CLDR LANGUAGE NAMES
============================================================ */

async function loadCLDRLanguageNames() {

    if (
        I18N_STATE
            .cldr
            .loaded
    ) {

        return I18N_STATE
            .cldr
            .languageNames;

    }


    try {

        const response =
            await fetch(
                I18N_CONFIG
                    .languageNamesUrl,
                {

                    cache:
                        I18N_CONFIG
                            .translationCacheMode

                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `CLDR language names returned ${response.status}`
            );

        }


        const data =
            await response.json();


        I18N_STATE
            .cldr
            .languageNames =
            data
                ?.main
                ?.[
                    I18N_CONFIG
                        .languageNamesLocale
                ]
                ?.localeDisplayNames
                ?.languages
                || {};


        I18N_STATE
            .cldr
            .loaded =
            true;


        return I18N_STATE
            .cldr
            .languageNames;

    }

    catch (
        error
    ) {

        I18N_STATE
            .cldr
            .error =
            error;


        console.warn(
            "NutriCycle AI — CLDR language names could not be loaded:",
            error
        );


        return {};

    }

}


/* ============================================================
   LANGUAGE DISPLAY NAME
============================================================ */

function getLanguageName(
    languageCode,
    displayLocale =
        I18N_STATE.locale
) {

    const code =
        safeString(
            languageCode
        );


    if (
        !code
    ) {

        return "";

    }


    /*
       Native Intl.DisplayNames
       is preferred because the
       browser's locale data is
       CLDR-backed.
    */

    try {

        if (
            typeof Intl.DisplayNames ===
                "function"
        ) {

            const displayNames =
                new Intl.DisplayNames(
                    [
                        normalizeLocale(
                            displayLocale
                        )
                    ],
                    {
                        type:
                            "language"
                    }
                );


            const result =
                displayNames.of(
                    code
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


    /*
       CLDR English language-name
       fallback.
    */

    const cldrNames =
        I18N_STATE
            .cldr
            .languageNames
        || {};


    return (
        cldrNames[
            code
        ] ||
        code
    );

}


/* ============================================================
   REGION DISPLAY NAME
============================================================ */

function getRegionName(
    regionCode,
    displayLocale =
        I18N_STATE.locale
) {

    const code =
        safeString(
            regionCode
        ).toUpperCase();


    if (
        !code
    ) {

        return "";

    }


    try {

        if (
            typeof Intl.DisplayNames ===
                "function"
        ) {

            const displayNames =
                new Intl.DisplayNames(
                    [
                        normalizeLocale(
                            displayLocale
                        )
                    ],
                    {
                        type:
                            "region"
                    }
                );


            return (
                displayNames.of(
                    code
                ) ||
                code
            );

        }

    }

    catch {

        return code;

    }


    return code;

}


/* ============================================================
   CURRENCY DISPLAY NAME
============================================================ */

function getCurrencyName(
    currencyCode,
    displayLocale =
        I18N_STATE.locale
) {

    const code =
        safeString(
            currencyCode
        ).toUpperCase();


    if (
        !code
    ) {

        return "";

    }


    try {

        if (
            typeof Intl.DisplayNames ===
                "function"
        ) {

            const displayNames =
                new Intl.DisplayNames(
                    [
                        normalizeLocale(
                            displayLocale
                        )
                    ],
                    {
                        type:
                            "currency"
                    }
                );


            return (
                displayNames.of(
                    code
                ) ||
                code
            );

        }

    }

    catch {

        return code;

    }


    return code;

}


/* ============================================================
   FORMAT NUMBER
============================================================ */

function formatNumber(
    value,
    options = {},
    locale =
        I18N_STATE.locale
) {

    try {

        return new Intl.NumberFormat(
            normalizeLocale(
                locale
            ),
            options
        ).format(
            Number(
                value
            )
        );

    }

    catch {

        return String(
            value
        );

    }

}


/* ============================================================
   FORMAT INTEGER
============================================================ */

function formatInteger(
    value,
    options = {},
    locale =
        I18N_STATE.locale
) {

    return formatNumber(
        value,
        {

            maximumFractionDigits:
                0,

            ...options

        },
        locale
    );

}


/* ============================================================
   FORMAT PERCENT
============================================================ */

function formatPercent(
    value,
    options = {},
    locale =
        I18N_STATE.locale
) {

    let normalizedValue =
        Number(
            value
        );


    /*
       Convenience behaviour:
       values between 1 and 100
       are interpreted as percent
       numbers only when explicitly
       requested through the option.

       Default remains Intl-native:
       0.75 => 75%.
    */

    if (
        options
            .inputIsPercent ===
            true
    ) {

        normalizedValue /=
            100;

    }


    const formatterOptions = {
        style:
            "percent",

        ...options

    };


    delete formatterOptions
        .inputIsPercent;


    return formatNumber(
        normalizedValue,
        formatterOptions,
        locale
    );

}


/* ============================================================
   FORMAT CURRENCY
============================================================ */

function formatCurrency(
    value,
    currency,
    options = {},
    locale =
        I18N_STATE.locale
) {

    const normalizedCurrency =
        safeString(
            currency
        ).toUpperCase();


    if (
        !normalizedCurrency
    ) {

        return formatNumber(
            value,
            options,
            locale
        );

    }


    return formatNumber(
        value,
        {

            style:
                "currency",

            currency:
                normalizedCurrency,

            ...options

        },
        locale
    );

}


/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(
    value,
    options = {},
    locale =
        I18N_STATE.locale
) {

    try {

        const date =
            value instanceof Date
                ? value
                : new Date(
                    value
                );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(
                value
            );

        }


        return new Intl.DateTimeFormat(
            normalizeLocale(
                locale
            ),
            options
        ).format(
            date
        );

    }

    catch {

        return String(
            value
        );

    }

}


/* ============================================================
   FORMAT TIME
============================================================ */

function formatTime(
    value,
    options = {},
    locale =
        I18N_STATE.locale
) {

    return formatDate(
        value,
        {

            hour:
                "numeric",

            minute:
                "2-digit",

            ...options

        },
        locale
    );

}


/* ============================================================
   FORMAT DATE + TIME
============================================================ */

function formatDateTime(
    value,
    options = {},
    locale =
        I18N_STATE.locale
) {

    return formatDate(
        value,
        {

            dateStyle:
                "medium",

            timeStyle:
                "short",

            ...options

        },
        locale
    );

}


/* ============================================================
   FORMAT LIST
============================================================ */

function formatList(
    values,
    options = {},
    locale =
        I18N_STATE.locale
) {

    const items =
        Array.isArray(
            values
        )
            ? values
            : [];


    try {

        if (
            typeof Intl.ListFormat ===
                "function"
        ) {

            return new Intl.ListFormat(
                normalizeLocale(
                    locale
                ),
                options
            ).format(
                items
            );

        }

    }

    catch {

        /* Continue to safe fallback. */

    }


    return items.join(
        ", "
    );

}


/* ============================================================
   PLURAL CATEGORY
============================================================ */

function getPluralCategory(
    value,
    options = {},
    locale =
        I18N_STATE.locale
) {

    try {

        return new Intl.PluralRules(
            normalizeLocale(
                locale
            ),
            options
        ).select(
            Number(
                value
            )
        );

    }

    catch {

        return "other";

    }

}


/* ============================================================
   SELECT PLURAL MESSAGE
============================================================ */

function plural(
    value,
    messages,
    options = {},
    locale =
        I18N_STATE.locale
) {

    if (
        !messages ||
        typeof messages !==
            "object"
    ) {

        return "";

    }


    const category =
        getPluralCategory(
            value,
            options,
            locale
        );


    const selected =
        messages[
            category
        ] ??
        messages
            .other ??
        "";


    return interpolate(
        selected,
        {

            count:
                formatNumber(
                    value,
                    {},
                    locale
                ),

            value:
                value

        }
    );

}


/* ============================================================
   RELATIVE TIME
============================================================ */

function formatRelativeTime(
    value,
    unit,
    options = {},
    locale =
        I18N_STATE.locale
) {

    try {

        if (
            typeof Intl.RelativeTimeFormat ===
                "function"
        ) {

            return new Intl.RelativeTimeFormat(
                normalizeLocale(
                    locale
                ),
                {

                    numeric:
                        "auto",

                    ...options

                }
            ).format(
                Number(
                    value
                ),
                unit
            );

        }

    }

    catch {

        /* Continue to fallback. */

    }


    return `${value} ${unit}`;

}


/* ============================================================
   GET LOCALE DECIMAL / CURRENCY SYMBOL
============================================================ */

function getCurrencyParts(
    currency,
    locale =
        I18N_STATE.locale
) {

    try {

        const formatter =
            new Intl.NumberFormat(
                normalizeLocale(
                    locale
                ),
                {

                    style:
                        "currency",

                    currency:
                        safeString(
                            currency
                        ).toUpperCase(),

                    currencyDisplay:
                        "symbol"

                }
            );


        return formatter
            .formatToParts(
                1
            );

    }

    catch {

        return [];

    }

}


/* ============================================================
   SEGMENT TEXT
============================================================ */

function segmentText(
    text,
    granularity =
        "grapheme",
    locale =
        I18N_STATE.locale
) {

    if (
        typeof Intl.Segmenter !==
            "function"
    ) {

        return [
            ...safeString(
                text
            )
        ];

    }


    try {

        const segmenter =
            new Intl.Segmenter(
                normalizeLocale(
                    locale
                ),
                {
                    granularity
                }
            );


        return [
            ...segmenter.segment(
                safeString(
                    text
                )
            )
        ];

    }

    catch {

        return [
            ...safeString(
                text
            )
        ];

    }

}


/* ============================================================
   DISPLAY LOCALE NAME
============================================================ */

function getLocaleDisplayName(
    locale,
    displayLocale =
        I18N_STATE.locale
) {

    const normalized =
        normalizeLocale(
            locale
        );


    try {

        if (
            typeof Intl.DisplayNames ===
                "function"
        ) {

            const displayNames =
                new Intl.DisplayNames(
                    [
                        normalizeLocale(
                            displayLocale
                        )
                    ],
                    {
                        type:
                            "language"
                    }
                );


            const languageName =
                displayNames.of(
                    getLocaleParts(
                        normalized
                    ).language
                );


            return (
                languageName ||
                normalized
            );

        }

    }

    catch {

        /* Fall through. */

    }


    return normalized;

}


/* ============================================================
   LOCALE CATALOG NORMALIZATION
============================================================ */

function normalizeLocaleCatalog(
    manifest
) {

    let source =
        manifest;


    if (
        manifest &&
        typeof manifest ===
            "object" &&
        !Array.isArray(
            manifest
        )
    ) {

        source =
            manifest.locales ??
            manifest.languages ??
            manifest.availableLocales ??
            [];

    }


    if (
        !Array.isArray(
            source
        )
    ) {

        return [];

    }


    const catalog =
        [];


    source.forEach(
        entry => {

            let locale =
                "";

            let name =
                "";

            let nativeName =
                "";


            if (
                typeof entry ===
                    "string"
            ) {

                locale =
                    normalizeLocale(
                        entry
                    );

            }

            else if (
                entry &&
                typeof entry ===
                    "object"
            ) {

                locale =
                    normalizeLocale(
                        entry.locale ??
                        entry.code ??
                        entry.id ??
                        ""
                    );

                name =
                    safeString(
                        entry.name
                    );

                nativeName =
                    safeString(
                        entry.nativeName
                    );

            }


            if (
                !locale
            ) {

                return;

            }


            if (
                catalog.some(
                    item =>
                        item.locale ===
                        locale
                )
            ) {

                return;

            }


            catalog.push({

                locale:
                    locale,

                language:
                    getLocaleParts(
                        locale
                    ).language,

                script:
                    getLocaleParts(
                        locale
                    ).script,

                region:
                    getLocaleParts(
                        locale
                    ).region,

                name:
                    name ||
                    getLocaleDisplayName(
                        locale,
                        I18N_CONFIG
                            .languageNamesLocale
                    ),

                nativeName:
                    nativeName ||
                    getLocaleDisplayName(
                        locale,
                        locale
                    ),

                direction:
                    getDirection(
                        locale
                    )

            });

        }
    );


    return catalog.sort(
        (
            first,
            second
        ) => {

            return first.name
                .localeCompare(
                    second.name,
                    I18N_STATE.locale
                );

        }
    );

}


/* ============================================================
   LOAD LOCALE MANIFEST
============================================================ */

async function loadLocaleManifest() {

    if (
        !I18N_CONFIG
            .enableLocaleManifest
    ) {

        return [];

    }


    try {

        const response =
            await fetch(
                I18N_CONFIG
                    .localeManifestPath,
                {

                    cache:
                        I18N_CONFIG
                            .translationCacheMode

                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `Locale manifest returned ${response.status}`
            );

        }


        const manifest =
            await response.json();


        const catalog =
            normalizeLocaleCatalog(
                manifest
            );


        I18N_STATE
            .localeCatalog =
            catalog;


        catalog.forEach(
            item => {

                I18N_STATE
                    .availableLocales
                    .add(
                        item.locale
                    );

            }
        );


        return catalog;

    }

    catch (
        error
    ) {

        console.warn(
            "NutriCycle AI — Locale manifest could not be loaded:",
            error
        );


        /*
           The application remains usable
           even without the manifest.
        */

        I18N_STATE
            .localeCatalog =
            [];


        return [];

    }

}


/* ============================================================
   ADD LOCALE TO CATALOG
============================================================ */

function registerLocale(
    locale,
    metadata = {}
) {

    const normalized =
        normalizeLocale(
            locale
        );


    if (
        !normalized
    ) {

        return null;

    }


    const existingIndex =
        I18N_STATE
            .localeCatalog
            .findIndex(
                item =>
                    item.locale ===
                    normalized
            );


    const parts =
        getLocaleParts(
            normalized
        );


    const entry = {

        locale:
            normalized,

        language:
            parts.language,

        script:
            parts.script,

        region:
            parts.region,

        name:
            metadata.name ||
            getLocaleDisplayName(
                normalized
            ),

        nativeName:
            metadata.nativeName ||
            getLocaleDisplayName(
                normalized,
                normalized
            ),

        direction:
            getDirection(
                normalized
            ),

        enabled:
            metadata.enabled !==
                false

    };


    if (
        existingIndex >=
        0
    ) {

        I18N_STATE
            .localeCatalog[
                existingIndex
            ] =
            {

                ...I18N_STATE
                    .localeCatalog[
                        existingIndex
                    ],

                ...entry

            };

    }

    else {

        I18N_STATE
            .localeCatalog
            .push(
                entry
            );

    }


    I18N_STATE
        .availableLocales
        .add(
            normalized
        );


    return entry;

}


/* ============================================================
   SET LOCALE
============================================================ */

async function setLocale(
    locale,
    options = {}
) {

    const normalized =
        normalizeLocale(
            locale
        );


    await ensureFallbackLoaded();


    /*
       Load requested locale if possible.
       Its exact locale remains selected
       even when translation data falls back.
    */

    await loadLocale(
        normalized
    );


    updateLocaleState(
        normalized
    );


    if (
        options.persist !==
            false
    ) {

        saveLocale(
            normalized
        );

    }


    translateDocument();


    document.dispatchEvent(
        new CustomEvent(
            "nutricycle:localechange",
            {

                detail: {

                    locale:
                        I18N_STATE.locale,

                    language:
                        I18N_STATE.language,

                    script:
                        I18N_STATE.script,

                    region:
                        I18N_STATE.region,

                    direction:
                        I18N_STATE.direction

                }

            }
        )
    );


    return I18N_STATE.locale;

}


/* ============================================================
   REFRESH TRANSLATIONS
============================================================ */

function refresh(
    root =
        document
) {

    translateDocument(
        root
    );


    return I18N_STATE.locale;

}


/* ============================================================
   LOCALE INFORMATION
============================================================ */

function getLocaleInfo(
    locale =
        I18N_STATE.locale
) {

    const normalized =
        normalizeLocale(
            locale
        );


    const parts =
        getLocaleParts(
            normalized
        );


    return {

        locale:
            normalized,

        language:
            parts.language,

        script:
            parts.script,

        region:
            parts.region,

        direction:
            getDirection(
                normalized
            )

    };

}


/* ============================================================
   AVAILABLE LOCALES
============================================================ */

function getAvailableLocales() {

    return [
        ...I18N_STATE
            .localeCatalog
    ];

}


/* ============================================================
   IS RTL
============================================================ */

function isRTL(
    locale =
        I18N_STATE.locale
) {

    return (
        getDirection(
            locale
        ) ===
        "rtl"
    );

}


/* ============================================================
   CREATE TRANSLATION MESSAGE
============================================================ */

function message(
    key,
    variables = {}
) {

    return translate(
        key,
        variables
    );

}


/* ============================================================
   OBSERVER
============================================================ */

function stopMutationObserver() {

    if (
        I18N_STATE
            .observer
    ) {

        I18N_STATE
            .observer
            .disconnect();


        I18N_STATE
            .observer =
            null;

    }

}


function startMutationObserver() {

    if (
        !I18N_CONFIG
            .enableMutationObserver
    ) {

        return;

    }


    if (
        typeof MutationObserver !==
            "function"
    ) {

        return;

    }


    stopMutationObserver();


    I18N_STATE
        .observer =
        new MutationObserver(
            mutations => {

                let shouldRefresh =
                    false;


                mutations.forEach(
                    mutation => {

                        if (
                            mutation.type !==
                            "childList"
                        ) {

                            return;

                        }


                        if (
                            mutation
                                .addedNodes
                                .length >
                            0
                        ) {

                            shouldRefresh =
                                true;

                        }

                    }
                );


                if (
                    !shouldRefresh
                ) {

                    return;

                }


                if (
                    I18N_STATE
                        .mutationTimer
                ) {

                    clearTimeout(
                        I18N_STATE
                            .mutationTimer
                    );

                }


                I18N_STATE
                    .mutationTimer =
                    setTimeout(
                        () => {

                            I18N_STATE
                                .mutationTimer =
                                null;


                            translateDocument();

                        },
                        I18N_CONFIG
                            .mutationDebounceMs
                    );

            }
        );


    I18N_STATE
        .observer
        .observe(
            document.body ||
                document.documentElement,
            {

                childList:
                    true,

                subtree:
                    true

            }
        );

}


/* ============================================================
   INITIALIZE
============================================================ */

async function initializeI18n() {

    if (
        I18N_STATE
            .initialized
    ) {

        return I18N_STATE
            .locale;

    }


    updateLocaleState(
        I18N_CONFIG
            .defaultLocale
    );


    /*
       Register the default locale
       immediately so the system
       always has a valid locale.
    */

    registerLocale(
        I18N_CONFIG
            .defaultLocale
    );


    /*
       Load the English fallback first.
    */

    await ensureFallbackLoaded();


    /*
       Load CLDR language names
       without making startup fail
       when CDN access is unavailable.
    */

    await loadCLDRLanguageNames();


    /*
       Load the locale catalog.
    */

    await loadLocaleManifest();


    /*
       Restore the user's saved locale.
    */

    const savedLocale =
        getSavedLocale();


    await setLocale(
        savedLocale,
        {
            persist:
                false
        }
    );


    /*
       Ensure common defaults
       are registered.
    */

    registerLocale(
        I18N_CONFIG
            .fallbackLocale
    );


    /*
       Start observing dynamic UI.
    */

    startMutationObserver();


    I18N_STATE
        .initialized =
        true;


    translateDocument();


    console.log(
        "NutriCycle AI — Global I18n Engine Ready:",
        {

            locale:
                I18N_STATE.locale,

            language:
                I18N_STATE.language,

            direction:
                I18N_STATE.direction,

            cldr:
                I18N_CONFIG
                    .cldrVersion,

            availableLocales:
                I18N_STATE
                    .localeCatalog
                    .length

        }
    );


    return I18N_STATE
        .locale;

}


/* ============================================================
   PUBLIC API
============================================================ */

const I18n = Object.freeze({

    /*
       Lifecycle
    */

    initialize:
        initializeI18n,

    refresh:
        refresh,

    setLocale:
        setLocale,


    /*
       Locale state
    */

    getLocale:
        () =>
            I18N_STATE.locale,

    getLocaleInfo:
        getLocaleInfo,

    getAvailableLocales:
        getAvailableLocales,

    normalizeLocale:
        normalizeLocale,

    getLocaleFallbackChain:
        getLocaleFallbackChain,

    isRTL:
        isRTL,


    /*
       Translation
    */

    translate:
        translate,

    t:
        translate,

    message:
        message,

    hasTranslation:
        hasTranslation,


    /*
       Language / region / currency
       display names
    */

    getLanguageName:
        getLanguageName,

    getRegionName:
        getRegionName,

    getCurrencyName:
        getCurrencyName,

    getLocaleDisplayName:
        getLocaleDisplayName,


    /*
       CLDR-backed formatting
    */

    formatNumber:
        formatNumber,

    formatInteger:
        formatInteger,

    formatPercent:
        formatPercent,

    formatCurrency:
        formatCurrency,

    formatDate:
        formatDate,

    formatTime:
        formatTime,

    formatDateTime:
        formatDateTime,

    formatList:
        formatList,

    formatRelativeTime:
        formatRelativeTime,

    getPluralCategory:
        getPluralCategory,

    plural:
        plural,

    getCurrencyParts:
        getCurrencyParts,

    segmentText:
        segmentText,


    /*
       Catalog management
    */

    registerLocale:
        registerLocale,

    loadLocale:
        loadLocale,

    loadLocaleManifest:
        loadLocaleManifest,

    loadCLDRLanguageNames:
        loadCLDRLanguageNames,


    /*
       Direction
    */

    getDirection:
        getDirection,


    /*
       Diagnostics
    */

    getState:
        () => ({

            locale:
                I18N_STATE.locale,

            language:
                I18N_STATE.language,

            script:
                I18N_STATE.script,

            region:
                I18N_STATE.region,

            direction:
                I18N_STATE.direction,

            initialized:
                I18N_STATE.initialized,

            loadedLocales:
                [
                    ...I18N_STATE
                        .loadedLocales
                ],

            availableLocales:
                I18N_STATE
                    .localeCatalog
                    .map(
                        item =>
                            item.locale
                    ),

            cldrVersion:
                I18N_CONFIG
                    .cldrVersion,

            cldrLoaded:
                I18N_STATE
                    .cldr
                    .loaded

        })

});


/* ============================================================
   GLOBAL EXPORT
============================================================ */

if (
    typeof window !==
        "undefined"
) {

    window.NutriCycleI18n =
        I18n;

}


/* ============================================================
   AUTO INITIALIZATION
============================================================ */

if (
    typeof document !==
        "undefined"
) {

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            () => {

                initializeI18n();

            },
            {
                once:
                    true
            }
        );

    }

    else {

        initializeI18n();

    }

}


/* ============================================================
   ES MODULE EXPORT
============================================================ */

export default I18n;