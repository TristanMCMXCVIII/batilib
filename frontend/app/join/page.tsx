import { getSession } from "@/lib/session";
import { getInvitationPreview } from "@/lib/actions/invitation";
import JoinClient from "./_components/join-client";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function JoinPage({ searchParams }: Props) {
    const { token } = await searchParams;

    if (!token) return <InvalidInvitation reason="missing" />;

    const [invitation, session] = await Promise.all([
        getInvitationPreview(token),
        getSession(),
    ]);

    if (!invitation) return <InvalidInvitation reason="expired" />;

    return (
        <JoinClient
            token={token}
            orgName={invitation.orgName}
            orgSlug={invitation.orgSlug}
            role={invitation.role}
            inviterName={invitation.inviterName}
            invitationEmail={invitation.email}
            sessionEmail={session?.user.email ?? null}
        />
    );
}

function InvalidInvitation({ reason }: { reason: "missing" | "expired" }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <div className="text-center max-w-sm">
                <h1 className="page-title">Invitation invalide</h1>
                <p className="mt-2 caption">
                    {reason === "expired"
                        ? "Ce lien d'invitation a expiré ou a déjà été utilisé."
                        : "Lien d'invitation manquant."}
                </p>
                <a href="/login" className="mt-6 inline-block text-sm font-medium text-foreground hover:underline">
                    Aller à la page de connexion
                </a>
            </div>
        </main>
    );
}
