"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp, useUser } from "@clerk/nextjs";
import { FormEvent, useEffect, useState } from "react";
import {
  allowedEmailDomainsLabel,
  isAllowedSignupEmail,
} from "@/app/lib/email-access";

function getClerkError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray(error.errors)
  ) {
    const first = error.errors[0] as { longMessage?: string; message?: string };
    return first.longMessage ?? first.message ?? "Sign up failed.";
  }

  return error instanceof Error ? error.message : "Sign up failed.";
}

export default function SignUpForm() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useUser();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/app");
    }
  }, [isSignedIn, router]);

  const handleCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signUp) {
      return;
    }

    const email = emailAddress.trim().toLowerCase();
    if (!isAllowedSignupEmail(email)) {
      setErrorMessage(`Please sign up with a ${allowedEmailDomainsLabel} address.`);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setPendingVerification(true);
    } catch (error) {
      setErrorMessage(getClerkError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded || !signUp) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/app");
        return;
      }
      setErrorMessage("Verification is incomplete. Please try again.");
    } catch (error) {
      setErrorMessage(getClerkError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
      {!pendingVerification ? (
        <form className="grid gap-4" onSubmit={handleCreateAccount}>
          <label className="grid gap-2 text-sm text-white/70">
            Email
            <input
              className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/45"
              type="email"
              autoComplete="email"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              placeholder="name@gmail.com"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-white/70">
            Password
            <input
              className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/45"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          {errorMessage && <p className="text-sm text-rose-200">{errorMessage}</p>}
          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0a0b10] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      ) : (
        <form className="grid gap-4" onSubmit={handleVerify}>
          <p className="text-sm text-white/70">
            Enter the verification code sent to {emailAddress.trim()}.
          </p>
          <label className="grid gap-2 text-sm text-white/70">
            Verification code
            <input
              className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/45"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </label>
          {errorMessage && <p className="text-sm text-rose-200">{errorMessage}</p>}
          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0a0b10] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Verifying..." : "Verify email"}
          </button>
        </form>
      )}
      <p className="mt-5 text-sm text-white/60">
        Already have an account?{" "}
        <Link className="text-white underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
