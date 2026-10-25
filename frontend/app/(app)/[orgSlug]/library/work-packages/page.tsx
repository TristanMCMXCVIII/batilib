export default function WorkPackagesPage() {
    return (
        <main className="py-8 max-w-5xl">
            <div className="mb-8">
                <h2 className="section-title">Lots</h2>
                <p className="caption mt-1">
                    Les lots regroupent des ouvrages par corps de métier ou par phase. Ils servent de base
                    pour structurer vos devis et vos chantiers.
                </p>
            </div>

            <div className="flex flex-col gap-6">
                <section>
                    <h3 className="body-sm font-medium mb-3">Lots types</h3>
                    <div className="rounded-lg border border-border bg-subtle/50 py-12 text-center">
                        <p className="caption">Aucun lot pour l&apos;instant.</p>
                    </div>
                </section>

                <section>
                    <h3 className="body-sm font-medium mb-3">Lots personnalisés</h3>
                    <div className="rounded-lg border border-border bg-subtle/50 py-12 text-center">
                        <p className="caption">Aucun lot pour l&apos;instant.</p>
                    </div>
                </section>
            </div>
        </main>
    );
}
