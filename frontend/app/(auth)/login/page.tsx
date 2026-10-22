"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setError(null);

        const { error } = await authClient.signIn.email({ email, password });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Email ou mot de passe incorrect.");
            return;
        }

        router.push("/app");
        router.refresh();
    }

    async function handleGoogleLogin() {
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
                    <h1 className="page-title">Se connecter à Batilib</h1>
                    <p className="mt-2 caption">Accédez à votre espace.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                    </div>

                    {error && <p className="text-error">{error}</p>}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                </form>

                <div className="auth-divider my-6">ou</div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    className="w-full"
                >
                    <GoogleIcon className="h-4 w-4" />
                    Continuer avec Google
                </Button>

                <p className="mt-6 text-center caption">
                    Pas encore de compte ?{" "}
                    <a href="/register" className="font-medium text-foreground">
                        Créer un compte
                    </a>
                </p>
            </Card>
        </main>
    );
}
