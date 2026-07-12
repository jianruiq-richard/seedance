import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "./components/MarketingShell";
import PublicGeneratorDemo from "./components/PublicGeneratorDemo";
import ShowcaseGallery from "./components/ShowcaseGallery";

export const metadata: Metadata = {
  title: "Seedance 2.0 & Seedream 5.0 AI Studio | Video and Image Generation",
  description:
    "Create AI videos with Seedance 2.0 and AI images with Seedream 5.0 Pro and Lite. Generate text to video, image to video, text to image, and image to image assets.",
  keywords: [
    "Seedance 2.0",
    "Seedream 5.0",
    "Seedream 5.0 Pro",
    "Seedream 5.0 Lite",
    "Seedance AI video",
    "AI video generator",
    "AI image generator",
    "text to video",
    "image to video",
    "text to image",
    "image to image",
    "video to video AI",
    "AI video with audio",
    "AI video editing",
    "video extension AI",
    "reference video generator",
  ],
};

const features = [
  {
    title: "Video Generation with Seedance 2.0",
    copy: "Build videos from text prompts, image references, video references, and audio inputs with controllable duration, ratio, resolution, seed, and audio options.",
  },
  {
    title: "Image Generation with Seedream 5.0",
    copy: "Create still images from text or image references using Seedream 5.0 Pro for single-image quality and Seedream 5.0 Lite for flexible image workflows.",
  },
  {
    title: "Text to Video and Image to Video",
    copy: "Turn a written scene or uploaded character, product, storyboard, logo, or first frame into a dynamic Seedance 2.0 video.",
  },
  {
    title: "Text to Image and Image to Image",
    copy: "Generate campaign visuals, product concepts, character sheets, backgrounds, first frames, and refined image variants before moving into video.",
  },
  {
    title: "Unified Generation History",
    copy: "Keep image and video outputs in one timeline so drafts, references, completed visuals, and final clips stay connected by time and prompt.",
  },
  {
    title: "Production Downloads",
    copy: "Export finished videos and generated images for social content, product pages, ads, storyboards, training assets, and client drafts.",
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
  "Reference Image Creation",
  "Campaign Image Assets",
  "Character Sheets",
  "First Frame Design",
];

const faqs = [
  {
    question: "What can this studio generate?",
    answer:
      "The studio supports Seedance 2.0 video generation and Seedream 5.0 image generation. You can create text to video, image to video, text to image, and image to image outputs from the same workspace.",
  },
  {
    question: "Can I generate AI images from references?",
    answer:
      "Yes. Seedream 5.0 supports image to image workflows with one or more reference images depending on the selected model, alongside text prompts that guide composition, style, product details, or character identity.",
  },
  {
    question: "Does Seedance 2.0 support video references?",
    answer:
      "Yes. You can use video input to guide motion, action, camera movement, transitions, effects, or continuity. Credits are calculated from the selected output and the input video duration.",
  },
  {
    question: "What image and video sizes are supported?",
    answer:
      "Video generation supports common creator formats including 16:9, 9:16, 1:1, 4:3, 3:4, and 21:9, with resolution options up to 1080p depending on the selected model. Image generation supports 1K, 2K, and common pixel sizes mapped to creator ratios.",
  },
  {
    question: "Are generated images and videos downloadable?",
    answer:
      "Yes. Finished images and videos can be previewed in the studio, saved in generation history, and downloaded for publishing or further editing.",
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
                Seedance + Seedream AI Studio
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
                AI video and image generation
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/68 sm:text-lg">
                Create cinematic videos with Seedance 2.0 and production-ready
                images with Seedream 5.0 Pro and Lite. Move between text,
                images, references, and generated outputs in one studio.
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
                <span>Video generation and image generation</span>
                <span>Seedream 5.0 Pro and Lite</span>
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
                Explore examples and build both image drafts and video outputs in one studio.
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
              A practical AI creation workspace for creators, marketers,
              educators, editors, filmmakers, and product teams that need
              controllable images and videos instead of one-shot random output.
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
              Endless AI Image and Video Use Cases
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
              Seedream 5.0 and Seedance 2.0 help turn prompts and creative
              references into image assets and video output for paid campaigns,
              organic social, concept development, education, real estate,
              music, and production planning.
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
              How to Create AI Images and Videos
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              A simple workflow for prompt-only generation or optional
              reference-driven image, video, and audio creation.
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {[
                ["Choose Image or Video", "Start with Seedream 5.0 for text to image or image to image, or Seedance 2.0 for text to video and image to video."],
                ["Add Prompt and References", "Upload images, videos, or audio where supported, then describe the subject, action, environment, style, and composition."],
                ["Generate and Iterate", "Choose model, size, resolution, duration, ratio, and advanced settings, then review, download, or refine the result."],
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
                  Studio Credit Pricing
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  Transparent credits for every generation
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/62">
                  Our studio estimates credit usage before generation based on
                  model and output settings across both image and video
                  workflows. Monthly plans and one-time credit packs are
                  available.
                </p>
              </div>
              <div className="grid gap-3 text-sm">
                {[
                  ["Seedance 2.0 Fast", "480p and 720p creator drafts"],
                  ["Seedance 2.0", "480p, 720p, and 1080p outputs"],
                  ["Seedream 5.0", "Pro and Lite image generation"],
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
              Ready to create images and videos from one studio?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/60">
              Reference anything, describe the result, generate images or clips,
              and download professional assets for your next campaign or story.
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
