import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserPrimaryOrgId } from "@/lib/actions/organization";

export default async function RootPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) redirect("/login");
    if (!session.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    const orgId = await getUserPrimaryOrgId();
    if (!orgId) redirect("/onboarding");
    redirect(`/app/${orgId}`);
}
