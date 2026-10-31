import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getWorkItemTemplateDetail } from "@/lib/actions/work-item-templates";
import WitDetailClient from "./_components/wit-detail-client";

type Props = {
    params: Promise<{ orgSlug: string; templateId: string }>;
};

export default async function WitDetailPage({ params }: Props) {
    const { orgSlug, templateId } = await params;

    const { data, error } = await getWorkItemTemplateDetail(orgSlug, templateId);

    if (error || !data) notFound();

    return (
        <main className="pt-8 pb-16">
            <div className="mb-6">
                <Link
                    href={`/${orgSlug}/library/work-items`}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Ouvrages
                </Link>
            </div>

            <WitDetailClient orgSlug={orgSlug} data={data} />
        </main>
    );
}
