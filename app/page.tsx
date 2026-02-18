import Link from "next/link";

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

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-2 text-lg font-semibold tracking-wide">
          <span className="inline-flex h-2 w-2 rounded-full bg-[#f7c578]" />
          Seedance AI Video
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            className="rounded-full border border-white/20 px-4 py-2 transition hover:border-white/60"
            href="/sign-in"
          >
            Sign in
          </Link>
          <Link
            className="rounded-full bg-white px-4 py-2 text-[#0b0c10] transition hover:bg-white/90"
            href="/app"
          >
            Open Studio
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-8">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
              AI Video Studio
              <span className="h-1 w-1 rounded-full bg-white/40" />
              Seedance
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              The AI video platform built for creators
            </h1>
            <p className="text-base leading-7 text-white/70 md:text-lg">
              Generate videos from a prompt or a single image. Built-in pacing,
              styles, and quality controls help your team go from idea to
              delivery in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-full bg-[#f7c578] px-6 py-3 text-sm font-semibold text-[#0b0c10] transition hover:bg-[#f7c578]/90"
                href="/app"
              >
                Generate now
              </Link>
              <Link
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/60"
                href="/sign-up"
              >
                Create account
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-xs text-white/50">
              <span>As fast as 60 seconds</span>
              <span>9:16 / 16:9 / 1:1 supported</span>
              <span>Team templates & collaboration</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Preview</span>
              <span className="rounded-full border border-white/20 px-2 py-1">Live</span>
            </div>
            <div className="mt-4 h-64 rounded-2xl border border-dashed border-white/15 bg-[linear-gradient(120deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.01))]" />
            <div className="mt-5 grid gap-3 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Prompt</span>
                <span className="text-white/40">Neon city in slow motion</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Style</span>
                <span className="text-white/40">Cinematic Glow</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Duration</span>
                <span className="text-white/40">6 seconds</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70"
            >
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-3 leading-6">{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-sm text-white/70 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-white">Ready to start?</h2>
              <p className="mt-2 max-w-xl leading-6">
                Jump into the studio to try text-to-video, image-to-video, and
                download workflows. Payments, API, and team features come next.
              </p>
            </div>
            <Link
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b0c10] transition hover:bg-white/90"
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
