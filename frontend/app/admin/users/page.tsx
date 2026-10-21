import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsersPage() {
    const result = await auth.api.listUsers({
        headers: await headers(),
        query: {
            limit: 100,
            sortBy: "createdAt",
            sortDirection: "desc",
        },
    });

    return (
        <div className="p-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8">
                    <h1 className="page-title">Utilisateurs</h1>
                    <p className="mt-2 caption">
                        {result.total} utilisateur{result.total > 1 ? "s" : ""}
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-border bg-subtle">
                            <tr>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Nom</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Rôle</th>
                                <th className="px-4 py-3 font-medium text-muted-foreground">Inscription</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {result.users.map((user) => (
                                <tr key={user.id} className="hover:bg-subtle transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground">
                                        {user.name}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {user.email}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge variant={user.role === "admin" ? "info" : "neutral"}>
                                            {user.role}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
