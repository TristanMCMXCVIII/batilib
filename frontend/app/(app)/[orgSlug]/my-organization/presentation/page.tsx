import { redirect } from "next/navigation";
import { getOrgWithRole } from "@/lib/actions/organization-settings";
import PresentationForm from "../_components/presentation-form";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function PresentationPage({ params }: Props) {
    const { orgSlug } = await params;
    const data = await getOrgWithRole(orgSlug);
    if (!data) redirect("/onboarding?context=kicked");

    return <PresentationForm org={data.org} orgSlug={orgSlug} isFounder={data.role === "FOUNDER"} />;
}
