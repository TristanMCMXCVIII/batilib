"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

function VerifyEmailContent() {
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

        const { error } = await authClient.emailOtp.verifyEmail({ email, otp });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Code invalide ou expiré.");
            return;
        }

        router.push("/");
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
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                <h1 className="page-title">Vérifiez votre email</h1>
                <p className="mt-2 caption">Nous avons envoyé un code à {email}</p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <Input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        className="input-otp"
                        placeholder="000000"
                    />

                    {error && <p className="text-error">{error}</p>}

                    <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
                        {loading ? "Vérification..." : "Vérifier mon email"}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleResend}
                        disabled={resendLoading}
                        className="w-full"
                    >
                        {resendLoading ? "Envoi..." : "Renvoyer le code"}
                    </Button>

                    {message && <p className="text-center text-success-msg">{message}</p>}
                </form>
            </Card>
        </main>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailContent />
        </Suspense>
    );
}
