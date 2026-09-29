import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
    database: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),

    emailAndPassword: {
        enabled: true,
    },

    user: {
        modelName: "User",
        additionalFields: {
            role: {
                type: ["USER", "ADMIN"],
                required: false,
                defaultValue: "USER",
                input: false,
            },
        },
    },

    account: {
        modelName: "Account",
    },

    session: {
        modelName: "Session",
    },

    verification: {
        modelName: "Verification",
    },
});