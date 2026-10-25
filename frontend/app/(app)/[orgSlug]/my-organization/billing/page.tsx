import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getOrgWithRole } from "@/lib/actions/organization-settings";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function BillingPage({ params }: Props) {
    const { orgSlug } = await params;
    const data = await getOrgWithRole(orgSlug);

    if (!data) redirect("/onboarding?context=kicked");
    if (data.org.kind !== "BUILDING_COMPANY") redirect(`/${orgSlug}/my-organization/presentation`);

    return (
        <div className="py-10 max-w-2xl">
            <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="body-sm font-medium">Accès bêta gratuit</p>
                <p className="mt-1 caption max-w-sm">
                    Batilib est en phase de bêta test. Vous bénéficiez d&apos;un accès complet et gratuit
                    pendant au moins 4 mois. En échange, vos retours nous aident à améliorer l&apos;application
                    avant son lancement officiel.
                </p>
            </div>
        </div>
    );
}
