import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

if (!process.env.ARCJET_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("ARCJET_KEY environment variable is not set");
}

// A minimal no-op stub that satisfies the same interface used by middleware.
// Only used in test environments (or when no key is configured).
const noopClient = {
    protect: async () => ({
        isDenied: () => false,
        isErrored: () => false,
        reason: null,
        results: [],
        ip: {},
    }),
    withRule: () => noopClient,
};

const aj = process.env.ARCJET_KEY
    ? arcjet({
        key: process.env.ARCJET_KEY,
        rules: [
            // Shield protects your app from common attacks e.g. SQL injection
            shield({ mode: "LIVE" }),
            // Create a bot detection rule
            detectBot({
                mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
                // Block all bots except the following
                allow: [
                    "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
                    // Uncomment to allow these other common bot categories
                    // See the full list at https://arcjet.com/bot-list
                    //"CATEGORY:MONITOR", // Uptime monitoring services
                    "CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
                ],
            }),
            slidingWindow({
                mode: "LIVE",
                interval: "2s",
                max: 5,
            }),
        ],
    })
    : noopClient;

export default aj;
