export default function AdminLoading() {
    return (
        <div className="animate-pulse p-8">
            <div className="mx-auto max-w-6xl space-y-4">
                <div className="h-8 w-48 rounded-lg bg-neutral-200" />
                <div className="h-4 w-32 rounded-lg bg-neutral-200" />
                <div className="mt-6 h-64 rounded-xl bg-neutral-200" />
            </div>
        </div>
    );
}
