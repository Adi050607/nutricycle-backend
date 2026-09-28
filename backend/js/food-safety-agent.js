"use strict";

/* ============================================================
   NUTRICYCLE AI
   FOOD SAFETY & RISK AGENT

   Purpose:
   - Separate visual food analysis from food-safety risk assessment.
   - Never claim that an image alone proves food is safe.
   - Combine visible evidence with donor-supplied handling data.
   - Return structured, auditable JSON for the backend orchestrator.
============================================================ */

const AGENT_NAME =
    "Food Safety & Risk Agent";

const AGENT_VERSION =
    "food-safety-agent-v1";

const DEFAULT_MODEL =
    "gpt-5.6-luna";

const MAX_IMAGE_LENGTH =
    14_000_000;

const MAX_TEXT_LENGTH =
    4_000;

const ALLOWED_RISK_LEVELS = new Set([
    "low",
    "moderate",
    "high",
    "unknown"
]);

const ALLOWED_ACTIONS = new Set([
    "proceed_to_normal_review",
    "request_more_information",
    "hold_for_human_review"
]);


/* ============================================================
   BASIC STRING CLEANING
============================================================ */

function cleanString(
    value,
    maxLength = MAX_TEXT_LENGTH
) {

    if (
        typeof value !== "string"
    ) {

        return "";

    }

    return value
        .trim()
        .slice(
            0,
            maxLength
        );

}


/* ============================================================
   BOOLEAN NORMALIZATION
============================================================ */

function normalizeBoolean(
    value
) {

    return value === true;

}


/* ============================================================
   NUMBER NORMALIZATION
============================================================ */

function normalizeNumber(
    value,
    minimum,
    maximum
) {

    const number =
        Number(value);

    if (
        !Number.isFinite(
            number
        )
    ) {

        return null;

    }

    return Math.max(
        minimum,
        Math.min(
            maximum,
            number
        )
    );

}


/* ============================================================
   UNIQUE STRING ARRAY NORMALIZATION
============================================================ */

function uniqueStrings(
    values,
    maxItems = 12
) {

    if (
        !Array.isArray(
            values
        )
    ) {

        return [];

    }

    const seen =
        new Set();

    const output =
        [];

    for (
        const value of values
    ) {

        const normalized =
            cleanString(
                value,
                300
            );

        if (
            !normalized
        ) {

            continue;

        }

        const key =
            normalized.toLowerCase();

        if (
            seen.has(
                key
            )
        ) {

            continue;

        }

        seen.add(
            key
        );

        output.push(
            normalized
        );

        if (
            output.length >=
            maxItems
        ) {

            break;

        }

    }

    return output;

}


/* ============================================================
   SAFE JSON EXTRACTION
============================================================ */

function extractJSON(
    text
) {

    if (
        typeof text !== "string"
    ) {

        throw new Error(
            "Food Safety Agent returned non-text output."
        );

    }

    const trimmed =
        text.trim();

    if (
        !trimmed
    ) {

        throw new Error(
            "Food Safety Agent returned an empty response."
        );

    }

    try {

        return JSON.parse(
            trimmed
        );

    }

    catch (
        directError
    ) {

        const jsonStart =
            trimmed.indexOf(
                "{"
            );

        const jsonEnd =
            trimmed.lastIndexOf(
                "}"
            );

        if (
            jsonStart === -1 ||
            jsonEnd === -1 ||
            jsonEnd <= jsonStart
        ) {

            throw directError;

        }

        return JSON.parse(
            trimmed.slice(
                jsonStart,
                jsonEnd + 1
            )
        );

    }

}


/* ============================================================
   FOOD ANALYSIS INPUT NORMALIZATION
============================================================ */

function normalizeFoodAnalysis(
    value
) {

    const source =
        value &&
        typeof value === "object"
            ? value
            : {};

    const detectedName =
        cleanString(
            source.detectedName ||
            source.name ||
            "Unknown food",
            200
        );

    const confidence =
        normalizeNumber(
            source.confidence,
            0,
            1
        );

    const confidencePercent =
        normalizeNumber(
            source.confidencePercent,
            0,
            100
        );

    return {

        valid:
            normalizeBoolean(
                source.valid
            ),

        visuallyContainsFood:
            normalizeBoolean(
                source.visuallyContainsFood
            ),

        detectedName:
            detectedName ||
            "Unknown food",

        visualCondition:
            cleanString(
                source.visualCondition,
                300
            ) ||
            "unknown",

        confidence:
            confidence === null
                ? (
                    confidencePercent === null
                        ? 0
                        : confidencePercent / 100
                )
                : confidence,

        riskFlags:
            uniqueStrings(
                source.riskFlags
            ),

        requiresHumanReview:
            normalizeBoolean(
                source.requiresHumanReview
            )

    };

}


/* ============================================================
   DONOR HANDLING CONTEXT NORMALIZATION
============================================================ */

function normalizeHandlingContext(
    value
) {

    const source =
        value &&
        typeof value === "object"
            ? value
            : {};

    const storageTemperatureC =
        normalizeNumber(
            source.storageTemperatureC,
            -50,
            100
        );

    return {

        preparationTime:
            cleanString(
                source.preparationTime,
                200
            ),

        storageMethod:
            cleanString(
                source.storageMethod,
                300
            ),

        storageTemperatureC,

        packaging:
            cleanString(
                source.packaging,
                300
            ),

        transportMethod:
            cleanString(
                source.transportMethod,
                300
            ),

        donorNotes:
            cleanString(
                source.donorNotes,
                1_000
            )

    };

}


/* ============================================================
   NORMALIZE FINAL AGENT RESULT
============================================================ */

function normalizeAgentResult(
    result,
    context
) {

    const source =
        result &&
        typeof result === "object"
            ? result
            : {};

    const rawRiskLevel =
        cleanString(
            source.riskLevel,
            50
        ).toLowerCase();

    const riskLevel =
        ALLOWED_RISK_LEVELS.has(
            rawRiskLevel
        )
            ? rawRiskLevel
            : "unknown";

    const rawAction =
        cleanString(
            source.recommendedAction,
            100
        );

    const recommendedAction =
        ALLOWED_ACTIONS.has(
            rawAction
        )
            ? rawAction
            : "hold_for_human_review";

    const missingInformation =
        uniqueStrings(
            source.missingInformation,
            10
        );

    const visibleConcerns =
        uniqueStrings(
            source.visibleConcerns,
            12
        );

    const handlingConcerns =
        uniqueStrings(
            source.handlingConcerns,
            12
        );

    const confidence =
        normalizeNumber(
            source.assessmentConfidence,
            0,
            1
        );

    const forcedHumanReview =
        context.foodAnalysis.requiresHumanReview === true ||
        riskLevel === "high" ||
        riskLevel === "unknown" ||
        missingInformation.length > 0;

    const requiresHumanReview =
        forcedHumanReview ||
        source.requiresHumanReview === true;

    return {

        success:
            true,

        agent:
            AGENT_NAME,

        analysisVersion:
            AGENT_VERSION,

        riskLevel,

        recommendedAction:
            recommendedAction,

        requiresHumanReview,

        assessmentConfidence:
            confidence === null
                ? 0
                : Number(
                      confidence.toFixed(
                          3
                      )
                  ),

        visibleConcerns,

        handlingConcerns,

        missingInformation,

        reasoning:
            cleanString(
                source.reasoning,
                1_500
            ) ||
            "Additional human review is required because image-only analysis cannot establish complete food safety.",

        distributionGuidance:
            cleanString(
                source.distributionGuidance,
                800
            ) ||
            "Do not treat this assessment as a food-safety certification. Verify relevant handling and storage information before distribution.",

        foodAnalysisSnapshot: {

            detectedName:
                context.foodAnalysis.detectedName,

            visualCondition:
                context.foodAnalysis.visualCondition,

            confidence:
                context.foodAnalysis.confidence,

            riskFlags:
                context.foodAnalysis.riskFlags

        },

        handlingSnapshot:
            context.handling

    };

}


/* ============================================================
   SAFETY ANALYSIS PROMPT
============================================================ */

function buildSafetyPrompt(
    foodAnalysis,
    handling
) {

    return `
You are NutriCycle AI's Food Safety & Risk Agent.

You are NOT a medical authority and you must NOT certify food as safe.
Your job is to assess food-rescue risk using the visible food-analysis
result plus donor-supplied preparation, storage, packaging, and transport
information.

IMPORTANT LIMITATION:
An image alone cannot establish microbiological safety, internal temperature,
time-temperature history, contamination status, or complete shelf life.
Never state that food is definitely safe because an image looks normal.

FOOD ANALYSIS RESULT:
${JSON.stringify(foodAnalysis)}

HANDLING INFORMATION:
${JSON.stringify(handling)}

ASSESS:

1. Visible risk indicators reported by the Food Analysis Agent.

2. Whether the food type reasonably depends on missing handling information.

3. Whether preparation, storage, or transport information is incomplete.

4. Whether the supplied evidence supports:
   - normal review,
   - requesting additional information,
   - or human review before distribution.

Use conservative reasoning.

When important information is missing,
request it rather than inventing it.

When visible severe spoilage,
contamination,
or packaging failure is reported,
treat the case as requiring human review.

Do not diagnose illness.

Do not invent:
- temperatures,
- preparation times,
- pathogens,
- shelf life,
- legal requirements,
- or regulatory compliance.

Do not make a legal or regulatory compliance claim.

Return ONLY JSON in this exact structure:

{
  "riskLevel": "low|moderate|high|unknown",
  "recommendedAction": "proceed_to_normal_review|request_more_information|hold_for_human_review",
  "requiresHumanReview": true,
  "assessmentConfidence": 0.0,
  "visibleConcerns": [],
  "handlingConcerns": [],
  "missingInformation": [],
  "reasoning": "",
  "distributionGuidance": ""
}

Rules:

- riskLevel must be one of the four allowed values.

- high or unknown risk must require human review.

- Missing critical handling information should normally trigger
  request_more_information or hold_for_human_review.

- Do not output fake certainty.

- Keep reasoning concise and auditable.
`;

}


/* ============================================================
   MAIN FOOD SAFETY AGENT
============================================================ */

async function runFoodSafetyAgent({
    client,
    model = DEFAULT_MODEL,
    image = "",
    foodAnalysis = {},
    handling = {}
} = {}) {

    if (
        !client ||
        typeof client.responses?.create !==
        "function"
    ) {

        throw new Error(
            "Food Safety Agent requires a configured OpenAI client."
        );

    }

    const normalizedImage =
        cleanString(
            image,
            MAX_IMAGE_LENGTH
        );

    if (
        !normalizedImage
    ) {

        throw new Error(
            "Food Safety Agent requires the food image."
        );

    }

    const normalizedFoodAnalysis =
        normalizeFoodAnalysis(
            foodAnalysis
        );

    const normalizedHandling =
        normalizeHandlingContext(
            handling
        );

    const context = {

        foodAnalysis:
            normalizedFoodAnalysis,

        handling:
            normalizedHandling

    };

    const response =
        await client.responses.create({

            model,

            input: [

                {

                    role:
                        "user",

                    content: [

                        {

                            type:
                                "input_text",

                            text:
                                buildSafetyPrompt(
                                    normalizedFoodAnalysis,
                                    normalizedHandling
                                )

                        },

                        {

                            type:
                                "input_image",

                            image_url:
                                normalizedImage

                        }

                    ]

                }

            ]

        });

    const rawText =
        response.output_text;

    const parsed =
        extractJSON(
            rawText
        );

    return normalizeAgentResult(
        parsed,
        context
    );

}


/* ============================================================
   MODULE EXPORTS
============================================================ */

module.exports = {

    AGENT_NAME,

    AGENT_VERSION,

    runFoodSafetyAgent

};