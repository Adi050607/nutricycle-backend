/* ============================================================
   NutriCycle AI
   Internationalization Engine
   Version 1.0
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
    "/locales"

});


/* ============================================================
   STATE
============================================================ */

const I18N_STATE = {

    locale:
        I18N_CONFIG.defaultLocale,

    translations:
        {},

    loadedLocales:
        new Set(),

    initialized:
        false

};


/* ============================================================
   LOCALE STORAGE
============================================================ */

const LOCALE_STORAGE_KEY =
    "nutricycle_locale";


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
            .defaultLocale;

    }


    try {

        return Intl.getCanonicalLocales(
            locale
        )[0];

    }

    catch {

        return I18N_CONFIG
            .defaultLocale;

    }

}


/* ============================================================
   GET SAVED LOCALE
============================================================ */

function getSavedLocale() {

    try {

        const saved =
            localStorage.getItem(
                LOCALE_STORAGE_KEY
            );


        return normalizeLocale(
            saved
        );

    }

    catch {

        return I18N_CONFIG
            .defaultLocale;

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
            LOCALE_STORAGE_KEY,
            normalizeLocale(
                locale
            )
        );

    }

    catch (error) {

        console.warn(
            "NutriCycle AI — Unable to save locale:",
            error
        );

    }

}


/* ============================================================
   LOAD TRANSLATION FILE
============================================================ */

async function loadLocale(
    locale
) {

    const normalizedLocale =
        normalizeLocale(
            locale
        );


    if (
        I18N_STATE.loadedLocales
            .has(
                normalizedLocale
            )
    ) {

        return I18N_STATE
            .translations[
                normalizedLocale
            ];

    }


    const url =
        `${I18N_CONFIG.translationsBasePath}/${encodeURIComponent(
            normalizedLocale
        )}.json`;


    try {

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
                `Translation file returned ${response.status}`
            );

        }


        const messages =
            await response.json();


        if (
            !messages ||
            typeof messages !==
                "object"
        ) {

            throw new Error(
                "Translation file is not a valid object."
            );

        }


        I18N_STATE
            .translations[
                normalizedLocale
            ] =
            messages;


        I18N_STATE
            .loadedLocales
            .add(
                normalizedLocale
            );


        return messages;

    }

    catch (error) {

        console.error(
            `NutriCycle AI — Failed to load locale "${normalizedLocale}":`,
            error
        );


        /*
         * If the requested locale is not
         * available, attempt the fallback.
         */

        if (
            normalizedLocale !==
            I18N_CONFIG
                .fallbackLocale
        ) {

            return loadLocale(
                I18N_CONFIG
                    .fallbackLocale
            );

        }


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
        key.split(".");


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
            value[part];

    }


    return typeof value ===
        "string"
        ? value
        : null;

}


/* ============================================================
   ICU-LIKE VARIABLE INTERPOLATION
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
        /\{\{(\w+)\}\}/g,
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
                : String(value);

        }
    );

}


/* ============================================================
   TRANSLATE KEY
============================================================ */

function translate(
    key,
    variables = {}
) {

    const currentMessages =
        I18N_STATE
            .translations[
                I18N_STATE.locale
            ]
        || {};


    let message =
        getMessage(
            currentMessages,
            key
        );


    /*
     * Fallback to English.
     */

    if (
        !message &&
        I18N_STATE.locale !==
            I18N_CONFIG.fallbackLocale
    ) {

        message =
            getMessage(
                I18N_STATE
                    .translations[
                        I18N_CONFIG
                            .fallbackLocale
                    ]
                || {},
                key
            );

    }


    /*
     * If the translation is genuinely
     * unavailable, expose the key rather
     * than silently rendering blank UI.
     */

    if (!message) {

        return key;

    }


    return interpolate(
        message,
        variables
    );

}


/* ============================================================
   TRANSLATE ELEMENT TEXT
============================================================ */

function translateElements() {

    const elements =
        document.querySelectorAll(
            "[data-i18n]"
        );


    elements.forEach(
        element => {

            const key =
                element.dataset.i18n;


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
   TRANSLATE PLACEHOLDERS
============================================================ */

function translatePlaceholders() {

    const elements =
        document.querySelectorAll(
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

function translateTitles() {

    const elements =
        document.querySelectorAll(
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

function translateAriaLabels() {

    const elements =
        document.querySelectorAll(
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
   TRANSLATE DOCUMENT
============================================================ */

function translateDocument() {

    translateElements();

    translatePlaceholders();

    translateTitles();

    translateAriaLabels();


    /*
     * Update document language.
     */

    document.documentElement
        .setAttribute(
            "lang",
            I18N_STATE.locale
        );


    /*
     * Determine writing direction.
     */

    const language =
        new Intl.Locale(
            I18N_STATE.locale
        ).language;


    const rtlLanguages =
        new Set(
            [
                "ar",
                "fa",
                "he",
                "ur",
                "ps",
                "sd",
                "yi"
            ]
        );


    document.documentElement
        .setAttribute(
            "dir",
            rtlLanguages.has(
                language
            )
                ? "rtl"
                : "ltr"
        );

}


/* ============================================================
   SET LOCALE
============================================================ */

async function setLocale(
    locale
) {

    const normalizedLocale =
        normalizeLocale(
            locale
        );


    await loadLocale(
        normalizedLocale
    );


    I18N_STATE.locale =
        normalizedLocale;


    saveLocale(
        normalizedLocale
    );


    translateDocument();


    document.dispatchEvent(
        new CustomEvent(
            "nutricycle:localechange",
            {
                detail: {

                    locale:
                        normalizedLocale

                }

            }
        )
    );


    return normalizedLocale;

}


/* ============================================================
   INITIALIZE
============================================================ */

async function initializeI18n() {

    const savedLocale =
        getSavedLocale();


    await loadLocale(
        I18N_CONFIG
            .fallbackLocale
    );


    await setLocale(
        savedLocale
    );


    I18N_STATE.initialized =
        true;


    return I18N_STATE.locale;

}


/* ============================================================
   PUBLIC API
============================================================ */

const I18n = {
    initialize: initializeI18n,
    setLocale: setLocale,
    getLocale: () => I18N_STATE.locale,
    translate: translate,
    refresh: translateDocument
};

export default I18n;