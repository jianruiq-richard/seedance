import SignUpForm from "./SignUpForm";

export const metadata = { title: "Sign Up | Seedance" };

export default function Page() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-3 text-3xl font-semibold text-white">
        Create your account
      </h1>
      <p className="mb-6 text-sm text-white/60">
        Use a Gmail address to keep account access reliable.
      </p>
      <SignUpForm />
    </main>
  );
}
