import { getSession } from "@/lib/session";
import ProfileClient from "./_components/profile-client";

export default async function ProfilePage() {
    const session = await getSession();

    return <ProfileClient user={session!.user} />;
}
