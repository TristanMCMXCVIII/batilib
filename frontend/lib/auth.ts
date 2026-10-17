import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,

    database: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),

    emailAndPassword: {
        enabled: true,
    },

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },

    user: {
        modelName: "User",
        additionalFields: {
            role: {
                type: ["user", "admin"],
                required: false,
                defaultValue: "user",
                input: false,
            },
        },
    },

    account: {
        modelName: "Account",
        accountLinking: {
            enabled: true,
            trustedProviders: ["google", "email-password"],
        },
    },

    session: {
        modelName: "Session",
    },

    verification: {
        modelName: "Verification",
    },

    plugins: [
        admin({
            defaultRole: "user",
            adminRoles: ["admin"],
        }),
    ],
});