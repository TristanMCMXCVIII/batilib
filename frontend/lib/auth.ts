import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins";
import { sendEmail } from "@/lib/mail/send-email";
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

        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                await sendEmail({
                    to: email,
                    subject:
                        type === "email-verification"
                            ? "Votre code de vérification Batilib"
                            : "Votre code Batilib",
                    html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Votre code Batilib</h2>
            <p>Utilisez ce code pour vérifier votre adresse email :</p>
            <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px;">
              ${otp}
            </p>
            <p>Ce code expire bientôt.</p>
          </div>
        `,
                });
            },

            otpLength: 6,
            expiresIn: 300,
            overrideDefaultEmailVerification: true,
        }),
    ],
});