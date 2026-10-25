type Props = {
    params: Promise<{ orgSlug: string }>;
};

export default async function OrgHomePage({ params }: Props) {
    const { orgSlug } = await params;

    return (
        <div className="p-8">
            <div className="mx-auto max-w-5xl">
                <h1 className="page-title">Accueil</h1>
                <p className="mt-1 caption">Bienvenue sur Batilib.</p>
                <p className="mt-4 text-xs text-muted-foreground font-mono">{orgSlug}</p>
            </div>
        </div>
    );
}
