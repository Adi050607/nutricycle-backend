/* ============================================================
   NutriCycle AI
   GLOBAL RUNTIME TRANSLATOR
   ------------------------------------------------------------
   This layer complements the key-based i18n engine by translating
   previously untagged static text and dynamically inserted text
   at runtime. The selected locale is taken from the same
   localStorage key used by js/i18n.js.
============================================================ */

(() => {
    "use strict";

    const CONFIG = Object.freeze({
        sourceLocale: "en",
        localeStorageKey: "nutricycle_locale",
        apiUrl:
            "https://food-rescue-app-4jnl.onrender.com/translate",
        cacheStorageKey:
            "nutricycle_runtime_translation_cache_v1",
        maxBatch: 35,
        maxCacheEntries: 1500,
        debounceMs: 120
    });

    const ORIGINAL_TEXT = new WeakMap();
    const ORIGINAL_ATTRIBUTES = new WeakMap();
    const pendingElements = new Set();
    const inFlight = new Set();

    let activeLocale = "en";
    let observer = null;
    let scheduled = false;

    const RTL_LANGUAGES = new Set([
        "ar", "arc", "ckb", "dv", "fa", "he", "ku",
        "nqo", "ps", "sd", "syr", "ug", "ur", "yi"
    ]);

    function normalizeLocale(locale) {
        if (!locale || typeof locale !== "string") return CONFIG.sourceLocale;

        try {
            return Intl.getCanonicalLocales(locale.replace(/_/g, "-"))[0];
        } catch (_) {
            return CONFIG.sourceLocale;
        }
    }

    function languagePart(locale) {
        return normalizeLocale(locale).split("-")[0].toLowerCase();
    }

    function isRTL(locale) {
        return RTL_LANGUAGES.has(languagePart(locale));
    }

    function getStoredLocale() {
        try {
            return normalizeLocale(
                localStorage.getItem(CONFIG.localeStorageKey) || CONFIG.sourceLocale
            );
        } catch (_) {
            return CONFIG.sourceLocale;
        }
    }

    function readCache() {
        try {
            const raw = localStorage.getItem(CONFIG.cacheStorageKey);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function writeCache(cache) {
        try {
            const entries = Object.entries(cache);
            if (entries.length > CONFIG.maxCacheEntries) {
                const trimmed = Object.fromEntries(
                    entries.slice(entries.length - CONFIG.maxCacheEntries)
                );
                localStorage.setItem(
                    CONFIG.cacheStorageKey,
                    JSON.stringify(trimmed)
                );
                return;
            }
            localStorage.setItem(CONFIG.cacheStorageKey, JSON.stringify(cache));
        } catch (_) {
            /* Cache is an optimization; translation must still work without it. */
        }
    }

    function cacheKey(locale, text) {
        return `${CONFIG.sourceLocale}|${locale}|${text}`;
    }

    function isIgnorableText(value) {
        const text = value.trim();
        if (!text || text.length < 2) return true;
        if (/^(https?:\/\/|www\.)/i.test(text)) return true;
        if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(text)) return true;
        if (/^[\d\s.,:%+\-/#()]+$/.test(text)) return true;
        return false;
    }

    function hasIgnoredAncestor(node) {
        let element = node.nodeType === Node.ELEMENT_NODE
            ? node
            : node.parentElement;

        while (element) {
            if (
                element.matches(
                    "script,style,noscript,template,pre,code,[data-i18n-ignore]"
                )
            ) {
                return true;
            }
            element = element.parentElement;
        }

        return false;
    }

    function preserveWhitespace(original, translated) {
        const leading = original.match(/^\s*/)?.[0] || "";
        const trailing = original.match(/\s*$/)?.[0] || "";
        return `${leading}${translated.trim()}${trailing}`;
    }

    function getOriginalTextNode(node) {
        if (!ORIGINAL_TEXT.has(node)) {
            ORIGINAL_TEXT.set(node, node.nodeValue || "");
        }
        return ORIGINAL_TEXT.get(node) || "";
    }

    function getOriginalAttribute(element, attribute) {
        let attributes = ORIGINAL_ATTRIBUTES.get(element);

        if (!attributes) {
            attributes = {};
            ORIGINAL_ATTRIBUTES.set(element, attributes);
        }

        if (!(attribute in attributes)) {
            attributes[attribute] = element.getAttribute(attribute) || "";
        }

        return attributes[attribute];
    }

    function collectTextNodes(root) {
        const nodes = [];

        const walker = document.createTreeWalker(
            root || document.body,
            NodeFilter.SHOW_TEXT
        );

        let node;
        while ((node = walker.nextNode())) {
            if (hasIgnoredAncestor(node)) continue;

            const original = getOriginalTextNode(node);
            if (isIgnorableText(original)) continue;

            nodes.push({
                node,
                text: original.trim()
            });
        }

        return nodes;
    }

    function collectAttributes(root) {
        const elements = [];
        const container = root && root.nodeType === Node.ELEMENT_NODE
            ? root
            : document.body;

        const selector =
            "[placeholder],[title],[aria-label],[alt]";

        if (container.matches?.(selector)) {
            elements.push(container);
        }

        elements.push(...container.querySelectorAll?.(selector) || []);

        return elements;
    }

    function getTranslationCandidates(root = document.body) {
        const candidates = [];
        const seen = new Set();

        for (const item of collectTextNodes(root)) {
            const key = cacheKey(activeLocale, item.text);
            if (!seen.has(key)) {
                seen.add(key);
                candidates.push({
                    kind: "text",
                    target: item.node,
                    original: item.text,
                    key
                });
            }
        }

        for (const element of collectAttributes(root)) {
            if (hasIgnoredAncestor(element)) continue;

            for (const attribute of ["placeholder", "title", "aria-label", "alt"]) {
                if (!element.hasAttribute(attribute)) continue;

                const original = getOriginalAttribute(element, attribute);
                if (isIgnorableText(original)) continue;

                const key = cacheKey(activeLocale, original.trim());
                if (seen.has(key)) continue;

                seen.add(key);
                candidates.push({
                    kind: "attribute",
                    target: element,
                    attribute,
                    original: original.trim(),
                    key
                });
            }
        }

        /* Static input button/submit values are user-visible text. */
        const valueElements = root.querySelectorAll?.(
            'input[type="button"][value],input[type="submit"][value]'
        ) || [];

        for (const element of valueElements) {
            const original = getOriginalAttribute(element, "value");
            if (isIgnorableText(original)) continue;

            const key = cacheKey(activeLocale, original.trim());
            if (seen.has(key)) continue;

            seen.add(key);
            candidates.push({
                kind: "attribute",
                target: element,
                attribute: "value",
                original: original.trim(),
                key
            });
        }

        return candidates;
    }

    function restoreEnglish() {
        document.querySelectorAll("body *").forEach(element => {
            const attributes = ORIGINAL_ATTRIBUTES.get(element);
            if (attributes) {
                for (const [attribute, value] of Object.entries(attributes)) {
                    element.setAttribute(attribute, value);
                }
            }
        });

        const textNodes = collectTextNodes(document.body);
        for (const { node } of textNodes) {
            const original = ORIGINAL_TEXT.get(node);
            if (typeof original === "string") {
                node.nodeValue = original;
            }
        }
    }

    async function requestTranslations(texts) {
        const response = await fetch(CONFIG.apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sourceLocale: CONFIG.sourceLocale,
                targetLocale: activeLocale,
                texts
            })
        });

        if (!response.ok) {
            throw new Error(`Translation gateway returned ${response.status}`);
        }

        const data = await response.json();

        if (!data?.success || !Array.isArray(data.translations)) {
            throw new Error("Translation gateway returned an invalid response.");
        }

        if (data.translations.length !== texts.length) {
            throw new Error("Translation gateway returned an unexpected item count.");
        }

        return data.translations.map(String);
    }

    function applyTranslation(candidate, translated) {
        if (candidate.kind === "text") {
            candidate.target.nodeValue = preserveWhitespace(
                getOriginalTextNode(candidate.target),
                translated
            );
            return;
        }

        const original = getOriginalAttribute(
            candidate.target,
            candidate.attribute
        );

        /* Do not overwrite input values that may have become user-entered. */
        if (
            candidate.attribute === "value" &&
            document.activeElement === candidate.target
        ) {
            return;
        }

        candidate.target.setAttribute(
            candidate.attribute,
            preserveWhitespace(original, translated)
        );
    }

    async function translatePage() {
        if (!document.body) return;

        activeLocale = normalizeLocale(activeLocale);
        document.documentElement.lang = activeLocale;
        document.documentElement.dir = isRTL(activeLocale) ? "rtl" : "ltr";

        if (languagePart(activeLocale) === "en") {
            restoreEnglish();
            return;
        }

        const candidates = getTranslationCandidates(document.body);
        if (!candidates.length) return;

        const cache = readCache();
        const missing = [];

        for (const candidate of candidates) {
            if (cache[candidate.key]) {
                applyTranslation(candidate, cache[candidate.key]);
            } else {
                missing.push(candidate);
            }
        }

        for (let index = 0; index < missing.length; index += CONFIG.maxBatch) {
            const batch = missing.slice(index, index + CONFIG.maxBatch);
            const batchKey = batch.map(item => item.key).join("\n");

            if (inFlight.has(batchKey)) continue;
            inFlight.add(batchKey);

            try {
                const translated = await requestTranslations(
                    batch.map(item => item.original)
                );

                batch.forEach((candidate, batchIndex) => {
                    const value = translated[batchIndex];
                    cache[candidate.key] = value;
                    applyTranslation(candidate, value);
                });

                writeCache(cache);
            } catch (error) {
                console.warn(
                    "NutriCycle AI — Runtime translation skipped:",
                    error
                );
            } finally {
                inFlight.delete(batchKey);
            }
        }
    }

    function scheduleTranslation() {
        if (scheduled) return;
        scheduled = true;

        window.setTimeout(() => {
            scheduled = false;
            translatePage();
        }, CONFIG.debounceMs);
    }

    function setLocaleFromStorage() {
        activeLocale = getStoredLocale();
        scheduleTranslation();
    }

    function startObserver() {
        if (observer || !document.body) return;

        observer = new MutationObserver(mutations => {
            let relevant = false;

            for (const mutation of mutations) {
                if (mutation.type === "childList" && mutation.addedNodes.length) {
                    relevant = true;
                    break;
                }
            }

            if (relevant) scheduleTranslation();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    document.addEventListener(
        "nutricycle:localechange",
        event => {
            activeLocale = normalizeLocale(event?.detail?.locale || getStoredLocale());
            scheduleTranslation();
        }
    );

    window.addEventListener("storage", event => {
        if (event.key === CONFIG.localeStorageKey) {
            activeLocale = normalizeLocale(event.newValue || CONFIG.sourceLocale);
            scheduleTranslation();
        }
    });

    function initialize() {
        activeLocale = getStoredLocale();
        startObserver();
        window.setTimeout(() => translatePage(), 500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
