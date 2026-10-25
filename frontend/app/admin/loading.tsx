export default function AdminLoading() {
    return (
        <div className="page-outer pt-8 pb-10 animate-pulse">
            <div className="max-w-5xl space-y-4">
                <div className="h-8 w-48 rounded-lg bg-subtle" />
                <div className="h-4 w-32 rounded-lg bg-subtle" />
                <div className="mt-6 h-64 rounded-xl bg-subtle" />
            </div>
        </div>
    );
}
