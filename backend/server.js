const OpenAI =
    require("openai");
    const {
    AGENT_NAME:
        FOOD_SAFETY_AGENT_NAME,

    AGENT_VERSION:
        FOOD_SAFETY_AGENT_VERSION,

    runFoodSafetyAgent

} =
    require(
        "./js/food-safety-agent"
    );
require("dotenv").config();

const express =
    require("express");

const cors =
    require("cors");




/* ============================================================
   APPLICATION
============================================================ */

const app =
    express();


/* ============================================================
   SERVER CONFIGURATION
============================================================ */

const PORT =
    process.env.PORT ||
    10000;


const OPENAI_API_KEY =
    process.env.OPENAI_API_KEY;


const FRONTEND_ORIGIN =
    "https://nutricycle-ai.web.app";


/*
   Agent-specific model configuration.

   All agents use the same model by default.
   This can later be changed independently through
   environment variables without changing frontend code.
*/

const FOOD_AI_MODEL =
    process.env.FOOD_AI_MODEL ||
    "gpt-5.6-luna";


const NUTRIASSIST_MODEL =
    process.env.NUTRIASSIST_MODEL ||
    "gpt-5.6-luna";


const TRUST_AI_MODEL =
    process.env.TRUST_AI_MODEL ||
    "gpt-5.6-luna";


const GUARDIAN_AI_MODEL =
    process.env.GUARDIAN_AI_MODEL ||
    "gpt-5.6-luna";
    const FOOD_SAFETY_AI_MODEL =
    process.env.FOOD_SAFETY_AI_MODEL ||
    "gpt-5.6-luna";


/* ============================================================
   STARTUP VALIDATION
============================================================ */

if (
    !OPENAI_API_KEY
) {

    console.error(
        "NutriCycle AI — OPENAI_API_KEY is missing."
    );

}


/* ============================================================
   MIDDLEWARE
============================================================ */

app.use(
    cors({
        origin: [
            FRONTEND_ORIGIN,
            "http://localhost:5500",
            "http://127.0.0.1:5500"
        ],

        methods: [
            "GET",
            "POST",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);


app.use(
    express.json({
        limit:
            "15mb"
    })
);


/* ============================================================
   OPENAI CLIENT
============================================================ */

const client =
    OPENAI_API_KEY
        ? new OpenAI({
              apiKey:
                  OPENAI_API_KEY
          })
        : null;
/* ============================================================
   GLOBAL TRANSLATION GATEWAY
============================================================ */

const registerTranslationRoutes =
    require("./translation-service");

registerTranslationRoutes({
    app,
    client
});

/* ============================================================
   COMMON ERROR HANDLER
============================================================ */

function sendServerError(
    res,
    error,
    publicMessage
) {

    console.error(
        "NutriCycle AI — Server error:",
        error
    );


    return res
        .status(
            500
        )
        .json({

            success:
                false,

            error:
                publicMessage ||
                "Internal AI service error."

        });

}


/* ============================================================
   JSON EXTRACTION
============================================================ */

function extractJSON(
    text
) {

    if (
        typeof text !==
        "string"
    ) {

        throw new Error(
            "AI returned non-text output."
        );

    }


    const trimmed =
        text.trim();


    if (
        !trimmed
    ) {

        throw new Error(
            "AI returned an empty response."
        );

    }


    /*
       First try a direct JSON parse.
    */

    try {

        return JSON.parse(
            trimmed
        );

    }

    catch (
        directError
    ) {

        /*
           Then attempt to extract the first
           complete JSON object.
        */

        const jsonStart =
            trimmed.indexOf(
                "{"
            );


        const jsonEnd =
            trimmed.lastIndexOf(
                "}"
            );


        if (
            jsonStart ===
                -1 ||
            jsonEnd ===
                -1 ||
            jsonEnd <=
                jsonStart
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
   COMMON RESPONSES API JSON CALL
============================================================ */

async function callJSONAgent(
    model,
    systemInstruction,
    userInstruction
) {

    if (
        !client
    ) {

        throw new Error(
            "AI service is not configured."
        );

    }


    const response =
        await client.responses.create({

            model:
                model,

            input: [

                {
                    role:
                        "system",

                    content: [

                        {
                            type:
                                "input_text",

                            text:
                                systemInstruction
                        }

                    ]

                },

                {
                    role:
                        "user",

                    content: [

                        {
                            type:
                                "input_text",

                            text:
                                userInstruction
                        }

                    ]

                }

            ]

        });


    const rawText =
        response.output_text;


    return extractJSON(
        rawText
    );

}


/* ============================================================
   FOOD RESULT NORMALIZATION
============================================================ */

function normalizeFoodResult(
    result
) {

    const detectedName =
        typeof result?.detectedName ===
        "string"
            ? result.detectedName.trim()
            : "";


    const name =
        typeof result?.name ===
        "string"
            ? result.name.trim()
            : detectedName;


    const riskFlags =
        Array.isArray(
            result?.riskFlags
        )
            ? result.riskFlags
                  .filter(
                      item =>
                          typeof item ===
                          "string"
                  )
                  .map(
                      item =>
                          item.trim()
                  )
                  .filter(
                      Boolean
                  )
            : [];


    const foods =
        Array.isArray(
            result?.foods
        )
            ? result.foods
                  .filter(
                      item =>
                          item &&
                          typeof item ===
                          "object"
                  )
                  .map(
                      item => ({

                          name:
                              typeof item.name ===
                              "string"
                                  ? item.name.trim()
                                  : "",

                          confidence:
                              Number.isFinite(
                                  Number(
                                      item.confidence
                                  )
                              )
                                  ? Math.max(
                                        0,
                                        Math.min(
                                            1,
                                            Number(
                                                item.confidence
                                            )
                                        )
                                    )
                                  : 0

                      })
                  )
                  .filter(
                      item =>
                          item.name
                  )
            : [];


    let confidence =
        Number(
            result?.confidence
        );


    if (
        !Number.isFinite(
            confidence
        )
    ) {

        confidence =
            foods.length
                ? Math.max(
                      ...foods.map(
                          item =>
                              item.confidence
                      )
                  )
                : 0;

    }


    confidence =
        Math.max(
            0,
            Math.min(
                1,
                confidence
            )
        );


    const visuallyContainsFood =
        Boolean(
            result?.visuallyContainsFood
            ??
            result?.valid
        );


    const requiresHumanReview =
        Boolean(
            result?.requiresHumanReview
        );


    const visualCondition =
        typeof result?.visualCondition ===
        "string"
            ? result.visualCondition
            : "unknown";


    const userInputMatch =
        result?.matches ===
        true;


    return {

        success:
            true,

        valid:
            visuallyContainsFood,

        visuallyContainsFood:

            visuallyContainsFood,

        detectedName:

            name ||
            "Unknown food",

        name:

            name ||
            "Unknown food",

        matches:
            userInputMatch,

        confidence:

            Number(
                confidence.toFixed(
                    3
                )
            ),

        confidencePercent:

            Math.round(
                confidence *
                100
            ),

        visualCondition:

            visualCondition,

        riskFlags:

            riskFlags,

        requiresHumanReview:

            requiresHumanReview,

        foods:

            foods,

        analysisVersion:

            "food-agent-v1",

        agent:

            "Food Analysis Agent",

        shelfLife:

            null,

        shelfLifeStatus:

            "Not determined from image alone."

    };

}


/* ============================================================
   SECURITY / TRUST RESULT NORMALIZATION
============================================================ */

function normalizeTrustResult(
    result
) {

    let trustScore =
        Number(
            result?.trustScore
        );


    if (
        !Number.isFinite(
            trustScore
        )
    ) {

        trustScore =
            0;

    }


    /*
       Accept either:
       0–1
       or
       0–100

       internally we store 0–1.
    */

    if (
        trustScore >
        1
    ) {

        trustScore =
            trustScore /
            100;

    }


    trustScore =
        Math.max(
            0,
            Math.min(
                1,
                trustScore
            )
        );


    const riskLevel =
        String(
            result?.riskLevel ||
            "medium"
        )
        .trim()
        .toLowerCase();


    const allowedRiskLevels = [

        "low",
        "medium",
        "high"

    ];


    const normalizedRiskLevel =
        allowedRiskLevels.includes(
            riskLevel
        )
            ? riskLevel
            : "medium";


    const flags =
        Array.isArray(
            result?.flags
        )
            ? result.flags
                  .filter(
                      item =>
                          typeof item ===
                          "string"
                  )
                  .map(
                      item =>
                          item.trim()
                  )
                  .filter(
                      Boolean
                  )
            : [];


    const reasons =
        Array.isArray(
            result?.reasons
        )
            ? result.reasons
                  .filter(
                      item =>
                          typeof item ===
                          "string"
                  )
                  .map(
                      item =>
                          item.trim()
                  )
                  .filter(
                      Boolean
                  )
            : [];


    return {

        success:
            true,

        verified:
            result?.verified ===
            true,

        trustScore:

            Number(
                trustScore.toFixed(
                    3
                )
            ),

        trustScorePercent:

            Math.round(
                trustScore *
                100
            ),

        riskLevel:
            normalizedRiskLevel,

        flags:
            flags,

        reasons:
            reasons,

        requiresHumanReview:
            result?.requiresHumanReview ===
            true,

        verificationVersion:
            "trust-agent-v1",

        agent:
            "Security / Trust Verification Agent"

    };

}


/* ============================================================
   DATA GUARDIAN — DETERMINISTIC CHECKS
============================================================ */

function runBasicGuardianChecks(
    records
) {

    const safeRecords =
        Array.isArray(
            records
        )
            ? records
            : [];


    const duplicateIds =
        [];


    const missingIdIndexes =
        [];


    const seenIds =
        new Set();


    safeRecords.forEach(
        (
            record,
            index
        ) => {

            if (
                !record ||
                typeof record !==
                "object"
            ) {

                missingIdIndexes.push(
                    index
                );

                return;

            }


            const id =
                String(
                    record.id ??
                    ""
                )
                .trim();


            if (
                !id
            ) {

                missingIdIndexes.push(
                    index
                );

                return;

            }


            if (
                seenIds.has(
                    id
                )
            ) {

                duplicateIds.push(
                    id
                );

            }


            seenIds.add(
                id
            );

        }
    );


    return {

        totalRecords:
            safeRecords.length,

        duplicateIds:
            [
                ...new Set(
                    duplicateIds
                )
            ],

        missingIdIndexes:
            missingIdIndexes

    };

}


/* ============================================================
   DATA GUARDIAN RESULT NORMALIZATION
============================================================ */

function normalizeGuardianResult(
    result,
    basicChecks
) {

    const anomalies =
        Array.isArray(
            result?.anomalies
        )
            ? result.anomalies
                  .filter(
                      item =>
                          typeof item ===
                          "string"
                  )
                  .map(
                      item =>
                          item.trim()
                  )
                  .filter(
                      Boolean
                  )
            : [];


    const duplicateRecords =
        Array.isArray(
            result?.duplicateRecords
        )
            ? result.duplicateRecords
                  .filter(
                      item =>
                          typeof item ===
                          "string"
                  )
                  .map(
                      item =>
                          item.trim()
                  )
                  .filter(
                      Boolean
                  )
            : [];


    const missingFields =
        Array.isArray(
            result?.missingFields
        )
            ? result.missingFields
                  .filter(
                      item =>
                          typeof item ===
                          "string"
                  )
                  .map(
                      item =>
                          item.trim()
                  )
                  .filter(
                      Boolean
                  )
            : [];


    const inconsistencies =
        Array.isArray(
            result?.inconsistencies
        )
            ? result.inconsistencies
                  .filter(
                      item =>
                          typeof item ===
                          "string"
                  )
                  .map(
                      item =>
                          item.trim()
                  )
                  .filter(
                      Boolean
                  )
            : [];


    const recommendedActions =
        Array.isArray(
            result?.recommendedActions
        )
            ? result.recommendedActions
                  .filter(
                      item =>
                          typeof item ===
                          "string"
                  )
                  .map(
                      item =>
                          item.trim()
                  )
                  .filter(
                      Boolean
                  )
            : [];


    /*
       Deterministic duplicate detection is authoritative
       for exact duplicate record IDs.

       AI results are used for interpretation and prioritization.
    */

    const mergedDuplicateRecords = [

        ...new Set([

            ...duplicateRecords,

            ...basicChecks.duplicateIds

        ])

    ];


    const guardianHealthy =
        result?.healthy ===
        true &&
        mergedDuplicateRecords.length ===
            0 &&
        basicChecks.missingIdIndexes.length ===
            0;


    return {

        success:
            true,

        healthy:
            guardianHealthy,

        totalRecords:
            basicChecks.totalRecords,

        anomalies:
            anomalies,

        duplicateRecords:
            mergedDuplicateRecords,

        missingFields:
            missingFields,

        missingIdIndexes:
            basicChecks.missingIdIndexes,

        inconsistencies:
            inconsistencies,

        severity:
            String(
                result?.severity ||
                "medium"
            )
            .trim()
            .toLowerCase(),

        requiresHumanReview:
            result?.requiresHumanReview ===
            true ||
            !guardianHealthy,

        recommendedActions:
            recommendedActions,

        guardianVersion:
            "data-guardian-v1",

        agent:
            "Data Guardian"

    };

}


/* ============================================================
   HEALTH
============================================================ */

app.get(
    "/health",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            service:
                "NutriCycle AI",

            status:
                "healthy",

            aiConfigured:
                Boolean(
                    client
                ),

            agents: {

                foodAnalysis:
                    "enabled",

                nutriAssist:
                    "enabled",

                securityTrust:
                    "enabled",

                dataGuardian:
                    "enabled",
                    foodSafety:
    "enabled"

            },

            models: {

                foodAnalysis:
                    FOOD_AI_MODEL,

                nutriAssist:
                    NUTRIASSIST_MODEL,

                securityTrust:
                    TRUST_AI_MODEL,

                dataGuardian:
                    GUARDIAN_AI_MODEL,

                foodSafety:
    FOOD_SAFETY_AI_MODEL

            },

            timestamp:
                new Date().toISOString()

        });

    }
);


/* ============================================================
   AGENT STATUS
============================================================ */

app.get(
    "/agents",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            agents: [

                {

                    id:
                        "food-analysis",

                    name:
                        "Food Analysis Agent",

                    endpoint:
                        "/scan",

                    model:
                        FOOD_AI_MODEL,

                    status:
                        client
                            ? "enabled"
                            : "unavailable"

                },

                {

                    id:
                        "nutriassist",

                    name:
                        "NutriAssist",

                    endpoint:
                        "/chat",

                    model:
                        NUTRIASSIST_MODEL,

                    status:
                        client
                            ? "enabled"
                            : "unavailable"

                },

                {

                    id:
                        "security-trust",

                    name:
                        "Security / Trust Verification Agent",

                    endpoint:
                        "/verify",

                    model:
                        TRUST_AI_MODEL,

                    status:
                        client
                            ? "enabled"
                            : "unavailable"

                },

              {
    id:
        "data-guardian",

    name:
        "Data Guardian",

    endpoint:
        "/guardian",

    model:
        GUARDIAN_AI_MODEL,

    status:
        client
            ? "enabled"
            : "unavailable"

},

{
    id:
        "food-safety",

    name:
        FOOD_SAFETY_AGENT_NAME,

    endpoint:
        "/scan",

    model:
        FOOD_SAFETY_AI_MODEL,

    version:
        FOOD_SAFETY_AGENT_VERSION,

    status:
        client &&
        typeof runFoodSafetyAgent ===
            "function"
            ? "enabled"
            : "unavailable"

}

            ]

        });

    }
);


/* ============================================================
   FOOD ANALYSIS AGENT
============================================================ */

app.post(
    "/scan",
    async (
        req,
        res
    ) => {

        if (
            !client
        ) {

            return res
                .status(
                    503
                )
                .json({

                    success:
                        false,

                    error:
                        "AI service is not configured."

                });

        }


        try {

           const {
    image,
    foodName,

    preparationTime,
    storageMethod,
    storageTemperatureC,
    packaging,
    transportMethod,
    donorNotes,

    runFoodSafety
} =
    req.body ||
    {};


            if (
                typeof image !==
                    "string" ||
                !image.trim()
            ) {

                return res
                    .status(
                        400
                    )
                    .json({

                        success:
                            false,

                        error:
                            "Food image is required."

                    });

            }


            if (
                image.length >
                14_000_000
            ) {

                return res
                    .status(
                        413
                    )
                    .json({

                        success:
                            false,

                        error:
                            "Food image is too large."

                    });

            }


            const normalizedFoodName =
                typeof foodName ===
                "string"
                    ? foodName.trim()
                    : "";


            const userComparisonText =
                normalizedFoodName
                    ? `

The donor entered this food name:

"${normalizedFoodName}"

Compare the visible food against that name.

Set "matches" to true only when the visible food
reasonably corresponds to the donor-entered name.

If the image clearly shows a different food,
set "matches" to false.

Do not reject the image merely because the donor
name is absent; identify what is actually visible.
`
                    : `

No donor-entered food name was supplied.

Set "matches" to false.
`;


            const response =
                await client.responses.create({

                    model:
                        FOOD_AI_MODEL,

                    input: [

                        {

                            role:
                                "user",

                            content: [

                                {

                                    type:
                                        "input_text",

                                    text: `

You are NutriCycle AI's Food Analysis Agent.

Analyze the provided image carefully.

Your job is VISUAL FOOD ANALYSIS,
not certification of food safety.

Identify edible food items that are visibly present.

A human may appear in the image.
A person may be holding the food.
A hand, face, body, plate, table, kitchen,
restaurant or outdoor background does NOT
automatically make the image invalid.

Ignore those non-food elements and analyze
the visible food itself.

Detect:

- fruits
- vegetables
- cooked meals
- raw edible ingredients
- packaged food
- bakery items
- prepared dishes
- rice and grain dishes
- beverages when visibly identifiable as food/drink

Look for visible warning indicators such as:

- obvious mold-like growth
- severe visible spoilage
- unusual discoloration
- apparent foreign contamination
- damaged or leaking food packaging
- obviously non-food material mixed into food

When uncertain, prefer human review.

${userComparisonText}

Your analysis should focus on what is actually
visible in the image.

Do NOT claim that food is safe to consume solely
from the image.

Do NOT invent hidden information.

Do NOT estimate storage duration or actual expiry
from the image alone.

Return ONLY valid JSON with this exact structure:

{
  "valid": true,
  "visuallyContainsFood": true,
  "detectedName": "food name",
  "matches": true,
  "confidence": 0.95,
  "visualCondition": "normal",
  "riskFlags": [],
  "requiresHumanReview": false,
  "foods": [
    {
      "name": "food name",
      "confidence": 0.95
    }
  ]
}

Rules:

- confidence must be between 0 and 1
- foods must contain only visibly detected edible items
- valid must be true when one or more edible food
  items are visibly present
- valid must be false when no edible food is visible
- a human holding food is allowed
- requiresHumanReview must be true when visual evidence
  is uncertain or a potentially concerning visible
  condition exists
- riskFlags must be an empty array when no visible
  warning is found
- do not invent hidden information
- do not estimate storage duration or shelf life
  from the image alone
`
                                },

                                {

                                    type:
                                        "input_image",

                                    image_url:
                                        image

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


            const result =
    normalizeFoodResult(
        parsed
    );


let safetyAssessment =
    null;


/*
   The Food Safety & Risk Agent runs
   after the Food Analysis Agent.

   Food Analysis answers:
   "What is visibly present?"

   Food Safety answers:
   "What additional safety information
    or review may be required?"
*/

const shouldRunFoodSafety =
    runFoodSafety !==
    false;


if (
    shouldRunFoodSafety &&
    typeof runFoodSafetyAgent ===
        "function"
) {

    try {

        safetyAssessment =
            await runFoodSafetyAgent({

                client,

                model:
                    FOOD_SAFETY_AI_MODEL,

                image,

                foodAnalysis:
                    result,

                handling: {

                    preparationTime:
                        typeof preparationTime ===
                        "string"
                            ? preparationTime
                            : "",

                    storageMethod:
                        typeof storageMethod ===
                        "string"
                            ? storageMethod
                            : "",

                    storageTemperatureC:
                        storageTemperatureC,

                    packaging:
                        typeof packaging ===
                        "string"
                            ? packaging
                            : "",

                    transportMethod:
                        typeof transportMethod ===
                        "string"
                            ? transportMethod
                            : "",

                    donorNotes:
                        typeof donorNotes ===
                        "string"
                            ? donorNotes
                            : ""

                }

            });

    }
    catch (
        safetyError
    ) {

        console.warn(
            "NutriCycle AI — Food Safety Agent failed; preserving Food Analysis result:",
            safetyError
        );

        safetyAssessment = {

            success:
                false,

            agent:
                FOOD_SAFETY_AGENT_NAME,

            analysisVersion:
                FOOD_SAFETY_AGENT_VERSION,

            error:
                "Food Safety Agent temporarily unavailable.",

            requiresHumanReview:
                true

        };

    }

}


console.log(
    "NutriCycle AI — Food Analysis:",
    {

        detectedName:
            result.detectedName,

        confidence:
            result.confidence,

        matches:
            result.matches,

        requiresHumanReview:
            result.requiresHumanReview

    }
);


return res.json({

    ...result,

    safetyAssessment

});

        }

        catch (
            error
        ) {

            return sendServerError(
                res,
                error,
                "Food analysis failed."
            );

        }

    }
);


/* ============================================================
   NUTRIASSIST CHATBOT
============================================================ */

app.post(
    "/chat",
    async (
        req,
        res
    ) => {

        if (
            !client
        ) {

            return res
                .status(
                    503
                )
                .json({

                    success:
                        false,

                    error:
                        "AI service is not configured."

                });

        }


        try {

            const {
                message,
                context
            } =
                req.body ||
                {};


            if (
                typeof message !==
                    "string" ||
                !message.trim()
            ) {

                return res
                    .status(
                        400
                    )
                    .json({

                        success:
                            false,

                        error:
                            "Message is required."

                    });

            }


            const safeContext =
                context &&
                typeof context ===
                    "object"
                    ? context
                    : {};


            const response =
                await client.responses.create({

                    model:
                        NUTRIASSIST_MODEL,

                    input: [

                        {

                            role:
                                "system",

                            content: [

                                {

                                    type:
                                        "input_text",

                                    text: `

You are NutriAssist, the official AI assistant
inside NutriCycle AI.

NutriCycle AI connects surplus-food donors,
NGOs and delivery agents.

Help users with:

- creating donations
- food-analysis results
- donation status
- NGO workflow
- pickup workflow
- delivery workflow
- account navigation
- platform features
- general food-rescue guidance
- explanations of NutriCycle AI features

Do not invent account data.

Do not invent:

- delivery status
- driver details
- NGO details
- pickup details
- Firestore records
- payment records
- verification outcomes

When required information is unavailable,
say that it is unavailable.

Do not claim that an image alone proves food
is safe to distribute or consume.

Keep answers clear and practical.

Use the following application context
only when it is relevant:

${JSON.stringify(
    safeContext
)}

`
                                }

                            ]

                        },

                        {

                            role:
                                "user",

                            content: [

                                {

                                    type:
                                        "input_text",

                                    text:
                                        message.trim()

                                }

                            ]

                        }

                    ]

                });


            const reply =
                (
                    response.output_text ||
                    ""
                ).trim();


            if (
                !reply
            ) {

                throw new Error(
                    "NutriAssist returned an empty response."
                );

            }


            return res.json({

                success:
                    true,

                agent:
                    "NutriAssist",

                reply:
                    reply

            });

        }

        catch (
            error
        ) {

            return sendServerError(
                res,
                error,
                "NutriAssist is temporarily unavailable."
            );

        }

    }
);


/* ============================================================
   SECURITY / TRUST VERIFICATION AGENT
============================================================ */

app.post(
    "/verify",
    async (
        req,
        res
    ) => {

        if (
            !client
        ) {

            return res
                .status(
                    503
                )
                .json({

                    success:
                        false,

                    error:
                        "AI service is not configured."

                });

        }


        try {

            const {
                role,
                profile,
                evidence,
                history,
                complaints
            } =
                req.body ||
                {};


            const normalizedRole =
                typeof role ===
                "string"
                    ? role.trim()
                    : "unknown";


            /*
               Important:
               This agent evaluates information supplied
               by the application.

               It does not independently prove allegations,
               criminal history, identity or real-world
               background information.
            */

            const verificationPayload = {

                role:
                    normalizedRole,

                profile:
                    profile &&
                    typeof profile ===
                        "object"
                        ? profile
                        : {},

                evidence:
                    evidence ??
                    [],

                history:
                    history ??
                    {},

                complaints:
                    Array.isArray(
                        complaints
                    )
                        ? complaints
                        : []

            };


            const result =
                await callJSONAgent(

                    TRUST_AI_MODEL,

                    `

You are NutriCycle AI's
Security / Trust Verification Agent.

Your job is to analyze verification information
provided by NutriCycle's backend.

You may evaluate:

- internal verification evidence
- supplied identity fields
- consistency between profile fields
- supplied account history
- supplied complaint records
- unusual activity patterns
- missing verification information
- contradictions between supplied records

Important limitations:

- Do not invent facts.
- Do not independently claim that an allegation is true.
- Treat unverified complaints as unverified reports.
- Do not infer criminality from limited data.
- Do not infer protected personal characteristics.
- Do not make medical or psychological judgments.
- Do not claim that a person is dangerous.
- Flag uncertain cases for human review.
- Use neutral language such as "potential concern",
  "inconsistency" or "requires verification".
- A trust score is an internal risk-prioritization
  indicator, not a statement of a person's worth
  or character.
- Human review is required for high-impact decisions.

Return ONLY valid JSON.

`,

                    `

Evaluate the following NutriCycle verification data:

${JSON.stringify(
    verificationPayload
)}

Return this exact structure:

{
  "verified": false,
  "trustScore": 0.0,
  "riskLevel": "medium",
  "flags": [],
  "reasons": [],
  "requiresHumanReview": true
}

Rules:

- trustScore must be between 0 and 1
- riskLevel must be "low", "medium" or "high"
- verified should only be true when the supplied
  evidence supports the required verification
- missing evidence should prevent confident verification
- contradictions should be flagged
- unverified allegations must remain explicitly
  unverified
- high-risk or uncertain cases should require
  human review

`

                );


            const normalizedResult =
                normalizeTrustResult(
                    result
                );


            console.log(
                "NutriCycle AI — Trust Verification:",
                {

                    role:
                        normalizedRole,

                    trustScore:
                        normalizedResult.trustScore,

                    riskLevel:
                        normalizedResult.riskLevel,

                    requiresHumanReview:
                        normalizedResult.requiresHumanReview

                }
            );


            return res.json(
                normalizedResult
            );

        }

        catch (
            error
        ) {

            return sendServerError(
                res,
                error,
                "Security / Trust verification failed."
            );

        }

    }
);


/* ============================================================
   DATA GUARDIAN
============================================================ */

app.post(
    "/guardian",
    async (
        req,
        res
    ) => {

        if (
            !client
        ) {

            return res
                .status(
                    503
                )
                .json({

                    success:
                        false,

                    error:
                        "AI service is not configured."

                });

        }


        try {

            const {
                records,
                expectedFields,
                source,
                context
            } =
                req.body ||
                {};


            if (
                !Array.isArray(
                    records
                )
            ) {

                return res
                    .status(
                        400
                    )
                    .json({

                        success:
                            false,

                        error:
                            "An array of records is required."

                    });

            }


            /*
               Basic deterministic checks are performed
               before asking the AI for interpretation.
            */

            const basicChecks =
                runBasicGuardianChecks(
                    records
                );


            const guardianPayload = {

                records:
                    records,

                expectedFields:
                    Array.isArray(
                        expectedFields
                    )
                        ? expectedFields
                        : [],

                source:
                    typeof source ===
                    "string"
                        ? source
                        : "unknown",

                context:
                    context &&
                    typeof context ===
                        "object"
                        ? context
                        : {},

                deterministicChecks:
                    basicChecks

            };


            const result =
                await callJSONAgent(

                    GUARDIAN_AI_MODEL,

                    `

You are NutriCycle AI's Data Guardian.

Your job is to protect application data quality
and identify potential integrity problems.

Analyze supplied records for:

- missing required information
- inconsistent values
- duplicate records
- conflicting fields
- anomalous patterns
- corrupted-looking values
- schema inconsistencies
- suspicious data changes
- impossible or internally contradictory states

Important:

- Never invent missing records.
- Never invent database contents.
- Do not delete records.
- Do not modify records.
- Do not claim an anomaly is malicious without evidence.
- Distinguish exact deterministic duplicates from
  AI-detected suspicious patterns.
- High-impact data issues should require human review.
- Recommendations must be actionable and cautious.

Some checks are performed deterministically before
your analysis. Treat those exact duplicate-ID findings
as authoritative.

Return ONLY valid JSON.

`,

                    `

Analyze this NutriCycle dataset:

${JSON.stringify(
    guardianPayload
)}

Return this exact structure:

{
  "healthy": true,
  "anomalies": [],
  "duplicateRecords": [],
  "missingFields": [],
  "inconsistencies": [],
  "severity": "low",
  "requiresHumanReview": false,
  "recommendedActions": []
}

Rules:

- severity must be "low", "medium" or "high"
- healthy should be false when meaningful integrity
  problems are detected
- use empty arrays when no issues are found
- do not invent issues
- identify exact inconsistencies when possible
- recommend human review for high-impact problems

`

                );


            const normalizedResult =
                normalizeGuardianResult(
                    result,
                    basicChecks
                );


            console.log(
                "NutriCycle AI — Data Guardian:",
                {

                    totalRecords:
                        normalizedResult.totalRecords,

                    healthy:
                        normalizedResult.healthy,

                    anomalyCount:
                        normalizedResult.anomalies.length,

                    duplicateCount:
                        normalizedResult.duplicateRecords.length,

                    requiresHumanReview:
                        normalizedResult.requiresHumanReview

                }
            );


            return res.json(
                normalizedResult
            );

        }

        catch (
            error
        ) {

            return sendServerError(
                res,
                error,
                "Data Guardian analysis failed."
            );

        }

    }
);


/* ============================================================
   UNKNOWN ROUTES
============================================================ */

app.use(
    (
        req,
        res
    ) => {

        res
            .status(
                404
            )
            .json({

                success:
                    false,

                error:
                    "API route not found.",

                path:
                    req.path

            });

    }
);


/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "NutriCycle AI — Unhandled error:",
            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }


        return res
            .status(
                500
            )
            .json({

                success:
                    false,

                error:
                    "Unexpected server error."

            });

    }
);


/* ============================================================
   START SERVER
============================================================ */

app.listen(
    PORT,
    () => {

        console.log(
            "=================================================="
        );


        console.log(
            "NutriCycle AI — AI Gateway"
        );


        console.log(
            `Server running on port ${PORT}`
        );


        console.log(
            `Food Analysis Agent: ${FOOD_AI_MODEL}`
        );


        console.log(
            `NutriAssist: ${NUTRIASSIST_MODEL}`
        );


        console.log(
            `Security / Trust Agent: ${TRUST_AI_MODEL}`
        );


        console.log(
            `Data Guardian: ${GUARDIAN_AI_MODEL}`
        );


        console.log(
            `OpenAI configured: ${Boolean(client)}`
        );


        console.log(
            "=================================================="
        );

    }
);