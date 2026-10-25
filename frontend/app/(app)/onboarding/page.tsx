import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserPrimaryOrgSlug } from "@/lib/actions/organization";
import OnboardingForm from "./_components/onboarding-form";

type Props = {
    searchParams: Promise<{ context?: string }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session?.user.email ?? "")}`);
    }

    // If the user already has an active org, send them to the app
    const orgSlug = await getUserPrimaryOrgSlug();
    if (orgSlug) redirect(`/${orgSlug}`);

    const { context } = await searchParams;

    return (
        <OnboardingForm
            userName={session.user.name}
            context={context === "kicked" ? "kicked" : null}
        />
    );
}
