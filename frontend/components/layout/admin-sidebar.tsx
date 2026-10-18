"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/admin/users", label: "Utilisateurs" },
    { href: "/admin/subscriptions", label: "Abonnements" },
    { href: "/admin/projects", label: "Projets" },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-56 flex-shrink-0 flex flex-col h-full bg-neutral-900 text-white">
            <div className="px-4 h-14 flex items-center border-b border-neutral-700">
                <span className="font-semibold text-white">Administration</span>
            </div>

            <nav className="flex-1 p-3 space-y-0.5">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            pathname.startsWith(item.href)
                                ? "bg-neutral-700 text-white"
                                : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                        }`}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-3 border-t border-neutral-700">
                <Link
                    href="/app"
                    className="flex items-center px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                >
                    ← Retour à l'application
                </Link>
            </div>
        </aside>
    );
}
