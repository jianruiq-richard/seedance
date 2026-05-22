"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

type GoogleAuthCardProps = {
  mode: "sign-in" | "sign-up";
};

function getClerkError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray(error.errors)
  ) {
    const first = error.errors[0] as { longMessage?: string; message?: string };
    return first.longMessage ?? first.message ?? "Authentication failed.";
  }

  return error instanceof Error ? error.message : "Authentication failed.";
}

export default function GoogleAuthCard({ mode }: GoogleAuthCardProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSignUp = mode === "sign-up";
  const isLoaded = isSignUp ? signUpLoaded : signInLoaded;

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/app");
    }
  }, [isSignedIn, router]);

  const handleGoogleAuth = async () => {
    if (!isLoaded) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const params = {
        strategy: "oauth_google" as const,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/app",
      };

      if (isSignUp) {
        await signUp?.authenticateWithRedirect(params);
      } else {
        await signIn?.authenticateWithRedirect(params);
      }
    } catch (error) {
      setErrorMessage(getClerkError(error));
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
      <button
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0a0b10] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={handleGoogleAuth}
        disabled={!isLoaded || submitting}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-base font-bold text-[#4285f4]">
          G
        </span>
        {submitting
          ? "Redirecting..."
          : isSignUp
            ? "Continue with Google"
            : "Sign in with Google"}
      </button>

      {errorMessage && <p className="mt-4 text-sm text-rose-200">{errorMessage}</p>}

      <p className="mt-5 text-sm text-white/60">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <Link
          className="text-white underline"
          href={isSignUp ? "/sign-in" : "/sign-up"}
        >
          {isSignUp ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
