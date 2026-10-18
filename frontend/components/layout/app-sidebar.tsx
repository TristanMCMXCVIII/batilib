"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type User = {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
};

const navItems = [
    { href: "/app", label: "Accueil" },
    { href: "/profile", label: "Mon compte" },
];

export default function AppSidebar({ user }: { user: User }) {
    const pathname = usePathname();
    const router = useRouter();

    async function handleSignOut() {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <aside className="w-56 flex-shrink-0 flex flex-col h-full bg-white border-r border-neutral-200">
            <div className="px-4 h-14 flex items-center border-b border-neutral-200">
                <span className="font-semibold text-neutral-900">Batilib</span>
            </div>

            <nav className="flex-1 p-3 space-y-0.5">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            pathname === item.href
                                ? "bg-neutral-100 text-neutral-900"
                                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                        }`}
                    >
                        {item.label}
                    </Link>
                ))}

                {user.role === "admin" && (
                    <Link
                        href="/admin/users"
                        className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            pathname.startsWith("/admin")
                                ? "bg-neutral-100 text-neutral-900"
                                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                        }`}
                    >
                        Administration
                    </Link>
                )}
            </nav>

            <div className="p-3 border-t border-neutral-200">
                <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
                    {user.image ? (
                        <img
                            src={user.image}
                            alt={user.name}
                            className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                        />
                    ) : (
                        <div className="h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-neutral-600 flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{user.name}</p>
                        <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                    </div>
                </div>

                <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                    Se déconnecter
                </button>
            </div>
        </aside>
    );
}
