"use client";

import { useEffect } from "react";

// Attrape les erreurs dans le root layout (app/layout.tsx).
// Doit inclure <html> et <body> car il remplace entièrement le layout.
export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[root layout error]", error);
    }, [error]);

    return (
        <html lang="fr">
            <body style={{ margin: 0, fontFamily: "sans-serif", background: "#fff" }}>
                <main
                    style={{
                        display: "flex",
                        minHeight: "100vh",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1.5rem",
                    }}
                >
                    <div style={{ maxWidth: 400, width: "100%" }}>
                        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                            Erreur critique
                        </h1>
                        <p style={{ color: "#666", marginBottom: "1rem" }}>
                            L&apos;application n&apos;a pas pu se charger correctement.
                        </p>
                        {error.digest && (
                            <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#999", marginBottom: "1rem" }}>
                                Référence : {error.digest}
                            </p>
                        )}
                        <button
                            onClick={reset}
                            style={{
                                padding: "0.5rem 1rem",
                                background: "#000",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                            }}
                        >
                            Réessayer
                        </button>
                    </div>
                </main>
            </body>
        </html>
    );
}
