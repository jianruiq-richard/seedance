import Link from "next/link";

const navItems = [
  { href: "/", label: "AI Video" },
  { href: "/guide", label: "Guide" },
  { href: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  return (
    <header className="relative z-20 border-b border-white/10 bg-[#080a0f]/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          className="flex min-w-0 items-center gap-3 text-base font-semibold text-white sm:text-lg"
          href="/"
        >
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#f7c578]" />
          <span className="truncate">Seedance 2</span>
        </Link>
        <nav className="order-3 flex w-full flex-wrap items-center gap-2 text-sm text-white/68 sm:order-2 sm:w-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="order-2 flex items-center gap-2 sm:order-3">
          <Link
            className="rounded-full border border-white/16 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:text-white sm:px-4"
            href="/sign-in"
          >
            Sign In
          </Link>
          <Link
            className="rounded-full bg-[#f7c578] px-3 py-2 text-xs font-semibold text-[#080a0f] transition hover:bg-[#ffd895] sm:px-4"
            href="/app"
            prefetch
          >
            Start Creating
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#080a0f]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 text-sm text-white/60 sm:px-6 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <div>
          <Link className="flex items-center gap-3 text-lg font-semibold text-white" href="/">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#f7c578]" />
            Seedance 2
          </Link>
          <p className="mt-4 max-w-md leading-6">
            Create cinematic AI videos with Seedance 2.0. Generate video from
            text, images, video references, and audio inputs with professional
            controls for resolution, aspect ratio, duration, and downloads.
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Product
          </h2>
          <div className="mt-4 grid gap-3">
            <Link className="hover:text-white" href="/">Text to Video</Link>
            <Link className="hover:text-white" href="/">Image to Video</Link>
            <Link className="hover:text-white" href="/ai-image">AI Image</Link>
            <Link className="hover:text-white" href="/guide">Prompt Guide</Link>
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Legal
          </h2>
          <div className="mt-4 grid gap-3">
            <Link className="hover:text-white" href="/terms">Terms of Service</Link>
            <Link className="hover:text-white" href="/privacy">Privacy Policy</Link>
            <Link className="hover:text-white" href="/refund">Refund Policy</Link>
            <Link className="hover:text-white" href="/contact">Contact Us</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/42">
        Copyright © 2026 Seedance 2. All rights reserved.
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
