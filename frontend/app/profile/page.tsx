import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProfileClient from "@/components/profile/profile-client";

export default async function ProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    if (!session.user.emailVerified) {
        redirect(
            `/verify-email?email=${encodeURIComponent(session.user.email)}`
        );
    }

    return <ProfileClient user={session.user} />;
}