import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { updateUserCredits } from "./actions";

function isAdminEmail(email: string | null) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

function toNumber(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function AdminUsersPage() {
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;

  if (!isAdminEmail(primaryEmail)) {
    return (
      <div className="min-h-screen bg-[#0a0b10] text-white">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="mt-3 text-sm text-white/60">
            This page is restricted to admins.
          </p>
        </div>
      </div>
    );
  }

  const client = await clerkClient();
  const users = await client.users.getUserList({
    limit: 50,
  });

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Users & Credits</h1>
          <p className="mt-2 text-sm text-white/60">
            Update user credit balances directly.
          </p>
        </div>

        <div className="grid gap-4">
          {users.data.map((entry) => {
            const email = entry.emailAddresses?.[0]?.emailAddress ?? "—";
            const name = entry.fullName ?? entry.username ?? "Unnamed";
            const credits =
              (entry.unsafeMetadata?.credits as number | undefined) ?? 100;

            return (
              <div
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-white/50">{email}</p>
                  </div>
                  <div className="text-sm text-white/70">
                    Credits: <span className="font-semibold">{credits}</span>
                  </div>
                  <form
                    action={async (formData) => {
                      "use server";
                      const nextCredits = toNumber(
                        formData.get("credits")?.toString() ?? null
                      );
                      await updateUserCredits(
                        entry.id,
                        Math.max(nextCredits, 0),
                        primaryEmail
                      );
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      className="w-28 rounded-full border border-white/20 bg-black/30 px-3 py-2 text-xs text-white/80"
                      name="credits"
                      type="number"
                      min={0}
                      defaultValue={credits}
                    />
                    <button
                      className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0a0b10]"
                      type="submit"
                    >
                      Update
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
