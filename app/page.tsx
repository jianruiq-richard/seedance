import Link from "next/link";
import DeferredSampleVideoPreview from "./components/DeferredSampleVideoPreview";

const highlights = [
  {
    title: "Text to Video",
    copy: "Turn a single prompt into a full sequence with cinematic pacing.",
  },
  {
    title: "Image to Video",
    copy: "Upload a key frame and bring it to life with motion and depth.",
  },
  {
    title: "Instant Download",
    copy: "Your render is ready to download and share the moment it finishes.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0c10] text-white">
      <div className="pointer-events-none absolute left-[-20%] top-[-30%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,_rgba(247,197,120,0.35),_rgba(247,197,120,0))] blur-2xl" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,_rgba(115,190,255,0.35),_rgba(115,190,255,0))] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,_rgba(255,120,120,0.3),_rgba(255,120,120,0))] blur-3xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex min-w-0 items-center gap-2 text-base font-semibold tracking-wide sm:text-lg">
          <span className="inline-flex h-2 w-2 rounded-full bg-[#f7c578]" />
          <span className="truncate">Seedance AI Video</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm sm:gap-3">
          <Link
            className="rounded-full border border-white/20 px-3 py-2 text-xs transition hover:border-white/60 sm:px-4 sm:text-sm"
            href="/sign-in"
          >
            Sign in
          </Link>
          <Link
            className="rounded-full bg-white px-3 py-2 text-xs text-[#0b0c10] transition hover:bg-white/90 sm:px-4 sm:text-sm"
            href="/app"
          >
            Open Studio
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-4 sm:gap-16 sm:px-6 sm:pb-24 sm:pt-8">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-5 sm:space-y-6">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/60 sm:px-4 sm:text-xs sm:tracking-[0.3em]">
              AI Video Studio
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Seedance
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              The AI video platform built for creators
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7 md:text-lg">
              Generate videos from a prompt or a single image. Built-in pacing,
              styles, and quality controls help your team go from idea to
              delivery in one place.
            </p>
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <Link
                className="rounded-full bg-[#f7c578] px-6 py-3 text-center text-sm font-semibold text-[#0b0c10] transition hover:bg-[#f7c578]/90"
                href="/app"
              >
                Generate now
              </Link>
              <Link
                className="rounded-full border border-white/20 px-6 py-3 text-center text-sm font-semibold text-white/80 transition hover:border-white/60"
                href="/sign-up"
              >
                Create account
              </Link>
            </div>
            <div className="grid gap-2 text-xs text-white/50 sm:flex sm:flex-wrap sm:gap-6">
              <span>As fast as 60 seconds</span>
              <span>9:16 / 16:9 / 1:1 supported</span>
              <span>Team templates & collaboration</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Preview</span>
              <span className="rounded-full border border-white/20 px-2 py-1">Live</span>
            </div>
            <DeferredSampleVideoPreview />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3 md:gap-6">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 sm:p-6"
            >
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-3 leading-6">{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70 sm:rounded-3xl sm:p-8 md:p-10">
          <div className="grid gap-6 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white sm:text-2xl">Ready to start?</h2>
              <p className="mt-2 max-w-xl leading-6">
                Jump into the studio to try text-to-video, image-to-video, and
                download workflows. Payments, API, and team features come next.
              </p>
            </div>
            <Link
              className="rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-[#0b0c10] transition hover:bg-white/90"
              href="/app"
            >
              Open workspace
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
