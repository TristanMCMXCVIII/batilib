import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getUserPrimaryOrgSlug } from "@/lib/actions/organization";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession();

    if (session?.user.emailVerified) {
        const orgSlug = await getUserPrimaryOrgSlug();
        redirect(orgSlug ? `/${orgSlug}` : "/onboarding");
    }

    return <>{children}</>;
}
