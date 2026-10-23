import { redirect } from "next/navigation";
import { getUserPrimaryOrgId } from "@/lib/actions/organization";

export default async function AppIndexPage() {
    const orgId = await getUserPrimaryOrgId();
    if (!orgId) redirect("/onboarding");
    redirect(`/app/${orgId}`);
}
