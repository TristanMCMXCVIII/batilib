import { redirect } from "next/navigation";
import { getOrgWithRole } from "@/lib/actions/organization-settings";
import PresentationForm from "../_components/presentation-form";

type Props = { params: Promise<{ orgId: string }> };

export default async function PresentationPage({ params }: Props) {
    const { orgId } = await params;
    const data = await getOrgWithRole(orgId);
    if (!data) redirect("/onboarding?context=kicked");

    return <PresentationForm org={data.org} orgId={orgId} isFounder={data.role === "FOUNDER"} />;
}
