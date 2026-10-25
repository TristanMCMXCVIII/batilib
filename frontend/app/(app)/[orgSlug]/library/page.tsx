import { redirect } from "next/navigation";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function LibraryPage({ params }: Props) {
    const { orgSlug } = await params;
    redirect(`/${orgSlug}/library/work-items`);
}
