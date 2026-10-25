import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserPrimaryOrgSlug } from "@/lib/actions/organization";

export default async function RootPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) redirect("/login");
    if (!session.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    const orgSlug = await getUserPrimaryOrgSlug();
    if (!orgSlug) redirect("/onboarding");
    redirect(`/${orgSlug}`);
}
