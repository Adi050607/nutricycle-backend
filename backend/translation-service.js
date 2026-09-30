"use strict";

/* ============================================================
   NutriCycle AI
   GLOBAL RUNTIME TRANSLATION GATEWAY
   ------------------------------------------------------------
   Registers /translate/status and /translate on the existing
   Express application. It reuses NutriCycle's existing OpenAI
   client and does not expose credentials to the browser.
============================================================ */

const MAX_BATCH = 50;
const MAX_TEXT_LENGTH = 4000;
const MAX_TOTAL_CHARS = 50000;

function safeString(value) {
    return typeof value === "string" ? value : "";
}

function extractJsonArray(text) {
    const raw = safeString(text).trim();

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch (_) {
        /* Try bounded extraction below. */
    }

    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");

    if (start === -1 || end <= start) {
        throw new Error("Translation provider returned invalid JSON.");
    }

    const parsed = JSON.parse(raw.slice(start, end + 1));

    if (!Array.isArray(parsed)) {
        throw new Error("Translation provider did not return an array.");
    }

    return parsed;
}

function normalizeInputs(body) {
    const targetLocale = safeString(body?.targetLocale).trim();
    const sourceLocale = safeString(body?.sourceLocale || "en").trim() || "en";

    const rawTexts = Array.isArray(body?.texts)
        ? body.texts
        : [];

    const texts = rawTexts.map(safeString).map(text => text.slice(0, MAX_TEXT_LENGTH));

    return {
        sourceLocale,
        targetLocale,
        texts
    };
}

function createTranslationInstruction({ sourceLocale, targetLocale, texts }) {
    return [
        "Translate the following UI strings.",
        "",
        `Source locale: ${sourceLocale}`,
        `Target locale: ${targetLocale}`,
        "",
        "Requirements:",
        "1. Return ONLY a JSON array of strings.",
        `2. Return exactly ${texts.length} items, in exactly the same order.`,
        "3. Preserve URLs, email addresses, numbers, IDs, product codes, file names, and placeholders exactly.",
        "4. Preserve tokens such as {{name}}, {count}, %s, %d, and ${value} exactly.",
        "5. Preserve NutriCycle AI as a brand name.",
        "6. Do not add explanations, markdown, quotation marks outside JSON, or commentary.",
        "7. Translate naturally for software UI. Keep button/label text concise.",
        "8. Do not translate a proper person's name, organization name, street name, or vehicle identifier unless the string is clearly generic UI text.",
        "",
        JSON.stringify(texts)
    ].join("\n");
}
async function requestMyMemoryTranslations({
    sourceLocale,
    targetLocale,
    texts
}) {
    const source =
        safeString(sourceLocale)
            .split("-")[0]
            .toLowerCase();

    const target =
        safeString(targetLocale)
            .split("-")[0]
            .toLowerCase();

    const translations = [];

    for (const text of texts) {
        const url =
            "https://api.mymemory.translated.net/get" +
            `?q=${encodeURIComponent(text)}` +
            `&langpair=${encodeURIComponent(source)}|${encodeURIComponent(target)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `MyMemory returned HTTP ${response.status}.`
            );
        }

        const data = await response.json();

        const translated =
            safeString(
                data?.responseData?.translatedText
            ).trim();

        translations.push(
            translated || text
        );
    }

    return translations;
}

module.exports = function registerTranslationRoutes({ app, client }) {
    if (!app) {
        throw new Error("Translation gateway requires an Express app.");
    }

    /* Avoid duplicate registration if the module is loaded twice. */
    if (app.locals && app.locals.nutriCycleTranslationGatewayRegistered) {
        return;
    }

    if (app.locals) {
        app.locals.nutriCycleTranslationGatewayRegistered = true;
    }

    app.get("/translate/status", (req, res) => {
        const configured = Boolean(client && process.env.OPENAI_API_KEY);
        const model =
            process.env.OPENAI_TRANSLATION_MODEL ||
            process.env.FOOD_AI_MODEL ||
            "gpt-5.6-luna";

        return res.json({
            success: true,
            configured,
            provider: "openai",
            model,
            cache: "browser"
        });
    });

    app.post("/translate", async (req, res) => {
        try {
            const { sourceLocale, targetLocale, texts } = normalizeInputs(req.body);

            if (!targetLocale) {
                return res.status(400).json({
                    success: false,
                    error: "targetLocale is required."
                });
            }

            if (!Array.isArray(texts) || texts.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "texts must be a non-empty array."
                });
            }

            if (texts.length > MAX_BATCH) {
                return res.status(400).json({
                    success: false,
                    error: `Maximum ${MAX_BATCH} texts per request.`
                });
            }

            const totalChars = texts.reduce((sum, text) => sum + text.length, 0);

            if (totalChars > MAX_TOTAL_CHARS) {
                return res.status(400).json({
                    success: false,
                    error: `Translation request exceeds ${MAX_TOTAL_CHARS} characters.`
                });
            }

            /* English-to-English is deterministic and needs no API call. */
            if (targetLocale.toLowerCase().startsWith("en")) {
                return res.json({
                    success: true,
                    sourceLocale,
                    targetLocale,
                    translations: texts
                });
            }

                       let normalizedTranslations = null;

            /*
             * Primary provider:
             * OpenAI, when configured.
             */
            if (
                client &&
                process.env.OPENAI_API_KEY
            ) {
                try {
                    const model =
                        process.env.OPENAI_TRANSLATION_MODEL ||
                        process.env.FOOD_AI_MODEL ||
                        "gpt-5.6-luna";

                    const response =
                        await client.responses.create({
                            model,
                            input: [
                                {
                                    role: "system",
                                    content: [
                                        {
                                            type: "input_text",
                                            text:
                                                "You are NutriCycle AI's production UI localization engine. Output only valid JSON."
                                        }
                                    ]
                                },
                                {
                                    role: "user",
                                    content: [
                                        {
                                            type: "input_text",
                                            text:
                                                createTranslationInstruction({
                                                    sourceLocale,
                                                    targetLocale,
                                                    texts
                                                })
                                        }
                                    ]
                                }
                            ]
                        });

                    const translations =
                        extractJsonArray(
                            response.output_text
                        );

                    if (
                        translations.length !==
                        texts.length
                    ) {
                        throw new Error(
                            `Translation provider returned ${translations.length} items; expected ${texts.length}.`
                        );
                    }

                    normalizedTranslations =
                        translations.map(
                            (translated, index) => {
                                const value =
                                    safeString(
                                        translated
                                    );

                                return (
                                    value ||
                                    texts[index]
                                );
                            }
                        );

                } catch (openAIError) {

                    console.warn(
                        "NutriCycle AI — OpenAI translation unavailable. Using prototype fallback:",
                        openAIError?.message ||
                        openAIError
                    );
                }
            }

            /*
             * Prototype fallback:
             * MyMemory is used only when the
             * primary provider is unavailable.
             */
            if (!normalizedTranslations) {

                normalizedTranslations =
                    await requestMyMemoryTranslations({
                        sourceLocale,
                        targetLocale,
                        texts
                    });
            }

            return res.json({
                success: true,
                sourceLocale,
                targetLocale,
                translations: normalizedTranslations
            });
        } catch (error) {
            console.error(
                "NutriCycle AI — Translation gateway error:",
                error
            );

            return res.status(502).json({
                success: false,
                error: "Translation provider request failed."
            });
        }
    });
};
