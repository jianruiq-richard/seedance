import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "./components/MarketingShell";
import PublicGeneratorDemo from "./components/PublicGeneratorDemo";
import ShowcaseGallery from "./components/ShowcaseGallery";

export const metadata: Metadata = {
  title: "Seedance 2.0 AI Video Generator | Text to Video & Image to Video",
  description:
    "Create cinematic AI videos with Seedance 2.0. Generate text to video, image to video, video reference edits, audio synced clips, and watermark-free downloads.",
  keywords: [
    "Seedance 2.0",
    "Seedance AI video",
    "AI video generator",
    "text to video",
    "image to video",
    "video to video AI",
    "AI video with audio",
    "AI video editing",
    "video extension AI",
    "reference video generator",
  ],
};

const features = [
  {
    title: "Multi-Modal AI Video Creation",
    copy: "Build videos from text prompts, image references, video references, and audio inputs. Mix assets to guide character identity, camera motion, composition, and rhythm.",
  },
  {
    title: "Text to Video",
    copy: "Turn a written scene into a polished clip with controllable duration, aspect ratio, resolution, seed, audio, and download settings.",
  },
  {
    title: "Image to Video",
    copy: "Upload a character, product, storyboard, logo, or first frame and animate it into a dynamic Seedance 2.0 video.",
  },
  {
    title: "Video Reference & Motion Copy",
    copy: "Use a source video to guide action, choreography, camera movement, pacing, transitions, and visual effects in the generated output.",
  },
  {
    title: "Video Extension & Editing",
    copy: "Extend a clip, connect scenes, replace objects, modify actions, and keep continuity without restarting the entire creative workflow.",
  },
  {
    title: "Watermark-Free Downloads",
    copy: "Export finished AI videos for social content, product pages, ads, storyboards, music videos, training assets, and client drafts.",
  },
];

const useCases = [
  "Advertising & Marketing",
  "Product Videos",
  "Social Media Content",
  "Film Pre-Visualization",
  "Music Videos",
  "Dance & Motion Reference",
  "Education & Training",
  "Real Estate Tours",
  "Architecture Visualization",
  "Video Editing",
  "Brand Content",
  "Storyboarding",
];

const faqs = [
  {
    question: "What is Seedance 2.0?",
    answer:
      "Seedance 2.0 is a multi-modal AI video generation model for creating videos from text, images, video references, and audio inputs. It is useful for text to video, image to video, reference-based motion, video extension, and editing workflows.",
  },
  {
    question: "Can I generate AI videos from images?",
    answer:
      "Yes. Upload an image as a subject, product, scene, logo, first frame, or style reference, then describe the motion and camera direction you want Seedance 2.0 to generate.",
  },
  {
    question: "Does Seedance 2.0 support video references?",
    answer:
      "Yes. You can use video input to guide motion, action, camera movement, transitions, effects, or continuity. Credits are calculated from the selected output and the input video duration.",
  },
  {
    question: "What video sizes are supported?",
    answer:
      "The studio supports common creator formats including 16:9, 9:16, 1:1, 4:3, 3:4, and 21:9, with resolution options up to 1080p depending on the selected model.",
  },
  {
    question: "Are generated videos downloadable?",
    answer:
      "Yes. Finished generations can be previewed in the studio, saved in generation history, and downloaded for publishing or further editing.",
  },
];

export default function Home() {
  return (
    <PageShell>
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(247,197,120,0.24),transparent_32rem),radial-gradient(circle_at_85%_10%,rgba(74,144,226,0.22),transparent_28rem)]" />
          <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="mx-auto max-w-4xl text-center">
              <p className="inline-flex rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f7c578]">
                Seedance 2.0 AI Video Generator
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
                Seedance 2.0
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
                Experience multi-modal AI video creation. Combine text, images,
                video references, and audio to generate cinematic clips with
                controllable motion, aspect ratio, resolution, and downloads.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  className="rounded-full bg-[#f7c578] px-6 py-3 text-sm font-semibold text-[#080a0f] transition hover:bg-[#ffd895]"
                  href="/app"
                  prefetch
                >
                  Start Creating Now
                </Link>
                <Link
                  className="rounded-full border border-white/18 px-6 py-3 text-sm font-semibold text-white/82 transition hover:border-white/40 hover:text-white"
                  href="/guide"
                >
                  Read Prompt Guide
                </Link>
              </div>
              <div className="mt-7 grid gap-2 text-sm text-white/52 sm:flex sm:flex-wrap sm:justify-center sm:gap-5">
                <span>Multi-modal input support</span>
                <span>4-15 second video generation</span>
                <span>16:9, 9:16, 1:1 and more</span>
              </div>
            </div>
            <div className="mt-9">
              <PublicGeneratorDemo />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                Explore stunning video examples created with Seedance 2.0&apos;s multi-modal capabilities.
              </h2>
            </div>
            <Link className="text-sm font-semibold text-[#f7c578] hover:text-[#ffd895]" href="/app">
              Open studio
            </Link>
          </div>
          <ShowcaseGallery />
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Key Features of Seedance 2.0
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              A practical AI video workspace for creators, marketers, educators,
              editors, filmmakers, and product teams that need controllable
              generation instead of one-shot random clips.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"
              >
                <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025]">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Endless AI Video Use Cases
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
              Seedance 2.0 helps turn creative references into video output for
              paid campaigns, organic social, concept development, education,
              real estate, music, and production planning.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {useCases.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/12 bg-black/18 px-4 py-2 text-sm text-white/68"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              How to Create AI Videos with Seedance 2.0
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              A simple workflow for prompt-only generation or optional
              reference-driven image, video, and audio creation.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {[
                ["Upload Your Assets", "Add images, videos, or audio files as references for subject identity, camera movement, sound, motion, and scene composition."],
                ["Describe Your Vision", "Write a prompt that explains the subject, action, environment, style, camera language, and how each reference should be used."],
                ["Generate and Iterate", "Choose resolution, duration, aspect ratio, and advanced settings, then generate, review, download, or refine the result."],
              ].map(([title, copy], index) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                  <div className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f7c578] text-sm font-semibold text-[#080a0f]">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/58">{copy}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
          <div className="rounded-2xl border border-[#f7c578]/20 bg-[#f7c578]/[0.06] p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f7c578]">
                  Seedance Model Credit Pricing
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  Transparent credits for every generation
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Our studio estimates credit usage before generation based on
                  model, resolution, duration, aspect ratio, and video reference
                  input. Monthly plans and one-time credit packs are available.
                </p>
              </div>
              <div className="grid gap-3 text-sm">
                {[
                  ["Seedance 2.0 Fast", "480p and 720p creator drafts"],
                  ["Seedance 2.0", "480p, 720p, and 1080p outputs"],
                  ["Credit Packs", "Top up anytime without changing plans"],
                ].map(([label, copy]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="font-semibold text-white">{label}</p>
                    <p className="mt-1 text-white/55">{copy}</p>
                  </div>
                ))}
                <Link
                  className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold !text-[#080a0f] shadow-sm transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-[#f7c578]/70 focus:ring-offset-2 focus:ring-offset-[#15130f]"
                  href="/pricing"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-6 grid gap-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <h3 className="font-semibold text-white">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-white/58">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/[0.055] p-6 text-center sm:p-10">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Ready to experience multi-modal AI video creation?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
              Reference anything, describe the result, generate the clip, and
              download a professional AI video for your next campaign or story.
            </p>
            <Link
              className="mt-6 inline-flex rounded-full bg-[#f7c578] px-6 py-3 text-sm font-semibold text-[#080a0f] transition hover:bg-[#ffd895]"
              href="/app"
              prefetch
            >
              Start Creating Now
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
