import { redirect } from "next/navigation";
import { getOrgWithRole } from "@/lib/actions/organization-settings";

type Props = { params: Promise<{ orgId: string }> };

export default async function BillingPage({ params }: Props) {
    const { orgId } = await params;
    const data = await getOrgWithRole(orgId);

    if (!data) redirect("/onboarding?context=kicked");
    if (data.org.kind !== "BUILDING_COMPANY") redirect(`/${orgId}/my-organization/presentation`);

    return (
        <div className="max-w-lg">
            <h2 className="section-title mb-1">Facturation Batilib</h2>
            <p className="caption">La gestion de votre abonnement sera disponible prochainement.</p>
        </div>
    );
}
