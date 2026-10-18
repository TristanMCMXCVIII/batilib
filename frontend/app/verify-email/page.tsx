"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function VerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const email = searchParams.get("email") ?? "";

    const [otp, setOtp] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [resendLoading, setResendLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setError(null);

        const { error } = await authClient.emailOtp.verifyEmail({
            email,
            otp,
        });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Code invalide ou expiré.");
            return;
        }

        router.push("/app");
        router.refresh();
    }


    async function handleResend() {
        setResendLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
        });

        setResendLoading(false);

        if (error) {
            setError(error.message ?? "Impossible de renvoyer le code.");
            return;
        }

        setMessage("Un nouveau code vient de vous être envoyé.");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-neutral-900">
                    Vérifiez votre email
                </h1>

                <p className="mt-2 text-sm text-neutral-500">
                    Nous avons envoyé un code à {email}
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(event) =>
                            setOtp(event.target.value.replace(/\D/g, ""))
                        }
                        className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-neutral-900"
                        placeholder="000000"
                    />

                    {error && (
                        <p className="text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || otp.length !== 6}
                        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                        {loading ? "Vérification..." : "Vérifier mon email"}
                    </button>

                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendLoading}
                        className="w-full text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
                    >
                        {resendLoading ? "Envoi..." : "Renvoyer le code"}
                    </button>

                    {message && (
                        <p className="text-center text-sm text-green-700">
                            {message}
                        </p>
                    )}
                </form>
            </div>
        </main>
    );
}