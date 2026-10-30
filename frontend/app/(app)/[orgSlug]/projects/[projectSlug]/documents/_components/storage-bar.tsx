import { HardDrive } from "lucide-react";

function formatBytes(bytes: bigint): string {
    const b = Number(bytes);
    if (b === 0) return "0 o";
    if (b < 1024) return `${b} o`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

export function StorageBar({ usedBytes }: { usedBytes: string }) {
    const bytes = BigInt(usedBytes);
    const formatted = formatBytes(bytes);
    const isEmpty = bytes === BigInt(0);

    return (
        <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-subtle px-3.5 py-2.5">
            <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="caption">
                {isEmpty ? (
                    "Aucun document déposé sur ce projet"
                ) : (
                    <>
                        <span className="font-medium text-foreground">{formatted}</span>
                        {" "}utilisés sur ce projet
                    </>
                )}
            </p>
        </div>
    );
}
