"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function TestCreditsPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const updateCredits = async (credits: number, planId: string) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/test-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits, planId }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        // 刷新用户数据
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const credits = (user?.unsafeMetadata?.credits as number | undefined) ?? 100;
  const currentPlan = user?.unsafeMetadata?.currentPlan as string | undefined;

  return (
    <div className="min-h-screen bg-[#0a0b10] text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧪 Credits Test Page</h1>

        <div className="bg-white/5 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Status</h2>
          <p>Credits: <span className="font-bold">{credits}</span></p>
          <p>Plan: <span className="font-bold">{currentPlan || "None"}</span></p>
        </div>

        <div className="bg-white/5 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test Credit Updates</h2>

          <div className="grid gap-3">
            <button
              onClick={() => updateCredits(5000, "starter")}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
            >
              Add Starter Plan (+5,000 credits)
            </button>

            <button
              onClick={() => updateCredits(11000, "growth")}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded disabled:opacity-50"
            >
              Add Growth Plan (+11,000 credits)
            </button>

            <button
              onClick={() => updateCredits(35000, "studio")}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded disabled:opacity-50"
            >
              Add Studio Plan (+35,000 credits)
            </button>
          </div>

          {loading && <p className="mt-4 text-yellow-400">⏳ Updating...</p>}
          {message && <p className="mt-4">{message}</p>}
        </div>

        <div className="mt-6 text-center">
          <a href="/billing" className="text-blue-400 hover:underline">
            ← Back to Billing
          </a>
          <span className="mx-4">|</span>
          <a href="/app" className="text-blue-400 hover:underline">
            Go to App →
          </a>
        </div>
      </div>
    </div>
  );
}