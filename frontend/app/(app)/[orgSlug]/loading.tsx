import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
    return (
        <div className="flex flex-col h-full">
            {/* En-tête — titre + onglets */}
            <div className="border-b border-border page-outer pt-8 pb-0">
                <Skeleton className="h-8 w-48" />
                <div className="mt-3 flex gap-0.5 pb-0">
                    <div className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></div>
                    <div className="px-4 py-2.5"><Skeleton className="h-4 w-16" /></div>
                    <div className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></div>
                </div>
            </div>

            {/* Contenu — présentation */}
            <div className="flex-1 overflow-auto page-outer">
                <div className="py-10 max-w-2xl space-y-16">

                    {/* Section Identité */}
                    <section className="space-y-5">
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-8 w-24 rounded-md" />
                        </div>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-5 w-32 rounded-full" />
                            </div>
                        </div>
                        <Skeleton className="h-4 w-72" />
                    </section>

                    {/* Section Informations légales */}
                    <section className="space-y-5">
                        <div className="flex items-start justify-between">
                            <Skeleton className="h-6 w-44" />
                            <Skeleton className="h-8 w-24 rounded-md" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1.5">
                                <Skeleton className="h-4 w-12" />
                                <Skeleton className="h-4 w-64" />
                            </div>
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
