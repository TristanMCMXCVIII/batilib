import UtilsTabsNav from "./_components/utils-tabs-nav";

const tabs = [
    { label: "Catégories de métiers", href: "/admin/utils/trade-category" },
    { label: "Plans d'abonnement", href: "/admin/utils/plans" },
];

export default function UtilsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-border page-outer pt-8 pb-0">
                <h1 className="page-title">Utilitaires</h1>
                <div className="mt-3">
                    <UtilsTabsNav tabs={tabs} />
                </div>
            </div>
            <div className="flex-1 overflow-auto page-outer">
                {children}
            </div>
        </div>
    );
}
