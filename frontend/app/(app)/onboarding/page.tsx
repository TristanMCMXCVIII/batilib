import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getUserPrimaryOrgSlug } from "@/lib/actions/organization";
import OnboardingForm from "./_components/onboarding-form";

type Props = {
    searchParams: Promise<{ context?: string; redirectTo?: string }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
    const session = await getSession();

    if (!session?.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session?.user.email ?? "")}`);
    }

    const { context, redirectTo } = await searchParams;

    // Validate redirectTo before trusting it
    const safeRedirectTo =
        redirectTo && redirectTo.startsWith("/") ? redirectTo : undefined;

    // If the user already has an active org, send them to the app —
    // unless they're here to create a new org for a specific redirectTo (e.g. join-project)
    if (!safeRedirectTo) {
        const orgSlug = await getUserPrimaryOrgSlug();
        if (orgSlug) redirect(`/${orgSlug}`);
    }

    return (
        <OnboardingForm
            userName={session.user.name}
            context={context === "kicked" ? "kicked" : null}
            redirectTo={safeRedirectTo}
        />
    );
}
