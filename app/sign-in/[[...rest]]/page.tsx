import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign In | Seedance " };

export default function Page() {
  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16, fontSize: 28, fontWeight: 600 }}>
        Sign in
      </h1>
      <SignIn />
    </main>
  );
}
