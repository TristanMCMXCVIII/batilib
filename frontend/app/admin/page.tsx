import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    const requestHeaders = await headers();

    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session) {
        redirect("/login");
    }

    if (!session.user.emailVerified) {
        redirect(
            `/verify-email?email=${encodeURIComponent(session.user.email)}`
        );
    }

    if (session.user.role !== "admin") {
        redirect("/app");
    }

    const result = await auth.api.listUsers({
        headers: requestHeaders,
        query: {
            limit: 100,
            sortBy: "createdAt",
            sortDirection: "desc",
        },
    });

    return (
        <main className="min-h-screen bg-neutral-50 p-8">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-neutral-900">
                        Administration
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        {result.total} utilisateur{result.total > 1 ? "s" : ""}
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-neutral-200 bg-neutral-50">
                        <tr>
                            <th className="px-4 py-3 font-medium text-neutral-600">
                                Nom
                            </th>
                            <th className="px-4 py-3 font-medium text-neutral-600">
                                Email
                            </th>
                            <th className="px-4 py-3 font-medium text-neutral-600">
                                Rôle
                            </th>
                            <th className="px-4 py-3 font-medium text-neutral-600">
                                Inscription
                            </th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-neutral-100">
                        {result.users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-4 py-3 font-medium text-neutral-900">
                                    {user.name}
                                </td>

                                <td className="px-4 py-3 text-neutral-600">
                                    {user.email}
                                </td>

                                <td className="px-4 py-3">
                    <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                      {user.role}
                    </span>
                                </td>

                                <td className="px-4 py-3 text-neutral-500">
                                    {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
}