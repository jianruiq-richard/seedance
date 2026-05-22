import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign In | Seedance" };

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-3 text-3xl font-semibold text-white">
        Sign in
      </h1>
      <p className="mb-6 text-sm text-white/60">
        Continue with your Google account.
      </p>
      <SignIn />
    </main>
  );
}
