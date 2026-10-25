import { CreditCard } from "lucide-react";

export default function PlansPage() {
    return (
        <div className="py-10 max-w-2xl">
            <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="body-sm font-medium">Tarification non encore définie</p>
                <p className="mt-1 caption max-w-sm">
                    Les plans d&apos;abonnement seront configurés ici une fois le modèle commercial arrêté.
                    Cet espace permettra de gérer les produits et prix Stripe associés à chaque offre
                    proposée aux entreprises.
                </p>
            </div>
        </div>
    );
}
