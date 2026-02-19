import { clerkClient, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { updateUserCreditsWithLog } from "../users/actions";

export const dynamic = "force-dynamic";

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

type PageProps = {
  searchParams: Promise<{ userId?: string }>;
};

export default async function AdminUserDetailPage({ searchParams }: PageProps) {
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

  const resolvedParams = await searchParams;
  const userId = resolvedParams.userId ?? "";
  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0a0b10] text-white">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="text-2xl font-semibold">User not found</h1>
          <p className="mt-3 text-sm text-white/60">
            Missing user id in the query string.
          </p>
          <Link className="mt-6 inline-block text-sm text-white/60 hover:text-white" href="/admin/users">
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  const client = await clerkClient();
  let target;
  try {
    target = await client.users.getUser(userId);
  } catch (error) {
    return (
      <div className="min-h-screen bg-[#0a0b10] text-white">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <h1 className="text-2xl font-semibold">User not found</h1>
          <p className="mt-3 text-sm text-white/60">Could not load user {userId}.</p>
          <Link className="mt-6 inline-block text-sm text-white/60 hover:text-white" href="/admin/users">
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  const email = target.emailAddresses?.[0]?.emailAddress ?? "—";
  const name = target.fullName ?? target.username ?? "Unnamed";
  const credits =
    (target.unsafeMetadata?.credits as number | undefined) ?? 100;
  const adjustmentLog =
    (target.unsafeMetadata?.creditAdjustments as
      | {
          at: string;
          admin: string;
          before: number;
          after: number;
          reason: string;
        }[]
      | undefined) ?? [];
  const usageLog =
    (target.unsafeMetadata?.creditUsage as
      | { at: string; amount: number; note?: string }[]
      | undefined) ?? [];

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold">User detail</h1>
            <p className="mt-2 text-sm text-white/60">
              Manage credits and review history.
            </p>
          </div>
          <Link className="text-sm text-white/60 hover:text-white" href="/admin/users">
            Back to users
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
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
                const reason = (formData.get("reason")?.toString() ?? "").trim();
                await updateUserCreditsWithLog(
                  userId,
                  Math.max(nextCredits, 0),
                  primaryEmail,
                  reason || "Manual adjustment"
                );
              }}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input
                className="w-28 rounded-full border border-white/20 bg-black/30 px-3 py-2 text-xs text-white/80"
                name="credits"
                type="number"
                min={0}
                defaultValue={credits}
              />
              <input
                className="w-56 rounded-full border border-white/20 bg-black/30 px-3 py-2 text-xs text-white/80"
                name="reason"
                placeholder="Reason"
                type="text"
              />
              <button
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0a0b10]"
                type="submit"
              >
                Confirm update
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Credit adjustments</h2>
            <div className="mt-4 space-y-3 text-xs text-white/60">
              {adjustmentLog.length === 0 ? (
                <p>No manual adjustments yet.</p>
              ) : (
                adjustmentLog
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div
                      key={`${entry.at}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">{entry.reason}</span>
                        <span>{new Date(entry.at).toLocaleString()}</span>
                      </div>
                      <div className="mt-2 text-white/50">
                        {entry.before} → {entry.after} (by {entry.admin})
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">Usage history</h2>
            <div className="mt-4 space-y-3 text-xs text-white/60">
              {usageLog.length === 0 ? (
                <p>No usage yet.</p>
              ) : (
                usageLog
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div
                      key={`${entry.at}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">
                          {entry.note ?? "Generation"}
                        </span>
                        <span>{new Date(entry.at).toLocaleString()}</span>
                      </div>
                      <div className="mt-2 text-white/50">
                        {entry.amount} credits
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
