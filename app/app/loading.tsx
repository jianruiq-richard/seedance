export default function StudioLoading() {
  return (
    <div className="min-h-screen bg-[#0a0b10] text-white">
      <div className="border-b border-white/10 bg-[#0c0f18]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#f7c578]/80" />
            <span className="text-base font-semibold sm:text-lg">
              Seedance Studio
            </span>
          </div>
          <div className="h-8 w-24 rounded-full border border-white/10 bg-white/5" />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl sm:p-6">
          <div className="space-y-4">
            <div className="h-4 w-20 rounded bg-white/10" />
            <div className="h-28 rounded-2xl border border-white/10 bg-black/20 sm:h-32" />
            <div className="h-24 rounded-2xl border border-dashed border-white/15 bg-black/20" />
            <div className="grid gap-3">
              <div className="h-11 rounded-2xl bg-white/10" />
              <div className="h-11 rounded-2xl bg-white/10" />
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-9 rounded-full bg-white/10" />
                ))}
              </div>
              <div className="h-12 rounded-2xl bg-[#f7c578]/15" />
            </div>
          </div>
        </section>

        <section className="space-y-5 sm:space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 rounded bg-white/10" />
              <div className="h-6 w-16 rounded-full border border-white/10 bg-white/5" />
            </div>
            <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 sm:min-h-[320px]">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:rounded-3xl sm:p-6">
            <div className="h-4 w-28 rounded bg-white/10" />
            <div className="h-20 rounded-2xl border border-white/10 bg-black/20" />
          </div>
        </section>
      </div>
    </div>
  );
}
