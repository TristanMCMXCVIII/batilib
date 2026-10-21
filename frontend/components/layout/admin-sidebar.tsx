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
        <aside className="flex h-full w-56 flex-shrink-0 flex-col bg-[oklch(0.10_0_0)] text-white">
            <div className="flex h-14 items-center border-b border-[oklch(0.22_0_0)] px-4">
                <span className="font-semibold text-white">Administration</span>
            </div>

            <nav className="flex-1 space-y-0.5 p-3">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item-dark ${pathname.startsWith(item.href) ? "nav-item-dark-active" : ""}`}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="border-t border-[oklch(0.22_0_0)] p-3">
                <Link
                    href="/app"
                    className="nav-item-dark"
                >
                    ← Retour à l'application
                </Link>
            </div>
        </aside>
    );
}
