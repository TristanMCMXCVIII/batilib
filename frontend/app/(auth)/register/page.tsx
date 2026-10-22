"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check } from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const passwordLongEnough = password.length >= 8;
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!passwordLongEnough) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }
        if (!passwordsMatch) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        setLoading(true);
        setError(null);

        const { error } = await authClient.signUp.email({ name, email, password });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Une erreur est survenue.");
            return;
        }

        await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
        });

        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    async function handleGoogleRegister() {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/app",
            errorCallbackURL: "/auth/error",
        });
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                <div className="mb-8">
                    <h1 className="page-title">Créer un compte</h1>
                    <p className="mt-2 caption">Rejoignez Batilib.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col gap-2.5">
                        <Label htmlFor="name">Nom</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Tristan Nocent"
                        />
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="vous@entreprise.fr"
                        />
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <Label htmlFor="password">Mot de passe</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {password.length > 0 && (
                            <p className={`flex items-center gap-1.5 text-xs transition-colors ${passwordLongEnough ? "text-success" : "text-muted-foreground"}`}>
                                {passwordLongEnough && <Check className="h-3 w-3" />}
                                8 caractères minimum
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                        <div className="relative">
                            <Input
                                id="confirm-password"
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && (
                            <p className={`flex items-center gap-1.5 text-xs transition-colors ${passwordsMatch ? "text-success" : "text-muted-foreground"}`}>
                                {passwordsMatch && <Check className="h-3 w-3" />}
                                {passwordsMatch ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas encore"}
                            </p>
                        )}
                    </div>

                    {error && <p className="text-error">{error}</p>}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Création..." : "Créer mon compte"}
                    </Button>
                </form>

                <div className="auth-divider my-6">ou</div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleRegister}
                    className="w-full"
                >
                    <GoogleIcon className="h-4 w-4" />
                    Continuer avec Google
                </Button>

                <p className="mt-6 text-center caption">
                    Déjà un compte ?{" "}
                    <a href="/login" className="font-medium text-foreground">
                        Se connecter
                    </a>
                </p>
            </Card>
        </main>
    );
}
