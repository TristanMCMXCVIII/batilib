import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserPrimaryOrgSlug } from "@/lib/actions/organization";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (session?.user.emailVerified) {
        const orgSlug = await getUserPrimaryOrgSlug();
        redirect(orgSlug ? `/${orgSlug}` : "/onboarding");
    }

    return <>{children}</>;
}
