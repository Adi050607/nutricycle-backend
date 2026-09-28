"use strict";

/* ============================================================
   NutriCycle AI
   AI API Gateway Client

   PURPOSE:
   - Centralize all frontend → AI backend communication
   - Keep the frontend independent of the hosting provider
   - Support local development and production deployment
   - Provide consistent timeout / retry / error handling
   - Expose all four NutriCycle AI agents through one client
============================================================ */


/* ============================================================
   GLOBAL CONFIGURATION
============================================================ */

const NutriCycleAIConfig =
    window.NutriCycleAIConfig ||
    {};


/* ============================================================
   DEFAULT CONFIGURATION
============================================================ */

const AI_API_CONFIG = Object.freeze({

    /*
     * Local development backend.
     */

    localApiBase:
        NutriCycleAIConfig.localApiBase ||
        "http://localhost:10000",


    /*
     * Production backend.
     *
     * IMPORTANT:
     * This is intentionally NOT hard-coded to Render.
     *
     * Later, the production backend URL can be supplied by:
     *
     * window.NutriCycleAIConfig.productionApiBase
     *
     * or a meta tag.
     *
     * If neither exists, the current website origin is used.
     *
     * This lets us move the backend to another provider
     * without modifying the agent client.
     */

    productionApiBase:
        NutriCycleAIConfig.productionApiBase ||
        "https://food-rescue-app-4jnl.onrender.com",


    /*
     * Maximum time allowed for one backend request.
     */

    requestTimeoutMs:
        Number.isFinite(
            Number(
                NutriCycleAIConfig.requestTimeoutMs
            )
        )
            ? Number(
                NutriCycleAIConfig.requestTimeoutMs
            )
            : 45000,


    /*
     * Retry only transient failures.
     *
     * 1 retry means:
     * initial request + 1 retry.
     */

    maxRetries:
        Number.isInteger(
            Number(
                NutriCycleAIConfig.maxRetries
            )
        )
            ? Math.max(
                0,
                Number(
                    NutriCycleAIConfig.maxRetries
                )
            )
            : 1,


    /*
     * Delay before the first retry.
     */

    retryDelayMs:
        Number.isFinite(
            Number(
                NutriCycleAIConfig.retryDelayMs
            )
        )
            ? Number(
                NutriCycleAIConfig.retryDelayMs
            )
            : 1200

});


/* ============================================================
   ENVIRONMENT
============================================================ */

function isLocalEnvironment() {

    const hostname =
        String(
            window.location.hostname ||
            ""
        )
            .trim()
            .toLowerCase();


    return (
        hostname ===
            "localhost" ||
        hostname ===
            "127.0.0.1"
    );

}


/* ============================================================
   BASE URL
============================================================ */

function normalizeBaseUrl(
    value
) {

    const cleaned =
        String(
            value ||
            ""
        )
            .trim()
            .replace(
                /\/+$/,
                ""
            );


    return cleaned;

}


function getProductionApiBase() {

    /*
     * Priority 1:
     * JavaScript configuration.
     */

    const configuredBase =
        normalizeBaseUrl(
            AI_API_CONFIG.productionApiBase
        );


    if (
        configuredBase
    ) {

        return configuredBase;

    }


    /*
     * Priority 2:
     * HTML meta tag.
     *
     * Example:
     *
     * <meta
     *     name="nutricycle-ai-api-base"
     *     content="https://your-backend.example.com"
     * >
     */

    const meta =
        document.querySelector(
            'meta[name="nutricycle-ai-api-base"]'
        );


    const metaBase =
        normalizeBaseUrl(
            meta?.content
        );


    if (
        metaBase
    ) {

        return metaBase;

    }


    /*
     * Priority 3:
     * Same-origin backend.
     *
     * This is useful when we eventually place the
     * API behind a reverse proxy / same-origin gateway.
     */

    return normalizeBaseUrl(
        window.location.origin
    );

}


/* ============================================================
   RESOLVE API BASE
============================================================ */

function getApiBaseUrl() {

    if (
        isLocalEnvironment()
    ) {

        return normalizeBaseUrl(
            AI_API_CONFIG.localApiBase
        );

    }


    return getProductionApiBase();

}


/* ============================================================
   RESOLVE ENDPOINT
============================================================ */

function buildEndpoint(
    path
) {

    const base =
        getApiBaseUrl();


    const cleanPath =
        String(
            path ||
            ""
        )
            .trim()
            .replace(
                /^\/+/,
                ""
            );


    return `${base}/${cleanPath}`;

}


/* ============================================================
   DELAY
============================================================ */

function sleep(
    milliseconds
) {

    return new Promise(
        resolve => {

            window.setTimeout(
                resolve,
                milliseconds
            );

        }
    );

}


/* ============================================================
   RETRY CLASSIFICATION
============================================================ */

function isRetryableStatus(
    status
) {

    return (
        status === 408 ||
        status === 425 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504
    );

}


/* ============================================================
   CUSTOM ERROR
============================================================ */

class NutriCycleAIError extends Error {

    constructor(
        message,
        details = {}
    ) {

        super(
            message
        );


        this.name =
            "NutriCycleAIError";


        this.status =
            details.status ??
            null;


        this.endpoint =
            details.endpoint ??
            "";


        this.retryable =
            details.retryable === true;


        this.responseBody =
            details.responseBody ??
            null;


        this.cause =
            details.cause ??
            null;

    }

}


/* ============================================================
   READ RESPONSE BODY
============================================================ */

async function readResponseBody(
    response
) {

    try {

        return await response.json();

    }

    catch {

        try {

            const text =
                await response.text();

            return {
                raw:
                    text
            };

        }

        catch {

            return null;

        }

    }

}


/* ============================================================
   EXTRACT SERVER ERROR MESSAGE
============================================================ */

function extractServerMessage(
    body,
    status
) {

    if (
        body &&
        typeof body === "object"
    ) {

        if (
            typeof body.error ===
            "string" &&
            body.error.trim()
        ) {

            return body.error.trim();

        }


        if (
            typeof body.message ===
            "string" &&
            body.message.trim()
        ) {

            return body.message.trim();

        }

    }


    return (
        `AI backend returned HTTP ${status}.`
    );

}


/* ============================================================
   GENERIC JSON REQUEST
============================================================ */

async function requestJSON(
    path,
    options = {}
) {

    const endpoint =
        buildEndpoint(
            path
        );


    const method =
        String(
            options.method ||
            "POST"
        )
            .toUpperCase();


    const body =
        options.body;


    const customHeaders =
        options.headers ||
        {};


    const timeoutMs =
        Number.isFinite(
            Number(
                options.timeoutMs
            )
        )
            ? Number(
                options.timeoutMs
            )
            : AI_API_CONFIG.requestTimeoutMs;


    const maxRetries =
        Number.isInteger(
            Number(
                options.maxRetries
            )
        )
            ? Math.max(
                0,
                Number(
                    options.maxRetries
                )
            )
            : AI_API_CONFIG.maxRetries;


    let lastError =
        null;


    for (
        let attempt = 0;
        attempt <= maxRetries;
        attempt++
    ) {

        const controller =
            new AbortController();


        const timeoutId =
            window.setTimeout(
                () => {

                    controller.abort();

                },
                timeoutMs
            );


        try {

            const headers = {

                Accept:
                    "application/json",

                ...customHeaders

            };


            /*
             * JSON body.
             */

            if (
                body !== undefined &&
                body !== null
            ) {

                headers[
                    "Content-Type"
                ] =
                    "application/json";

            }


            const response =
                await fetch(
                    endpoint,
                    {

                        method:
                            method,

                        headers:
                            headers,

                        body:
                            body !== undefined &&
                            body !== null
                                ? JSON.stringify(
                                    body
                                )
                                : undefined,

                        signal:
                            controller.signal

                    }
                );


            /*
             * Always consume the response once.
             */

            const responseBody =
                await readResponseBody(
                    response
                );


            if (
                response.ok
            ) {

                return (
                    responseBody
                );

            }


            const retryable =
                isRetryableStatus(
                    response.status
                );


            const message =
                extractServerMessage(
                    responseBody,
                    response.status
                );


            throw new NutriCycleAIError(
                message,
                {

                    status:
                        response.status,

                    endpoint:
                        endpoint,

                    retryable:
                        retryable,

                    responseBody:
                        responseBody

                }
            );

        }

        catch (error) {

            /*
             * Preserve our custom error.
             */

            if (
                error instanceof
                NutriCycleAIError
            ) {

                lastError =
                    error;

            }

            /*
             * Timeout.
             */

            else if (
                error?.name ===
                "AbortError"
            ) {

                lastError =
                    new NutriCycleAIError(

                        `AI request timed out after ${timeoutMs / 1000} seconds.`,

                        {

                            endpoint:
                                endpoint,

                            retryable:
                                true,

                            cause:
                                error

                        }

                    );

            }

            /*
             * Browser/network error.
             */

            else {

                lastError =
                    new NutriCycleAIError(

                        "Unable to reach the NutriCycle AI backend.",

                        {

                            endpoint:
                                endpoint,

                            retryable:
                                true,

                            cause:
                                error

                        }

                    );

            }

        }

        finally {

            window.clearTimeout(
                timeoutId
            );

        }


        /*
         * Stop when no retry is appropriate.
         */

        const shouldRetry =
            (
                attempt <
                maxRetries
            ) &&
            (
                lastError?.retryable ===
                true
            );


        if (
            !shouldRetry
        ) {

            break;

        }


        /*
         * Simple bounded backoff.
         */

        const delay =
            AI_API_CONFIG.retryDelayMs *
            Math.pow(
                2,
                attempt
            );


        console.warn(
            "NutriCycle AI — Retrying AI request:",
            {
                endpoint:
                    endpoint,

                attempt:
                    attempt + 1,

                nextDelayMs:
                    delay
            }
        );


        await sleep(
            delay
        );

    }


    throw (
        lastError ||
        new NutriCycleAIError(
            "Unknown AI gateway error.",
            {
                endpoint:
                    endpoint
            }
        )
    );

}


/* ============================================================
   FOOD ANALYSIS AGENT
============================================================ */

async function scanFood(
    image,
    extra = {}
) {

    if (
        !image
    ) {

        throw new NutriCycleAIError(
            "Food image is required before AI analysis.",
            {
                endpoint:
                    buildEndpoint(
                        "/scan"
                    ),

                retryable:
                    false
            }
        );

    }


    return requestJSON(
        "/scan",
        {

            method:
                "POST",

            body: {

                image:
                    image,

                ...extra

            }

        }
    );

}


/* ============================================================
   NUTRIASSIST
============================================================ */

async function chat(
    message,
    context = {}
) {

    if (
        !String(
            message ||
            ""
        ).trim()
    ) {

        throw new NutriCycleAIError(
            "NutriAssist requires a message.",
            {
                endpoint:
                    buildEndpoint(
                        "/chat"
                    ),

                retryable:
                    false
            }
        );

    }


    return requestJSON(
        "/chat",
        {

            method:
                "POST",

            body: {

                message:
                    String(
                        message
                    ).trim(),

                context:
                    context

            }

        }
    );

}


/* ============================================================
   SECURITY / TRUST VERIFICATION AGENT
============================================================ */

async function verify(
    payload
) {

    if (
        !payload ||
        typeof payload !==
        "object"
    ) {

        throw new NutriCycleAIError(
            "Verification payload is required.",
            {
                endpoint:
                    buildEndpoint(
                        "/verify"
                    ),

                retryable:
                    false
            }
        );

    }


    return requestJSON(
        "/verify",
        {

            method:
                "POST",

            body:
                payload

        }
    );

}


/* ============================================================
   DATA GUARDIAN
============================================================ */

async function guardian(
    records
) {

    if (
        !Array.isArray(
            records
        )
    ) {

        throw new NutriCycleAIError(
            "Data Guardian requires an array of records.",
            {
                endpoint:
                    buildEndpoint(
                        "/guardian"
                    ),

                retryable:
                    false
            }
        );

    }


    return requestJSON(
        "/guardian",
        {

            method:
                "POST",

            body: {

                records:
                    records

            }

        }
    );

}


/* ============================================================
   HEALTH
============================================================ */

async function health() {

    return requestJSON(
        "/health",
        {

            method:
                "GET"

        }
    );

}


/* ============================================================
   AGENT REGISTRY
============================================================ */

async function agents() {

    return requestJSON(
        "/agents",
        {

            method:
                "GET"

        }
    );

}


/* ============================================================
   RUNTIME CONFIGURATION
============================================================ */

function getConfig() {

    return {

        environment:
            isLocalEnvironment()
                ? "local"
                : "production",

        apiBaseUrl:
            getApiBaseUrl(),

        requestTimeoutMs:
            AI_API_CONFIG.requestTimeoutMs,

        maxRetries:
            AI_API_CONFIG.maxRetries

    };

}


/* ============================================================
   RUNTIME PRODUCTION URL OVERRIDE
============================================================ */

function setProductionApiBase(
    url
) {

    const normalized =
        normalizeBaseUrl(
            url
        );


    if (
        !normalized
    ) {

        throw new NutriCycleAIError(
            "Production AI API base URL cannot be empty.",
            {
                retryable:
                    false
            }
        );

    }


    /*
     * Runtime override.
     *
     * This does not modify source files.
     */

    AI_API_RUNTIME.productionApiBase =
        normalized;


    console.log(
        "NutriCycle AI — Production AI API base updated:",
        normalized
    );

}


/* ============================================================
   RUNTIME CONFIG OBJECT
============================================================ */

const AI_API_RUNTIME = {

    productionApiBase:
        null

};


/* ============================================================
   RUNTIME BASE RESOLUTION OVERRIDE
============================================================ */

function getProductionApiBaseWithRuntimeOverride() {

    if (
        AI_API_RUNTIME
            .productionApiBase
    ) {

        return (
            AI_API_RUNTIME
                .productionApiBase
        );

    }


    return getProductionApiBase();

}


/* ============================================================
   FINAL BASE RESOLUTION PATCH
============================================================ */

/*
 * Replace the internal production resolver with the
 * runtime-aware version.
 */

const originalGetApiBaseUrl =
    getApiBaseUrl;


function getResolvedApiBaseUrl() {

    if (
        isLocalEnvironment()
    ) {

        return normalizeBaseUrl(
            AI_API_CONFIG.localApiBase
        );

    }


    return (
        getProductionApiBaseWithRuntimeOverride()
    );

}


/* ============================================================
   FINAL ENDPOINT BUILDER
============================================================ */

function buildResolvedEndpoint(
    path
) {

    const base =
        getResolvedApiBaseUrl();


    const cleanPath =
        String(
            path ||
            ""
        )
            .trim()
            .replace(
                /^\/+/,
                ""
            );


    return `${base}/${cleanPath}`;

}


/* ============================================================
   REASSIGN API REQUEST RESOLVER
============================================================ */

function requestWithResolvedEndpoint(
    path,
    options = {}
) {

    const endpoint =
        buildResolvedEndpoint(
            path
        );


    return requestJSONWithEndpoint(
        endpoint,
        options
    );

}


/* ============================================================
   JSON REQUEST WITH EXPLICIT ENDPOINT
============================================================ */

async function requestJSONWithEndpoint(
    endpoint,
    options = {}
) {

    const method =
        String(
            options.method ||
            "POST"
        )
            .toUpperCase();


    const body =
        options.body;


    const customHeaders =
        options.headers ||
        {};


    const timeoutMs =
        Number.isFinite(
            Number(
                options.timeoutMs
            )
        )
            ? Number(
                options.timeoutMs
            )
            : AI_API_CONFIG.requestTimeoutMs;


    const maxRetries =
        Number.isInteger(
            Number(
                options.maxRetries
            )
        )
            ? Math.max(
                0,
                Number(
                    options.maxRetries
                )
            )
            : AI_API_CONFIG.maxRetries;


    let lastError =
        null;


    for (
        let attempt = 0;
        attempt <= maxRetries;
        attempt++
    ) {

        const controller =
            new AbortController();


        const timeoutId =
            window.setTimeout(
                () => {

                    controller.abort();

                },
                timeoutMs
            );


        try {

            const headers = {

                Accept:
                    "application/json",

                ...customHeaders

            };


            if (
                body !== undefined &&
                body !== null
            ) {

                headers[
                    "Content-Type"
                ] =
                    "application/json";

            }


            const response =
                await fetch(
                    endpoint,
                    {

                        method:
                            method,

                        headers:
                            headers,

                        body:
                            body !== undefined &&
                            body !== null
                                ? JSON.stringify(
                                    body
                                )
                                : undefined,

                        signal:
                            controller.signal

                    }
                );


            const responseBody =
                await readResponseBody(
                    response
                );


            if (
                response.ok
            ) {

                return (
                    responseBody
                );

            }


            const retryable =
                isRetryableStatus(
                    response.status
                );


            const message =
                extractServerMessage(
                    responseBody,
                    response.status
                );


            throw new NutriCycleAIError(
                message,
                {

                    status:
                        response.status,

                    endpoint:
                        endpoint,

                    retryable:
                        retryable,

                    responseBody:
                        responseBody

                }
            );

        }

        catch (error) {

            if (
                error instanceof
                NutriCycleAIError
            ) {

                lastError =
                    error;

            }

            else if (
                error?.name ===
                "AbortError"
            ) {

                lastError =
                    new NutriCycleAIError(

                        `AI request timed out after ${timeoutMs / 1000} seconds.`,

                        {

                            endpoint:
                                endpoint,

                            retryable:
                                true,

                            cause:
                                error

                        }

                    );

            }

            else {

                lastError =
                    new NutriCycleAIError(

                        "Unable to reach the NutriCycle AI backend.",

                        {

                            endpoint:
                                endpoint,

                            retryable:
                                true,

                            cause:
                                error

                        }

                    );

            }

        }

        finally {

            window.clearTimeout(
                timeoutId
            );

        }


        const shouldRetry =
            (
                attempt <
                maxRetries
            ) &&
            (
                lastError?.retryable ===
                true
            );


        if (
            !shouldRetry
        ) {

            break;

        }


        const delay =
            AI_API_CONFIG.retryDelayMs *
            Math.pow(
                2,
                attempt
            );


        console.warn(
            "NutriCycle AI — Retrying AI request:",
            {
                endpoint:
                    endpoint,

                attempt:
                    attempt + 1,

                nextDelayMs:
                    delay
            }
        );


        await sleep(
            delay
        );

    }


    throw (
        lastError ||
        new NutriCycleAIError(
            "Unknown AI gateway error.",
            {
                endpoint:
                    endpoint
            }
        )
    );

}


/* ============================================================
   PUBLIC API
============================================================ */

const NutriCycleAIApi = Object.freeze({

    scanFood: (

        image,
        extra = {}

    ) =>

        requestWithResolvedEndpoint(
            "/scan",
            {

                method:
                    "POST",

                body: {

                    image:
                        image,

                    ...extra

                }

            }
        ),


    chat: (

        message,
        context = {}

    ) =>

        requestWithResolvedEndpoint(
            "/chat",
            {

                method:
                    "POST",

                body: {

                    message:
                        String(
                            message ||
                            ""
                        ).trim(),

                    context:
                        context

                }

            }
        ),


    verify: (

        payload

    ) =>

        requestWithResolvedEndpoint(
            "/verify",
            {

                method:
                    "POST",

                body:
                    payload

            }
        ),


    guardian: (

        records

    ) =>

        requestWithResolvedEndpoint(
            "/guardian",
            {

                method:
                    "POST",

                body: {

                    records:
                        records

                }

            }
        ),


    health: () =>

        requestWithResolvedEndpoint(
            "/health",
            {

                method:
                    "GET"

            }
        ),


    agents: () =>

        requestWithResolvedEndpoint(
            "/agents",
            {

                method:
                    "GET"

            }
        ),


    getConfig: () => ({

        environment:
            isLocalEnvironment()
                ? "local"
                : "production",

        apiBaseUrl:
            getResolvedApiBaseUrl(),

        requestTimeoutMs:
            AI_API_CONFIG.requestTimeoutMs,

        maxRetries:
            AI_API_CONFIG.maxRetries

    }),


    setProductionApiBase:

        setProductionApiBase,


    Error:
        NutriCycleAIError

});


/* ============================================================
   GLOBAL EXPORT
============================================================ */

window.NutriCycleAIApi =
    NutriCycleAIApi;


/* ============================================================
   READY LOG
============================================================ */

console.log(
    "NutriCycle AI — API Gateway Client Ready",
    NutriCycleAIApi.getConfig()
);