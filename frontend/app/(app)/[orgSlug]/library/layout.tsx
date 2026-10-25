import LibraryTabsNav from "./_components/library-tabs-nav";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgSlug: string }>;
};

export default async function LibraryLayout({ children, params }: Props) {
    const { orgSlug } = await params;

    const tabs = [
        { label: "Ouvrages", href: `/${orgSlug}/library/work-items` },
        { label: "Lots", href: `/${orgSlug}/library/work-packages` },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-border page-outer pt-8 pb-0">
                <h1 className="page-title">Bibliothèque</h1>
                <p className="caption mt-1">
                    La mémoire technique de votre entreprise : prix, rendements et savoir-faire accumulés au fil des chantiers.
                </p>
                <div className="mt-3">
                    <LibraryTabsNav tabs={tabs} />
                </div>
            </div>
            <div className="flex-1 overflow-auto page-outer">
                {children}
            </div>
        </div>
    );
}
