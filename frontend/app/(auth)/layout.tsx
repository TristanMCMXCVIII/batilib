import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserPrimaryOrgId } from "@/lib/actions/organization";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (session?.user.emailVerified) {
        const orgId = await getUserPrimaryOrgId();
        redirect(orgId ? `/${orgId}` : "/onboarding");
    }

    return <>{children}</>;
}
