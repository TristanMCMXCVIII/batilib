import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import OnboardingForm from "@/app/(app)/onboarding/_components/onboarding-form";

export default async function NewOrganizationPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    return <OnboardingForm userName={session?.user.name ?? ""} />;
}
