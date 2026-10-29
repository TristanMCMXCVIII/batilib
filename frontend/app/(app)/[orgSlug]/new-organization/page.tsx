import { getSession } from "@/lib/session";
import OnboardingForm from "@/app/(app)/onboarding/_components/onboarding-form";

export default async function NewOrganizationPage() {
    const session = await getSession();

    return <OnboardingForm userName={session?.user.name ?? ""} />;
}
