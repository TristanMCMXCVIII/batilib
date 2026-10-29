import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { emailOTP } from "better-auth/plugins";
import { sendEmail } from "@/lib/mail/send-email";
import { db } from "@/lib/db";
import { env } from "@/lib/env";


export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,

    database: db,

    emailAndPassword: {
        enabled: true,
        async sendResetPassword({ user, url }) {
            await sendEmail({
                to: user.email,
                subject: "Réinitialisez votre mot de passe Batilib",
                html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Réinitialisation de votre mot de passe</h2>
            <p>Vous avez demandé à réinitialiser votre mot de passe Batilib.</p>
            <p>
              <a href="${url}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
                Réinitialiser mon mot de passe
              </a>
            </p>
            <p style="color:#666;font-size:13px;">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
          </div>
        `,
            });
        },
    },

    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
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
        deleteUser: {
            enabled: true,
        },
    },

    account: {
        modelName: "Account",
        accountLinking: {
            enabled: true,
            trustedProviders: ["google", "credential"],
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