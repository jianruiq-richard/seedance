import { clerkClient, currentUser } from "@clerk/nextjs/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

const pageSizeOptions = [50, 100, 200] as const;

function isAdminEmail(email: string | null) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePageSize(value: string | undefined) {
  const parsed = parsePositiveInt(value, 50);
  return pageSizeOptions.includes(parsed as (typeof pageSizeOptions)[number])
    ? parsed
    : 50;
}

function parseSearchQuery(value: string | undefined) {
  return (value ?? "").trim();
}

async function getUsersPage(page: number, pageSize: number, query: string) {
  const client = await clerkClient();
  return client.users.getUserList({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    orderBy: "-created_at",
    query: query && !query.startsWith("user_") ? query : undefined,
    userId: query.startsWith("user_") ? [query] : undefined,
  });
}

type PageProps = {
  searchParams: Promise<{ page?: string; pageSize?: string; q?: string }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
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
  const pageSize = parsePageSize(resolvedParams.pageSize);
  const query = parseSearchQuery(resolvedParams.q);
  const requestedPage = parsePositiveInt(resolvedParams.page, 1);
  let users = await getUsersPage(requestedPage, pageSize, query);
  const totalPages = Math.max(1, Math.ceil(users.totalCount / pageSize));
  const page = Math.min(requestedPage, totalPages);
  if (page !== requestedPage) {
    users = await getUsersPage(page, pageSize, query);
  }

  const displayedStart =
    users.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const displayedEnd = Math.min(page * pageSize, users.totalCount);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (query) {
      params.set("q", query);
    }
    return `/admin/users?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-14">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Users & Credits</h1>
          <p className="mt-2 text-sm text-white/60">
            Showing {displayedStart}-{displayedEnd} of {users.totalCount} Clerk
            users{query ? ` matching "${query}"` : ""}.
          </p>
        </div>

        <form
          className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
          method="get"
        >
          <label className="grid min-w-[260px] flex-1 gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">
              Search
            </span>
            <input
              className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-white/80 outline-none placeholder:text-white/30"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Email, name, username, or exact user id"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">
              Per page
            </span>
            <select
              className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-white/80"
              name="pageSize"
              defaultValue={pageSize}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">
              Page
            </span>
            <input
              className="w-24 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-white/80"
              name="page"
              type="number"
              min={1}
              max={totalPages}
              defaultValue={page}
            />
          </label>
          <button
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0a0b10]"
            type="submit"
          >
            Search / Go
          </button>
          {query && (
            <Link
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/70 transition hover:border-white/60 hover:text-white"
              href={`/admin/users?page=1&pageSize=${pageSize}`}
            >
              Clear
            </Link>
          )}
          <div className="ml-auto flex items-center gap-2 text-xs">
            <Link
              aria-disabled={page <= 1}
              className={`rounded-full border border-white/20 px-4 py-2 ${
                page <= 1
                  ? "pointer-events-none text-white/30"
                  : "text-white/80 hover:border-white/60 hover:text-white"
              }`}
              href={pageHref(Math.max(page - 1, 1))}
            >
              Previous
            </Link>
            <span className="px-2 text-white/50">
              {page} / {totalPages}
            </span>
            <Link
              aria-disabled={page >= totalPages}
              className={`rounded-full border border-white/20 px-4 py-2 ${
                page >= totalPages
                  ? "pointer-events-none text-white/30"
                  : "text-white/80 hover:border-white/60 hover:text-white"
              }`}
              href={pageHref(Math.min(page + 1, totalPages))}
            >
              Next
            </Link>
          </div>
        </form>

        <div className="grid gap-4">
          {users.data.map((entry) => {
            const email = entry.emailAddresses?.[0]?.emailAddress ?? "—";
            const name = entry.fullName ?? entry.username ?? "Unnamed";
            const credits =
              (entry.unsafeMetadata?.credits as number | undefined) ?? 600;

            return (
              <div
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-white/50">{email}</p>
                    <p className="text-xs text-white/40">{entry.id}</p>
                  </div>
                  <div className="text-sm text-white/70">
                    Credits: <span className="font-semibold">{credits}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      className="rounded-full border border-white/20 px-3 py-2 text-xs text-white/80 transition hover:border-white/60 hover:text-white"
                      href={`/admin/user?userId=${entry.id}`}
                    >
                      View details
                    </Link>
                    <Link
                      className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#0a0b10]"
                      href={`/admin/user?userId=${entry.id}`}
                    >
                      Update
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
