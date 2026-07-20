type LegalSection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

export function LegalMarkdownPage({
  title,
  lastUpdated,
  intro,
  sections,
  contactEmail,
}: {
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
  contactEmail: string;
}) {
  return (
    <main className="bg-[#080a0f] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_16%_0%,rgba(247,197,120,0.14),transparent_28rem),#080a0f]">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#f7c578]/80">
            Legal
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-white/48">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-14">
        <aside className="hidden lg:block">
          <nav className="sticky top-8 border-l border-white/10 pl-4 text-sm text-white/48">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/36">
              Contents
            </p>
            <div className="mt-4 grid gap-2">
              {sections.map((section) => (
                <a
                  key={section.title}
                  className="transition hover:text-white"
                  href={`#${sectionId(section.title)}`}
                >
                  {section.title}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <article className="min-w-0 text-[15px] leading-8 text-white/64">
          <div className="border-b border-white/10 pb-8">
            {intro.map((paragraph) => (
              <p key={paragraph} className="mt-0 [&+p]:mt-5">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="divide-y divide-white/10">
            {sections.map((section) => (
              <section
                key={section.title}
                className="scroll-mt-8 py-8"
                id={sectionId(section.title)}
              >
                <h2 className="text-2xl font-semibold tracking-[-0.01em] text-white">
                  {section.title}
                </h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="mt-4">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-[#f7c578]">
                    {section.bullets.map((item) => (
                      <li key={item} className="pl-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section className="py-8">
              <h2 className="text-2xl font-semibold tracking-[-0.01em] text-white">
                Contact
              </h2>
              <p className="mt-4">
                Email:{" "}
                <a
                  className="font-medium text-[#f7c578] underline decoration-[#f7c578]/40 underline-offset-4 transition hover:text-[#ffd895]"
                  href={`mailto:${contactEmail}`}
                >
                  {contactEmail}
                </a>
              </p>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}

function sectionId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
